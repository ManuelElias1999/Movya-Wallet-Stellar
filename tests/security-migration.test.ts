import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { Keypair } from '@stellar/stellar-sdk/base';

const alice = '00000000-0000-0000-0000-000000000001', bob = '00000000-0000-0000-0000-000000000002';
const backup = (version: number, salt: string, ciphertext: string) => ({ version, salt, nonce: 'b'.repeat(24), ciphertext });
test('security migration: email discovery limits, two-phase backups and v3 login salts', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`);
    for (const file of ['20261002010000_accounts_contacts.sql', '20261002020000_recovery_words.sql', '20261019000000_security_hardening.sql']) {
      await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    }
    await db.query('insert into auth.users values ($1,$2,now(),$3),($4,$5,now(),$6)', [alice, 'alice@movya.test', JSON.stringify({ movya_kdf_salt: '0123456789abcdef0123456789abcdef' }), bob, 'bob@movya.test', '{}']);
    const as = async (id: string, role = 'authenticated') => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]); await db.exec(`set role ${role}`); };
    const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<{ v: T }>(sql, params)).rows[0].v;

    // v3 login parameters: real salt for v3 accounts, stable fake salt otherwise.
    await as('', 'anon');
    assert.deepEqual(await one('select public.movya_login_params($1) v', [' ALICE@movya.test ']), { salt: '0123456789abcdef0123456789abcdef' });
    const fake = await one<{ salt: string }>('select public.movya_login_params($1) v', ['nobody@x.test']);
    assert.match(fake.salt, /^[a-f0-9]{32}$/);
    assert.deepEqual(await one('select public.movya_login_params($1) v', ['nobody@x.test']), fake);
    await assert.rejects(db.query('select public.claim_kdf_salt($1)', ['f'.repeat(32)]), /permission denied/);
    await assert.rejects(db.query('select * from movya_private.kdf_salts'), /permission denied/);

    // A legacy account claims a salt once; it cannot be replaced afterwards.
    await as(bob);
    assert.equal(await one('select public.claim_kdf_salt($1) v', ['f'.repeat(32)]), 'f'.repeat(32));
    assert.equal(await one('select public.claim_kdf_salt($1) v', ['e'.repeat(32)]), 'f'.repeat(32));
    const bobKey = Keypair.random().publicKey();
    await db.query('select public.register_wallet($1, $2::jsonb)', [bobKey, JSON.stringify(backup(1, 'a'.repeat(32), 'c'.repeat(144)))]);

    // Two-phase replacement: only the exact staged backup can be promoted.
    const staged = backup(3, 'f'.repeat(32), 'e'.repeat(300));
    await db.query('select public.stage_wallet_backup($1::jsonb)', [JSON.stringify(staged)]);
    await assert.rejects(db.query('select public.promote_wallet_backup($1::jsonb)', [JSON.stringify({ ...staged, ciphertext: 'f'.repeat(300) })]), /Staged backup changed/);
    await db.query('select public.promote_wallet_backup($1::jsonb)', [JSON.stringify(staged)]);
    const row = (await db.query<{ backup: { version: number }; previous_backup: { version: number }; pending_backup: unknown; public_key: string }>('select * from public.wallet_backups')).rows[0];
    assert.equal(row.backup.version, 3); assert.equal(row.previous_backup.version, 1); assert.equal(row.pending_backup, null); assert.equal(row.public_key, bobKey);
    await assert.rejects(db.query('select public.stage_wallet_backup($1::jsonb)', [JSON.stringify(backup(3, 'x', 'e'))]), /check constraint/);
    await assert.rejects(db.query('update public.wallet_backups set public_key = $1', [Keypair.random().publicKey()]), /permission denied/);

    // Email discovery: opt-out and 30 new emails per day.
    await as(alice);
    await db.query('select public.register_wallet($1, $2::jsonb)', [Keypair.random().publicKey(), JSON.stringify(backup(1, 'a'.repeat(32), 'c'.repeat(144)))]);
    assert.equal(await one('select public.resolve_movya_email($1) v', ['BOB@movya.test']), bobKey);
    await as(bob);
    await db.query('update public.profiles set discoverable = false where id = $1', [bob]);
    await as(alice);
    assert.equal(await one('select public.resolve_movya_email($1) v', ['bob@movya.test']), null);
    for (let i = 0; i < 29; i++) await db.query('select public.resolve_movya_email($1)', [`x${i}@x.test`]);
    await assert.rejects(db.query('select public.resolve_movya_email($1)', ['one-more@x.test']), /Too many email lookups/);
    await db.query('select public.resolve_movya_email($1)', ['bob@movya.test']); // known email: still allowed
    await assert.rejects(db.query('select * from public.email_lookups'), /permission denied/);
  } finally { await db.close(); }
});
