import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { isNetworkFailure } from '../src/services/backend/networkFailure';

test('recognizes structured fetch, abort and Supabase transport failures', () => {
  assert.equal(isNetworkFailure(new TypeError('Failed to fetch')), true);
  assert.equal(isNetworkFailure(Object.assign(new Error('cancelled'), { name: 'AbortError' })), true);
  assert.equal(isNetworkFailure(Object.assign(new Error('cancelled'), { code: 'ABORT_ERR' })), true);
  assert.equal(isNetworkFailure({ name: 'PostgrestError', code: '', message: 'any text' }, 0), true);
  assert.equal(isNetworkFailure({ name: 'PostgrestError', cause: new TypeError('socket closed') }), true);
});

test('never guesses network state from a server error message', () => {
  assert.equal(isNetworkFailure({ name: 'PostgrestError', code: 'PGRST301', message: 'network timeout while processing data' }, 500), false);
  assert.equal(isNetworkFailure(new Error('offline account is not allowed')), false);
  assert.equal(isNetworkFailure({ status: 0 }), false);
});
