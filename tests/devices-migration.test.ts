import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { Keypair } from '@stellar/stellar-sdk/base';

const alice = '00000000-0000-0000-0000-000000000001', bob = '00000000-0000-0000-0000-000000000002';
const phone = '11111111-1111-1111-1111-111111111111', tablet = '22222222-2222-2222-2222-222222222222';
const backup = (version: number, ciphertext: string) => ({ version, salt: 'f'.repeat(32), nonce: 'b'.repeat(24), ciphertext });
const sealed = (ciphertext: string) => ({ nonce: 'b'.repeat(24), ciphertext });

test('devices, contact backup, MFA enforcement, login rate limit and wallet replacement', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
      create table auth.mfa_factors(id uuid primary key default gen_random_uuid(), user_id uuid, status text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      grant usage on schema auth, public to authenticated, anon; grant execute on function auth.uid(), auth.jwt() to authenticated, anon;`);
    for (const file of ['20261002010000_accounts_contacts.sql', '20261002020000_recovery_words.sql', '20261019000000_security_hardening.sql', '20261019010000_devices_contacts_mfa.sql']) {
      await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    }
    await db.query('insert into auth.users values ($1,$2,now(),$4),($3,$5,now(),$4)', [alice, 'alice@movya.test', bob, '{}', 'bob@movya.test']);
    const as = async (id: string, claims = '{}', role = 'authenticated') => {
      await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)", [id, claims]); await db.exec(`set role ${role}`);
    };
    await as(alice);
    const old = Keypair.random().publicKey();
    await db.query('select public.register_wallet($1, $2::jsonb)', [old, JSON.stringify(backup(1, 'c'.repeat(144)))]);

    // Devices: register, revoke others, revoked device learns it on next touch.
    await db.query('select public.touch_device($1, $2, $3)', [phone, 'iPhone', 'ios']);
    await db.query('select public.touch_device($1, $2, $3)', [tablet, 'Android', 'android']);
    assert.equal((await db.query<{ n: number }>('select public.revoke_other_devices($1) n', [phone])).rows[0].n, 1);
    const touched = (await db.query<{ r: { revoked_at: string | null } }>('select public.touch_device($1, $2, $3) r', [tablet, 'Android', 'android'])).rows[0].r;
    assert.ok(touched.revoked_at);
    await as(bob);
    assert.equal((await db.query('select * from public.devices')).rows.length, 0);
    await assert.rejects(db.query('select public.touch_device($1, $2, $3)', [phone, 'x', 'ios']), /another account/);
    await assert.rejects(db.query('insert into public.devices(id, owner_id, label, platform) values ($1, $2, $3, $4)', [tablet, bob, 'x', 'ios']), /permission denied/);

    // Contact backup: first version 1, then strictly the next version.
    await as(alice);
    await assert.rejects(db.query('select public.put_contact_backup(2, $1::jsonb)', [JSON.stringify(sealed('aa'))]), /version conflict/);
    await db.query('select public.put_contact_backup(1, $1::jsonb)', [JSON.stringify(sealed('aa'))]);
    await db.query('select public.put_contact_backup(2, $1::jsonb)', [JSON.stringify(sealed('ab'))]);
    await assert.rejects(db.query('select public.put_contact_backup(2, $1::jsonb)', [JSON.stringify(sealed('ac'))]), /version conflict/);
    await assert.rejects(db.query('select public.put_contact_backup(3, $1::jsonb)', [JSON.stringify({ ...sealed('ad'), extra: 1 })]), /check constraint/);

    // Discoverability goes through the function.
    await assert.rejects(db.query('update public.profiles set discoverable = false'), /permission denied/);
    assert.equal((await db.query<{ v: boolean }>('select public.set_discoverable(false) v')).rows[0].v, false);

    // With a verified second factor, sensitive changes need an aal2 session.
    await db.exec('reset role'); await db.query('insert into auth.mfa_factors(user_id, status) values ($1, $2)', [alice, 'verified']);
    await as(alice);
    await assert.rejects(db.query('select public.stage_wallet_backup($1::jsonb)', [JSON.stringify(backup(3, 'e'.repeat(300)))]), /Two-step verification required/);
    await assert.rejects(db.query('select public.revoke_device($1)', [phone]), /Two-step verification required/);
    await as(alice, '{"aal":"aal2"}');
    await db.query('select public.stage_wallet_backup($1::jsonb)', [JSON.stringify(backup(3, 'e'.repeat(300)))]);

    // Emergency transfer: the account points to the new wallet, once per week.
    const fresh = Keypair.random().publicKey();
    await assert.rejects(db.query('select public.replace_wallet_account($1, $2, $3::jsonb)', [Keypair.random().publicKey(), fresh, JSON.stringify(backup(3, 'd'.repeat(300)))]), /cannot be replaced/);
    await db.query('select public.replace_wallet_account($1, $2, $3::jsonb)', [old, fresh, JSON.stringify(backup(3, 'd'.repeat(300)))]);
    const row = (await db.query<{ public_key: string; previous_public_key: string }>('select public_key, previous_public_key from public.wallet_backups')).rows[0];
    assert.equal(row.public_key, fresh); assert.equal(row.previous_public_key, old);
    await assert.rejects(db.query('select public.replace_wallet_account($1, $2, $3::jsonb)', [fresh, Keypair.random().publicKey(), JSON.stringify(backup(3, 'd'.repeat(300)))]), /cannot be replaced/);

    // Login parameters: 120 per hour per client IP.
    await db.exec('reset role'); await db.query(`select set_config('request.headers', $1, false)`, [JSON.stringify({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })]); await db.exec('set role anon');
    for (let i = 0; i < 120; i++) await db.query('select public.movya_login_params($1)', ['a@b.c']);
    await assert.rejects(db.query('select public.movya_login_params($1)', ['a@b.c']), /Too many requests/);
  } finally { await db.close(); }
});
