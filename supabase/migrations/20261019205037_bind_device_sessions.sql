-- Binds each Movya installation to the Supabase session that registered it.
-- Marking a device revoked then blocks sensitive RPCs immediately, even
-- while that session's access token has not expired yet.

alter table public.devices add column if not exists session_id uuid;
create index if not exists devices_owner_session_idx on public.devices(owner_id, session_id);

create or replace function public.touch_device(device_id uuid, device_label text, device_platform text)
returns public.devices language plpgsql security definer set search_path = '' as $$
declare result public.devices; current_session uuid := nullif(auth.jwt()->>'session_id', '')::uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if current_session is null then raise exception 'Session identifier required'; end if;
  select * into result from public.devices where id = device_id;
  if result.id is not null and result.owner_id <> auth.uid() then raise exception 'Device belongs to another account'; end if;
  if result.id is null then
    insert into public.devices(id, owner_id, label, platform, session_id)
    values (device_id, auth.uid(), left(btrim(device_label), 80), device_platform, current_session)
    returning * into result;
  elsif result.revoked_at is null then
    update public.devices
    set last_seen_at = now(), label = left(btrim(device_label), 80), platform = device_platform, session_id = current_session
    where id = device_id returning * into result;
  end if;
  return result;
end;
$$;

create or replace function movya_private.assert_active_device_session() returns void
language plpgsql stable security definer set search_path = '' as $$
declare current_session uuid := nullif(auth.jwt()->>'session_id', '')::uuid;
begin
  if exists (select 1 from public.devices d where d.owner_id = auth.uid())
     and (current_session is null or not exists (
       select 1 from public.devices d
       where d.owner_id = auth.uid() and d.session_id = current_session and d.revoked_at is null
     )) then
    raise exception 'Device session revoked';
  end if;
end;
$$;

create or replace function movya_private.assert_sensitive_session() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform movya_private.assert_active_device_session();
  if exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status::text = 'verified')
     and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'Two-step verification required';
  end if;
end;
$$;

revoke all on function public.touch_device(uuid, text, text) from public, anon;
grant execute on function public.touch_device(uuid, text, text) to authenticated;
revoke all on function movya_private.assert_active_device_session(), movya_private.assert_sensitive_session() from public, anon, authenticated;
