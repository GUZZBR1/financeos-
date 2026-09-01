import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SecretStore } from './secret-store.mjs';

test('stores encrypted credentials and retrieves their plaintext value', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'financeos-secret-'));
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`protected:${value}`, 'utf8'),
    decryptString: (value) => value.toString('utf8').replace(/^protected:/, ''),
  };
  try {
    const store = new SecretStore(join(directory, 'credentials.json'), safeStorage);
    await store.set('connector:test:token', 'segredo');
    assert.equal(await store.get('connector:test:token'), 'segredo');
    await store.remove('connector:test:token');
    assert.equal(await store.get('connector:test:token'), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('refuses plaintext fallback when operating-system encryption is unavailable', async () => {
  const store = new SecretStore('unused.json', { isEncryptionAvailable: () => false });
  await assert.rejects(() => store.set('token', 'segredo'), /proteção de credenciais/i);
});

test('serializes concurrent credential updates without losing keys', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'financeos-secret-concurrent-'));
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`protected:${value}`, 'utf8'),
    decryptString: (value) => value.toString('utf8').replace(/^protected:/, ''),
  };
  try {
    const store = new SecretStore(join(directory, 'credentials.json'), safeStorage);
    await Promise.all(Array.from({ length: 20 }, (_, index) => store.set(`key-${index}`, `value-${index}`)));
    const values = await Promise.all(Array.from({ length: 20 }, (_, index) => store.get(`key-${index}`)));
    assert.deepEqual(values, Array.from({ length: 20 }, (_, index) => `value-${index}`));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
