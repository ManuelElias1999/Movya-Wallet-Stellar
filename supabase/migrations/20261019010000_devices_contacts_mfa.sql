-- Devices and sessions, encrypted contact backup, MFA enforcement for
-- sensitive changes, rate limit for login parameters, and moving the
-- account to a new wallet (emergency transfer).

------------------------------------------------------------------------------
-- 1. MFA: when the person has a verified factor, sensitive changes require a
--    session that completed it (aal2).
------------------------------------------------------------------------------
create function movya_private.assert_sensitive_session() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status::text = 'verified')
     and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'Two-step verification required';
  end if;
end;
$$;

create or replace function public.stage_wallet_backup(new_backup jsonb)
returns public.wallet_backups language plpgsql security definer set search_path = '' as $$
declare result public.wallet_backups;
begin
  perform movya_private.assert_sensitive_session();
  update public.wallet_backups set pending_backup = new_backup, updated_at = now()
  where owner_id = auth.uid() returning * into result;
  if result is null then raise exception 'Wallet backup not found'; end if;
  return result;
end;
$$;
create or replace function public.promote_wallet_backup(verified_backup jsonb)
returns public.wallet_backups language plpgsql security definer set search_path = '' as $$
declare result public.wallet_backups;
begin
  perform movya_private.assert_sensitive_session();
  update public.wallet_backups
  set previous_backup = backup, backup = pending_backup, pending_backup = null, updated_at = now()
  where owner_id = auth.uid() and pending_backup is not null and pending_backup = verified_backup
  returning * into result;
  if result is null then raise exception 'Staged backup changed. Try again.'; end if;
  return result;
end;
$$;

-- Discoverability is changed through this function so it can require MFA.
revoke update (discoverable) on public.profiles from authenticated;
create function public.set_discoverable(value boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform movya_private.assert_sensitive_session();
  update public.profiles set discoverable = value where id = auth.uid();
  return value;
end;
$$;
revoke all on function public.set_discoverable(boolean) from public, anon;
grant execute on function public.set_discoverable(boolean) to authenticated;

------------------------------------------------------------------------------
-- 2. Devices and sessions. Each installation registers a random id. A
--    revoked device signs out and erases its local wallet the next time it
--    reaches the server. Revoking never invalidates a key already copied off
--    a phone: that is what the recovery kit rotation is for.
------------------------------------------------------------------------------
create table public.devices (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index devices_owner_idx on public.devices(owner_id);
alter table public.devices enable row level security;
revoke all on public.devices from anon, authenticated;
grant select on public.devices to authenticated;
create policy own_devices_read on public.devices for select to authenticated using ((select auth.uid()) = owner_id);

create function public.touch_device(device_id uuid, device_label text, device_platform text)
returns public.devices language plpgsql security definer set search_path = '' as $$
declare result public.devices;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into result from public.devices where id = device_id;
  if result.id is not null and result.owner_id <> auth.uid() then raise exception 'Device belongs to another account'; end if;
  if result.id is null then
    insert into public.devices(id, owner_id, label, platform) values (device_id, auth.uid(), left(btrim(device_label), 80), device_platform)
    returning * into result;
  elsif result.revoked_at is null then
    update public.devices set last_seen_at = now() where id = device_id returning * into result;
  end if;
  return result;
end;
$$;

create function public.revoke_device(device_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform movya_private.assert_sensitive_session();
  update public.devices set revoked_at = coalesce(revoked_at, now()) where id = device_id and owner_id = auth.uid();
end;
$$;
create function public.revoke_other_devices(current_device uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  perform movya_private.assert_sensitive_session();
  update public.devices set revoked_at = now() where owner_id = auth.uid() and id <> current_device and revoked_at is null;
  get diagnostics total = row_count;
  return total;
end;
$$;
revoke all on function public.touch_device(uuid, text, text), public.revoke_device(uuid), public.revoke_other_devices(uuid) from public, anon;
grant execute on function public.touch_device(uuid, text, text), public.revoke_device(uuid), public.revoke_other_devices(uuid) to authenticated;

------------------------------------------------------------------------------
-- 3. Encrypted contact backup, separate from the wallet backup. Each write
--    must carry the next version (compare-and-swap), and devices remember the
--    latest version they saw to detect a rollback.
------------------------------------------------------------------------------
create table public.contact_backups (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null check (version > 0),
  backup jsonb not null check (
    jsonb_typeof(backup) = 'object' and backup ?& array['nonce', 'ciphertext']
    and backup - array['nonce', 'ciphertext'] = '{}'::jsonb
    and backup->>'nonce' ~ '^[a-f0-9]{24}$' and backup->>'ciphertext' ~ '^[a-f0-9]+$'
    and char_length(backup->>'ciphertext') <= 400000
  ),
  updated_at timestamptz not null default now()
);
alter table public.contact_backups enable row level security;
revoke all on public.contact_backups from anon, authenticated;
grant select on public.contact_backups to authenticated;
create policy own_contact_backup_read on public.contact_backups for select to authenticated using ((select auth.uid()) = owner_id);

create function public.put_contact_backup(new_version bigint, new_backup jsonb)
returns public.contact_backups language plpgsql security definer set search_path = '' as $$
declare result public.contact_backups;
begin
  perform movya_private.assert_sensitive_session();
  if new_version <> 1 and not exists (select 1 from public.contact_backups where owner_id = auth.uid()) then
    raise exception 'Contact backup version conflict';
  end if;
  insert into public.contact_backups(owner_id, version, backup) values (auth.uid(), new_version, new_backup)
  on conflict (owner_id) do update set version = excluded.version, backup = excluded.backup, updated_at = now()
    where public.contact_backups.version = excluded.version - 1
  returning * into result;
  if result is null then raise exception 'Contact backup version conflict'; end if;
  if result.version <> new_version then raise exception 'Contact backup version conflict'; end if;
  return result;
end;
$$;
revoke all on function public.put_contact_backup(bigint, jsonb) from public, anon;
grant execute on function public.put_contact_backup(bigint, jsonb) to authenticated;

------------------------------------------------------------------------------
-- 4. Login parameters: 120 requests per hour per client IP.
------------------------------------------------------------------------------
create table movya_private.login_param_hits (
  ip_hash text not null, window_start timestamptz not null, hits integer not null default 0,
  primary key (ip_hash, window_start)
);
create or replace function public.movya_login_params(login_email text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare normalized text := lower(btrim(coalesce(login_email, ''))); result text; client text; total integer;
begin
  if char_length(normalized) > 254 then raise exception 'Invalid email'; end if;
  client := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1);
  if client <> '' then
    insert into movya_private.login_param_hits(ip_hash, window_start, hits) values (md5(client), date_trunc('hour', now()), 1)
    on conflict (ip_hash, window_start) do update set hits = movya_private.login_param_hits.hits + 1
    returning hits into total;
    if total > 120 then raise exception 'Too many requests. Try again later.'; end if;
    delete from movya_private.login_param_hits where window_start < now() - interval '2 hours';
  end if;
  select s.salt into result from movya_private.kdf_salts s join auth.users u on u.id = s.user_id where lower(u.email) = normalized;
  if result is null then
    select left(md5(p.value || ':' || normalized), 32) into result from movya_private.settings p where p.name = 'login_salt_pepper';
  end if;
  return jsonb_build_object('salt', result);
end;
$$;

------------------------------------------------------------------------------
-- 5. Emergency transfer: the account moves to a brand-new wallet after the
--    app sent everything there. At most once every 7 days; the previous
--    address and backup are kept.
------------------------------------------------------------------------------
alter table public.wallet_backups
  add column previous_public_key text check (previous_public_key is null or previous_public_key ~ '^G[A-Z2-7]{55}$'),
  add column account_changed_at timestamptz;

create function public.replace_wallet_account(old_public_key text, new_public_key text, new_backup jsonb)
returns public.wallet_backups language plpgsql security definer set search_path = '' as $$
declare result public.wallet_backups;
begin
  perform movya_private.assert_sensitive_session();
  if new_public_key !~ '^G[A-Z2-7]{55}$' or new_public_key = old_public_key then raise exception 'Invalid new wallet'; end if;
  update public.wallet_backups
  set previous_public_key = public_key, public_key = new_public_key, previous_backup = backup, backup = new_backup,
      pending_backup = null, account_changed_at = now(), updated_at = now()
  where owner_id = auth.uid() and public_key = old_public_key
    and (account_changed_at is null or account_changed_at < now() - interval '7 days')
  returning * into result;
  if result is null then raise exception 'Wallet cannot be replaced now'; end if;
  return result;
end;
$$;
revoke all on function public.replace_wallet_account(text, text, jsonb) from public, anon;
grant execute on function public.replace_wallet_account(text, text, jsonb) to authenticated;
