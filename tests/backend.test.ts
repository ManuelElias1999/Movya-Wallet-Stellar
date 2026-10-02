import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { Keypair } from '@stellar/stellar-sdk/base';

const alice = '00000000-0000-0000-0000-000000000001';
const bob = '00000000-0000-0000-0000-000000000002';
const unverified = '00000000-0000-0000-0000-000000000003';
const backup = { version: 1, salt: 'a'.repeat(32), nonce: 'b'.repeat(24), ciphertext: 'c'.repeat(144) };
test('Postgres enforces private contacts/backups, verified-email lookup and immutable idempotent wallet registration', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`);
    await db.exec(await readFile('supabase/migrations/20261002010000_accounts_contacts.sql', 'utf8'));
    await db.query('insert into auth.users values ($1,$2,now(),$3),($4,$5,now(),$3),($6,$7,null,$3)', [alice, 'alice@movya.test', JSON.stringify({ display_name: 'Alice' }), bob, 'bob@movya.test', unverified, 'pending@movya.test']);
    const actingAs = async (id: string, role = 'authenticated') => {
      await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]); await db.exec(`set role ${role}`);
    };
    const register = async (key: string, payload: unknown = backup) => (await db.query<{ public_key: string }>('select public_key from public.register_wallet($1,$2::jsonb)', [key, JSON.stringify(payload)])).rows[0];
    const aliceKey = Keypair.random().publicKey(); const bobKey = Keypair.random().publicKey();
    await actingAs(unverified); await assert.rejects(register(Keypair.random().publicKey()), /Verify your email/);
    await actingAs(alice); assert.equal((await register(aliceKey)).public_key, aliceKey);
    assert.equal((await register(Keypair.random().publicKey())).public_key, aliceKey);
    await assert.rejects(db.query('update public.wallet_backups set public_key=$1', [bobKey]), /permission denied/);
    await assert.rejects(db.query('delete from public.wallet_backups'), /permission denied/);
    await actingAs(bob); await assert.rejects(register(bobKey, {}), /check constraint/);
    await assert.rejects(register(bobKey, { ...backup, salt: null }), /check constraint/);
    await assert.rejects(register(bobKey, { ...backup, secret: 'S-plaintext-is-forbidden' }), /check constraint/);
    await register(bobKey);
    assert.equal((await db.query('select * from public.wallet_backups')).rows.length, 1);
    assert.equal((await db.query('select * from public.profiles')).rows.length, 1);
    const lookup = async (email: string) => (await db.query<{ key: string }>('select public.resolve_movya_email($1) as key', [email])).rows[0].key;
    assert.equal(await lookup(' ALICE@MOVYA.TEST '), aliceKey);
    assert.equal(await lookup('pending@movya.test'), null);
    assert.equal(await lookup('%'), null);
    await actingAs(alice);
    const inserted = await db.query<{ id: string }>('insert into public.contacts(name,email,address) values ($1,$2,$3) returning id', ['Bob', 'bob@movya.test', bobKey]);
    const contactId = inserted.rows[0].id;
    await db.query('update public.contacts set favorite=true where id=$1', [contactId]);
    assert.equal((await db.query<{ favorite: boolean }>('select favorite from public.contacts')).rows[0].favorite, true);
    await assert.rejects(db.query('insert into public.contacts(owner_id,name,address) values ($1,$2,$3)', [bob, 'Spoof', aliceKey]), /row-level security/);
    await assert.rejects(db.query('update public.contacts set owner_id=$1 where id=$2', [bob, contactId]), /row-level security/);
    await actingAs(bob);
    assert.equal((await db.query('select * from public.contacts')).rows.length, 0);
    assert.equal((await db.query('update public.contacts set name=$1 where id=$2 returning id', ['Intruder', contactId])).rows.length, 0);
    assert.equal((await db.query('delete from public.contacts where id=$1 returning id', [contactId])).rows.length, 0);
    await actingAs(alice); assert.equal((await db.query('delete from public.contacts where id=$1 returning id', [contactId])).rows.length, 1);
    await actingAs('', 'anon'); await assert.rejects(db.query('select * from public.contacts'), /permission denied/);
    await assert.rejects(lookup('alice@movya.test'), /permission denied/);
    await assert.rejects(register(Keypair.random().publicKey()), /permission denied/);
  } finally { await db.close(); }
});
