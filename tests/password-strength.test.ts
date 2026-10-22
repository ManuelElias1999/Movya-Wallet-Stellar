import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertStrongPassword, checkPasswordStrength } from '../src/services/security/passwordStrength';

test('requires 10 characters and every requested character class', () => {
  for (const weak of ['Corta1!', 'SINMINUSCULA1!', 'sinmayuscula1!', 'SinNumero!!', 'SinSimbolo123']) {
    assert.equal(checkPasswordStrength(weak).ok, false, weak);
  }
});

test('accepts mixed passwords even when their numbers are sequential', () => {
  for (const strong of ['ClaveSegura9!', 'Test1234567891011.', 'Te774491003024534018.']) {
    assert.equal(checkPasswordStrength(strong).ok, true, strong);
  }
});

test('the confirmation must match', () => {
  assert.throws(() => assertStrongPassword('Rio-Nube-Piedra-7', 'Rio-Nube-Piedra-8'), /no coinciden/);
  assertStrongPassword('Rio-Nube-Piedra-7', 'Rio-Nube-Piedra-7');
});
