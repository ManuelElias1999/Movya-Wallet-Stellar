-- One-time Testnet welcome balance for wallets created after this migration.
-- The mobile app never receives the distributor secret. It only signs its
-- own USDC trustline; an authenticated Edge Function performs the payments.

create table public.testnet_welcome_funding (
  owner_id uuid primary key references public.wallet_backups(owner_id) on delete cascade,
  public_key text not null unique check (public_key ~ '^G[A-Z2-7]{55}$'),
  xlm_status text not null default 'pending' check (xlm_status in ('pending', 'processing', 'complete')),
  xlm_claim uuid,
  xlm_lease_until timestamptz,
  xlm_signed_xdr text check (xlm_signed_xdr is null or char_length(xlm_signed_xdr) between 20 and 4096),
  xlm_tx_hash text check (xlm_tx_hash is null or xlm_tx_hash ~ '^[a-f0-9]{64}$'),
  xlm_expires_at timestamptz,
  xlm_funded_at timestamptz,
  xlm_attempts integer not null default 0 check (xlm_attempts >= 0),
  usdc_status text not null default 'pending' check (usdc_status in ('pending', 'processing', 'complete')),
  usdc_claim uuid,
  usdc_lease_until timestamptz,
  usdc_signed_xdr text check (usdc_signed_xdr is null or char_length(usdc_signed_xdr) between 20 and 4096),
  usdc_tx_hash text check (usdc_tx_hash is null or usdc_tx_hash ~ '^[a-f0-9]{64}$'),
  usdc_expires_at timestamptz,
  usdc_funded_at timestamptz,
  usdc_attempts integer not null default 0 check (usdc_attempts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (xlm_status <> 'complete' or (xlm_tx_hash is not null and xlm_funded_at is not null)),
  check (usdc_status <> 'complete' or (usdc_tx_hash is not null and usdc_funded_at is not null))
);

alter table public.testnet_welcome_funding enable row level security;
revoke all on public.testnet_welcome_funding from public, anon, authenticated;
grant all on public.testnet_welcome_funding to service_role;

-- Only wallets inserted after the feature ships are eligible. Restores and
-- repeated register_wallet calls do not insert another wallet_backups row and
-- therefore cannot claim another welcome balance.
create function movya_private.enqueue_testnet_welcome_funding()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.testnet_welcome_funding(owner_id, public_key)
  values (new.owner_id, new.public_key)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function movya_private.enqueue_testnet_welcome_funding() from public, anon, authenticated;

create trigger movya_enqueue_testnet_welcome_funding
after insert on public.wallet_backups
for each row execute function movya_private.enqueue_testnet_welcome_funding();

-- Atomically leases one asset step. The Edge Function uses a short lease so
-- a crashed invocation can be resumed without allowing parallel submissions.
create function public.claim_testnet_welcome_funding(
  funding_owner uuid,
  funding_public_key text,
  funding_asset text,
  claim_token uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result public.testnet_welcome_funding; claimed boolean := false;
begin
  if funding_asset = 'XLM' then
    update public.testnet_welcome_funding
    set xlm_status = 'processing', xlm_claim = claim_token,
        xlm_lease_until = now() + interval '90 seconds',
        xlm_attempts = xlm_attempts + 1, updated_at = now()
    where owner_id = funding_owner and public_key = funding_public_key
      and (xlm_status = 'pending' or (xlm_status = 'processing' and xlm_lease_until < now()))
    returning * into result;
  elsif funding_asset = 'USDC' then
    update public.testnet_welcome_funding
    set usdc_status = 'processing', usdc_claim = claim_token,
        usdc_lease_until = now() + interval '90 seconds',
        usdc_attempts = usdc_attempts + 1, updated_at = now()
    where owner_id = funding_owner and public_key = funding_public_key
      and xlm_status = 'complete'
      and (usdc_status = 'pending' or (usdc_status = 'processing' and usdc_lease_until < now()))
    returning * into result;
  else
    raise exception 'Invalid asset';
  end if;
  if result.owner_id is not null then claimed := true;
  else
    select * into result from public.testnet_welcome_funding
    where owner_id = funding_owner and public_key = funding_public_key;
  end if;
  if result.owner_id is null then return null; end if;
  return jsonb_build_object(
    'claimed', claimed,
    'status', case when funding_asset = 'XLM' then result.xlm_status else result.usdc_status end,
    'claim', case when funding_asset = 'XLM' then result.xlm_claim else result.usdc_claim end,
    'signed_xdr', case when funding_asset = 'XLM' then result.xlm_signed_xdr else result.usdc_signed_xdr end,
    'tx_hash', case when funding_asset = 'XLM' then result.xlm_tx_hash else result.usdc_tx_hash end,
    'expires_at', case when funding_asset = 'XLM' then result.xlm_expires_at else result.usdc_expires_at end
  );
end;
$$;

-- Persists the signed transaction before it reaches Horizon. If the network
-- reply is lost, the next invocation checks this hash and resubmits this exact
-- XDR rather than constructing a second payment.
create function public.prepare_testnet_welcome_funding(
  funding_owner uuid,
  funding_public_key text,
  funding_asset text,
  claim_token uuid,
  signed_xdr text,
  tx_hash text,
  expires_at timestamptz
) returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if signed_xdr is null or char_length(signed_xdr) not between 20 and 4096
     or tx_hash !~ '^[a-f0-9]{64}$' or expires_at <= now() then
    raise exception 'Invalid prepared transaction';
  end if;
  if funding_asset = 'XLM' then
    update public.testnet_welcome_funding
    set xlm_signed_xdr = signed_xdr, xlm_tx_hash = tx_hash,
        xlm_expires_at = expires_at, updated_at = now()
    where owner_id = funding_owner and public_key = funding_public_key
      and xlm_status = 'processing' and xlm_claim = claim_token;
  elsif funding_asset = 'USDC' then
    update public.testnet_welcome_funding
    set usdc_signed_xdr = signed_xdr, usdc_tx_hash = tx_hash,
        usdc_expires_at = expires_at, updated_at = now()
    where owner_id = funding_owner and public_key = funding_public_key
      and usdc_status = 'processing' and usdc_claim = claim_token;
  else
    raise exception 'Invalid asset';
  end if;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create function public.complete_testnet_welcome_funding(
  funding_owner uuid,
  funding_public_key text,
  funding_asset text,
  claim_token uuid,
  tx_hash text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if tx_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid transaction hash'; end if;
  if funding_asset = 'XLM' then
    update public.testnet_welcome_funding
    set xlm_status = 'complete', xlm_funded_at = now(), xlm_claim = null,
        xlm_lease_until = null, xlm_signed_xdr = null, xlm_expires_at = null,
        updated_at = now()
    where owner_id = funding_owner and public_key = funding_public_key
      and xlm_status = 'processing' and xlm_claim = claim_token and xlm_tx_hash = tx_hash;
  elsif funding_asset = 'USDC' then
    update public.testnet_welcome_funding
    set usdc_status = 'complete', usdc_funded_at = now(), usdc_claim = null,
        usdc_lease_until = null, usdc_signed_xdr = null, usdc_expires_at = null,
        updated_at = now()
    where owner_id = funding_owner and public_key = funding_public_key
      and usdc_status = 'processing' and usdc_claim = claim_token and usdc_tx_hash = tx_hash;
  else
    raise exception 'Invalid asset';
  end if;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

-- Releases a lease after a known failure. keep_prepared remains true only for
-- uncertain network results, so the exact transaction can be checked later.
create function public.release_testnet_welcome_funding(
  funding_owner uuid,
  funding_public_key text,
  funding_asset text,
  claim_token uuid,
  keep_prepared boolean
) returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if funding_asset = 'XLM' then
    update public.testnet_welcome_funding
    set xlm_status = 'pending', xlm_claim = null, xlm_lease_until = null,
        xlm_signed_xdr = case when keep_prepared then xlm_signed_xdr else null end,
        xlm_tx_hash = case when keep_prepared then xlm_tx_hash else null end,
        xlm_expires_at = case when keep_prepared then xlm_expires_at else null end,
        updated_at = now()
    where owner_id = funding_owner and public_key = funding_public_key
      and xlm_status = 'processing' and xlm_claim = claim_token;
  elsif funding_asset = 'USDC' then
    update public.testnet_welcome_funding
    set usdc_status = 'pending', usdc_claim = null, usdc_lease_until = null,
        usdc_signed_xdr = case when keep_prepared then usdc_signed_xdr else null end,
        usdc_tx_hash = case when keep_prepared then usdc_tx_hash else null end,
        usdc_expires_at = case when keep_prepared then usdc_expires_at else null end,
        updated_at = now()
    where owner_id = funding_owner and public_key = funding_public_key
      and usdc_status = 'processing' and usdc_claim = claim_token;
  else
    raise exception 'Invalid asset';
  end if;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.claim_testnet_welcome_funding(uuid, text, text, uuid),
  public.prepare_testnet_welcome_funding(uuid, text, text, uuid, text, text, timestamptz),
  public.complete_testnet_welcome_funding(uuid, text, text, uuid, text),
  public.release_testnet_welcome_funding(uuid, text, text, uuid, boolean)
from public, anon, authenticated;
grant execute on function public.claim_testnet_welcome_funding(uuid, text, text, uuid),
  public.prepare_testnet_welcome_funding(uuid, text, text, uuid, text, text, timestamptz),
  public.complete_testnet_welcome_funding(uuid, text, text, uuid, text),
  public.release_testnet_welcome_funding(uuid, text, text, uuid, boolean)
to service_role;
