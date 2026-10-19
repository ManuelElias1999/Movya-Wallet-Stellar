import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertNotDuplicate, DUPLICATE_WINDOW_MS, recordPayment } from '../src/services/security/duplicateGuard';

const payment = { source: 'GA', destination: 'GB', amount: '1.0000000', asset: 'XLM', hash: 'h1' };
test('a second identical payment within two minutes is stopped; the same review can be retried', () => {
  recordPayment(payment, 0);
  assertNotDuplicate(payment, 1_000); // same hash: retrying the same transaction is safe
  assert.throws(() => assertNotDuplicate({ ...payment, hash: 'h2' }, 1_000), /hace menos de 2 minutos/);
  assertNotDuplicate({ ...payment, amount: '2.0000000', hash: 'h3' }, 1_000);
  assertNotDuplicate({ ...payment, hash: 'h4' }, DUPLICATE_WINDOW_MS);
});
