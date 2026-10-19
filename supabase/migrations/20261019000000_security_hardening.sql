-- Security hardening: email discovery limits, two-phase backup replacement,
-- backup format v3 (separate login and encryption keys) and its KDF salt.

------------------------------------------------------------------------------
-- 1. Email discovery: people can opt out, and lookups are rate limited.
------------------------------------------------------------------------------
alter table public.profiles add column discoverable boolean not null default true;
grant update (discoverable) on public.profiles to authenticated;

-- Only an md5 of the normalized email is kept: enough to tell a repeated
-- lookup (saved contacts are re-checked before each payment) from a new one.
create table public.email_lookups (
  owner_id uuid not null references auth.users(id) on delete cascade,
  email_hash text not null check (email_hash ~ '^[a-f0-9]{32}$'),
  looked_up_at timestamptz not null default now(),
  primary key (owner_id, email_hash)
);
alter table public.email_lookups enable row level security;
revoke all on public.email_lookups from anon, authenticated;

create or replace function public.resolve_movya_email(contact_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare identity uuid := auth.uid(); normalized text; digest text; result text; recent integer;
begin
  if identity is null or not exists (select 1 from auth.users where id = identity and email_confirmed_at is not null) then
    raise exception 'Verified account required';
  end if;
  if contact_email is null or char_length(contact_email) > 254 then raise exception 'Invalid email'; end if;
  normalized := lower(btrim(contact_email));
  digest := md5(normalized);
  -- 30 different emails per rolling day; repeating a known email is free.
  if not exists (select 1 from public.email_lookups l where l.owner_id = identity and l.email_hash = digest and l.looked_up_at > now() - interval '24 hours') then
    select count(*) into recent from public.email_lookups l where l.owner_id = identity and l.looked_up_at > now() - interval '24 hours';
    if recent >= 30 then raise exception 'Too many email lookups. Try again later.'; end if;
  end if;
  insert into public.email_lookups(owner_id, email_hash) values (identity, digest)
  on conflict (owner_id, email_hash) do update set looked_up_at = now();
  select w.public_key into result from public.wallet_backups w
    join auth.users u on u.id = w.owner_id
    join public.profiles p on p.id = w.owner_id
  where lower(u.email) = normalized and u.email_confirmed_at is not null and p.discoverable;
  return result;
end;
$$;
revoke all on function public.resolve_movya_email(text) from public, anon;
grant execute on function public.resolve_movya_email(text) to authenticated;

------------------------------------------------------------------------------
-- 2. Backups: version 3 and two-phase replacement.
--    The client stages a new encrypted backup, downloads it again, proves it
--    can decrypt it, and only then promotes it. The previous version is kept.
------------------------------------------------------------------------------
create function public.valid_wallet_backup(backup jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select backup is null or (
    jsonb_typeof(backup) = 'object' and backup ?& array['version', 'salt', 'nonce', 'ciphertext']
    and backup - array['version', 'salt', 'nonce', 'ciphertext'] = '{}'::jsonb
    and jsonb_typeof(backup->'version') = 'number' and jsonb_typeof(backup->'salt') = 'string'
    and jsonb_typeof(backup->'nonce') = 'string' and jsonb_typeof(backup->'ciphertext') = 'string'
    and backup->>'version' in ('1', '2', '3') and backup->>'salt' ~ '^[a-f0-9]{32}$'
    and backup->>'nonce' ~ '^[a-f0-9]{24}$' and backup->>'ciphertext' ~ '^[a-f0-9]+$'
    and char_length(backup->>'ciphertext') % 2 = 0
    and ((backup->>'version' = '1' and char_length(backup->>'ciphertext') = 144)
      or (backup->>'version' in ('2', '3') and char_length(backup->>'ciphertext') between 144 and 2048))
    and octet_length(backup::text) < 4096
  )
$$;
alter table public.wallet_backups drop constraint wallet_backups_backup_check;
alter table public.wallet_backups
  add constraint wallet_backups_backup_check check (backup is not null and public.valid_wallet_backup(backup)),
  add column pending_backup jsonb check (public.valid_wallet_backup(pending_backup)),
  add column previous_backup jsonb check (public.valid_wallet_backup(previous_backup)),
  add column updated_at timestamptz not null default now();

create function public.stage_wallet_backup(new_backup jsonb)
returns public.wallet_backups language plpgsql security definer set search_path = '' as $$
declare result public.wallet_backups;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.wallet_backups set pending_backup = new_backup, updated_at = now()
  where owner_id = auth.uid() returning * into result;
  if result is null then raise exception 'Wallet backup not found'; end if;
  return result;
end;
$$;

-- Promotes exactly the staged backup the client verified; a concurrent
-- change makes this fail instead of promoting something unverified.
create function public.promote_wallet_backup(verified_backup jsonb)
returns public.wallet_backups language plpgsql security definer set search_path = '' as $$
declare result public.wallet_backups;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.wallet_backups
  set previous_backup = backup, backup = pending_backup, pending_backup = null, updated_at = now()
  where owner_id = auth.uid() and pending_backup is not null and pending_backup = verified_backup
  returning * into result;
  if result is null then raise exception 'Staged backup changed. Try again.'; end if;
  return result;
end;
$$;

create function public.discard_pending_wallet_backup()
returns void language sql security definer set search_path = '' as $$
  update public.wallet_backups set pending_backup = null where owner_id = auth.uid();
$$;

revoke all on function public.stage_wallet_backup(jsonb), public.promote_wallet_backup(jsonb), public.discard_pending_wallet_backup() from public, anon;
grant execute on function public.stage_wallet_backup(jsonb), public.promote_wallet_backup(jsonb), public.discard_pending_wallet_backup() to authenticated;

------------------------------------------------------------------------------
-- 3. Version 3 login: the app derives two keys from the password with a
--    per-account salt. Supabase Auth receives only the login key; the backup
--    key never leaves the device. The salt is needed before signing in, so it
--    is served to anyone, and an unknown email receives a stable fake salt so
--    the answer does not reveal whether an account exists.
------------------------------------------------------------------------------
create schema movya_private;
revoke all on schema movya_private from public, anon, authenticated;
create table movya_private.settings (name text primary key, value text not null);
insert into movya_private.settings(name, value)
values ('login_salt_pepper', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
-- Immutable once set, so a stolen session cannot lock the owner out by
-- changing the salt.
create table movya_private.kdf_salts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt text not null check (salt ~ '^[a-f0-9]{32}$'),
  created_at timestamptz not null default now()
);

-- New registrations send their salt in the sign-up metadata.
create function movya_private.capture_kdf_salt() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data->>'movya_kdf_salt' ~ '^[a-f0-9]{32}$' then
    insert into movya_private.kdf_salts(user_id, salt) values (new.id, new.raw_user_meta_data->>'movya_kdf_salt')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger movya_capture_kdf_salt after insert on auth.users
for each row execute function movya_private.capture_kdf_salt();

create function public.movya_login_params(login_email text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare normalized text := lower(btrim(coalesce(login_email, ''))); result text;
begin
  if char_length(normalized) > 254 then raise exception 'Invalid email'; end if;
  select s.salt into result from movya_private.kdf_salts s join auth.users u on u.id = s.user_id where lower(u.email) = normalized;
  if result is null then
    select left(md5(p.value || ':' || normalized), 32) into result from movya_private.settings p where p.name = 'login_salt_pepper';
  end if;
  return jsonb_build_object('salt', result);
end;
$$;
revoke all on function public.movya_login_params(text) from public;
grant execute on function public.movya_login_params(text) to anon, authenticated;

-- Existing accounts receive a salt when they migrate. Returns the effective
-- salt: the existing one if already set, otherwise the candidate.
create function public.claim_kdf_salt(candidate text)
returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if candidate !~ '^[a-f0-9]{32}$' then raise exception 'Invalid salt'; end if;
  insert into movya_private.kdf_salts(user_id, salt) values (auth.uid(), candidate) on conflict (user_id) do nothing;
  select salt into result from movya_private.kdf_salts where user_id = auth.uid();
  return result;
end;
$$;
revoke all on function public.claim_kdf_salt(text) from public, anon;
grant execute on function public.claim_kdf_salt(text) to authenticated;
