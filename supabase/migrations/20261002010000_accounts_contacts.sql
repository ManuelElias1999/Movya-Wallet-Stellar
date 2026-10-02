-- Movya Testnet backend. Run once using the Supabase SQL editor or db push.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now()
);
create table public.wallet_backups (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  public_key text not null unique check (public_key ~ '^G[A-Z2-7]{55}$'),
  backup jsonb not null check (
    jsonb_typeof(backup) = 'object' and backup ?& array['version', 'salt', 'nonce', 'ciphertext']
    and backup - array['version', 'salt', 'nonce', 'ciphertext'] = '{}'::jsonb
    and jsonb_typeof(backup->'version') = 'number' and jsonb_typeof(backup->'salt') = 'string'
    and jsonb_typeof(backup->'nonce') = 'string' and jsonb_typeof(backup->'ciphertext') = 'string'
    and backup->>'version' = '1' and backup->>'salt' ~ '^[a-f0-9]{32}$'
    and backup->>'nonce' ~ '^[a-f0-9]{24}$' and backup->>'ciphertext' ~ '^[a-f0-9]{144}$'
    and octet_length(backup::text) < 1024
  ),
  created_at timestamptz not null default now()
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text check (email is null or char_length(email) between 3 and 254),
  address text not null check (address ~ '^G[A-Z2-7]{55}$'),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  unique(owner_id, address)
);
create index contacts_owner_idx on public.contacts(owner_id);
alter table public.profiles enable row level security;
alter table public.wallet_backups enable row level security;
alter table public.contacts enable row level security;
revoke all on public.profiles, public.wallet_backups, public.contacts from anon, authenticated;
grant select on public.profiles, public.wallet_backups, public.contacts to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, update, delete on public.contacts to authenticated;
create policy own_profile_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy own_profile_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy own_backup_read on public.wallet_backups for select to authenticated using ((select auth.uid()) = owner_id);
create policy own_contacts on public.contacts for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create function public.register_wallet(wallet_public_key text, wallet_backup jsonb)
returns public.wallet_backups language plpgsql security definer set search_path = '' as $$
declare identity uuid := auth.uid(); result public.wallet_backups; account auth.users;
begin
  if identity is null then raise exception 'Authentication required'; end if;
  select * into account from auth.users where id = identity;
  if account.email_confirmed_at is null then raise exception 'Verify your email first'; end if;
  insert into public.profiles(id, display_name)
  values (identity, left(coalesce(nullif(btrim(account.raw_user_meta_data->>'display_name'), ''), split_part(account.email, '@', 1), 'Usuario'), 80))
  on conflict (id) do nothing;
  insert into public.wallet_backups(owner_id, public_key, backup)
  values (identity, wallet_public_key, wallet_backup) on conflict(owner_id) do nothing;
  select * into result from public.wallet_backups where owner_id = identity;
  return result;
end;
$$;
revoke all on function public.register_wallet(text, jsonb) from public, anon;
grant execute on function public.register_wallet(text, jsonb) to authenticated;

-- Exact verified-email lookup only; no public user directory or email listing.
create function public.resolve_movya_email(contact_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  if auth.uid() is null or not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    raise exception 'Verified account required';
  end if;
  if char_length(contact_email) > 254 then raise exception 'Invalid email'; end if;
  select w.public_key into result from public.wallet_backups w join auth.users u on u.id = w.owner_id
  where lower(u.email) = lower(btrim(contact_email)) and u.email_confirmed_at is not null;
  return result;
end;
$$;
revoke all on function public.resolve_movya_email(text) from public, anon;
grant execute on function public.resolve_movya_email(text) to authenticated;
