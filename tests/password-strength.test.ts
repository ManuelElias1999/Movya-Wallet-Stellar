import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertStrongPassword, checkPasswordStrength } from '../src/services/security/passwordStrength';

test('rejects short, common, sequential, repetitive and personal passwords', () => {
  for (const weak of ['corta1!', 'password12345', 'Contraseña2026', 'abcdef123456!', 'aaaaaaaaaaaaaa', 'qwertyuiop12', 'Bolivia2026!!']) {
    assert.equal(checkPasswordStrength(weak).ok, false, weak);
  }
  assert.equal(checkPasswordStrength('manuel-elias-ruta-77', { email: 'manuel@x.com' }).ok, false);
  assert.equal(checkPasswordStrength('soriaPlaza#Luna9', { name: 'Juan Soria' }).ok, false);
});

test('accepts long passphrases and mixed passwords', () => {
  for (const strong of ['mi gato azul come tostadas', 'Rio-Nube-Piedra-7', 'tZ4!vQ9#kL2@']) {
    assert.equal(checkPasswordStrength(strong).ok, true, strong);
  }
});

test('the confirmation must match', () => {
  assert.throws(() => assertStrongPassword('Rio-Nube-Piedra-7', 'Rio-Nube-Piedra-8'), /no coinciden/);
  assertStrongPassword('Rio-Nube-Piedra-7', 'Rio-Nube-Piedra-7');
});
