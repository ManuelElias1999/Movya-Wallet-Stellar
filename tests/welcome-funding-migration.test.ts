import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { Keypair } from '@stellar/stellar-sdk/base';

const alice = '00000000-0000-0000-0000-000000000001';
const bob = '00000000-0000-0000-0000-000000000002';
const backup = { version: 1, salt: 'a'.repeat(32), nonce: 'b'.repeat(24), ciphertext: 'c'.repeat(144) };

test('only new wallets receive one private, resumable welcome-funding record', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon, service_role;
      grant execute on function auth.uid() to authenticated, anon, service_role;`);
    for (const file of ['20261002010000_accounts_contacts.sql', '20261002020000_recovery_words.sql', '20261019000000_security_hardening.sql']) {
      await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
    }
    await db.query('insert into auth.users values ($1,$2,now(),$3),($4,$5,now(),$3)', [alice, 'alice@movya.test', '{}', bob, 'bob@movya.test']);
    const actingAs = async (id: string, role = 'authenticated') => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec(`set role ${role}`);
    };
    const register = async (key: string) => db.query('select public.register_wallet($1,$2::jsonb)', [key, JSON.stringify(backup)]);

    const aliceKey = Keypair.random().publicKey();
    await actingAs(alice); await register(aliceKey);
    await db.exec('reset role');
    await db.exec(await readFile('supabase/migrations/20261025200613_testnet_welcome_funding.sql', 'utf8'));

    const bobKey = Keypair.random().publicKey();
    await actingAs(bob); await register(bobKey); await register(Keypair.random().publicKey());
    await assert.rejects(db.query('select * from public.testnet_welcome_funding'), /permission denied/);
    await assert.rejects(db.query('select public.claim_testnet_welcome_funding($1,$2,$3,$4)', [bob, bobKey, 'XLM', crypto.randomUUID()]), /permission denied/);

    await actingAs('', 'service_role');
    const eligible = await db.query<{ owner_id: string; public_key: string }>('select owner_id, public_key from public.testnet_welcome_funding');
    assert.deepEqual(eligible.rows, [{ owner_id: bob, public_key: bobKey }]);
    const noRetroactiveGrant = await db.query<{ result: unknown }>('select public.claim_testnet_welcome_funding($1,$2,$3,$4) result', [alice, aliceKey, 'XLM', crypto.randomUUID()]);
    assert.equal(noRetroactiveGrant.rows[0].result, null);

    const firstToken = crypto.randomUUID();
    const first = await db.query<{ result: { claimed: boolean; status: string } }>('select public.claim_testnet_welcome_funding($1,$2,$3,$4) result', [bob, bobKey, 'XLM', firstToken]);
    assert.equal(first.rows[0].result.claimed, true);
    const concurrent = await db.query<{ result: { claimed: boolean; status: string } }>('select public.claim_testnet_welcome_funding($1,$2,$3,$4) result', [bob, bobKey, 'XLM', crypto.randomUUID()]);
    assert.deepEqual(concurrent.rows[0].result, { claimed: false, status: 'processing', claim: firstToken, signed_xdr: null, tx_hash: null, expires_at: null });

    const hash = 'a'.repeat(64), xdr = 'signed-transaction-xdr';
    const prepared = await db.query<{ result: boolean }>('select public.prepare_testnet_welcome_funding($1,$2,$3,$4,$5,$6,now()+interval \'2 minutes\') result', [bob, bobKey, 'XLM', firstToken, xdr, hash]);
    assert.equal(prepared.rows[0].result, true);
    const released = await db.query<{ result: boolean }>('select public.release_testnet_welcome_funding($1,$2,$3,$4,true) result', [bob, bobKey, 'XLM', firstToken]);
    assert.equal(released.rows[0].result, true);

    const retryToken = crypto.randomUUID();
    const retry = await db.query<{ result: { claimed: boolean; signed_xdr: string; tx_hash: string } }>('select public.claim_testnet_welcome_funding($1,$2,$3,$4) result', [bob, bobKey, 'XLM', retryToken]);
    assert.equal(retry.rows[0].result.claimed, true);
    assert.equal(retry.rows[0].result.signed_xdr, xdr);
    assert.equal(retry.rows[0].result.tx_hash, hash);
    const completed = await db.query<{ result: boolean }>('select public.complete_testnet_welcome_funding($1,$2,$3,$4,$5) result', [bob, bobKey, 'XLM', retryToken, hash]);
    assert.equal(completed.rows[0].result, true);
    const duplicate = await db.query<{ result: { claimed: boolean; status: string; tx_hash: string } }>('select public.claim_testnet_welcome_funding($1,$2,$3,$4) result', [bob, bobKey, 'XLM', crypto.randomUUID()]);
    assert.equal(duplicate.rows[0].result.claimed, false);
    assert.equal(duplicate.rows[0].result.status, 'complete');
    assert.equal(duplicate.rows[0].result.tx_hash, hash);

    const usdc = await db.query<{ result: { claimed: boolean; status: string } }>('select public.claim_testnet_welcome_funding($1,$2,$3,$4) result', [bob, bobKey, 'USDC', crypto.randomUUID()]);
    assert.equal(usdc.rows[0].result.claimed, true);
    assert.equal(usdc.rows[0].result.status, 'processing');
  } finally { await db.close(); }
});
