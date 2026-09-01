import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export class SecretStore {
  constructor(filePath, safeStorage) {
    this.filePath = filePath;
    this.safeStorage = safeStorage;
    this.mutation = Promise.resolve();
  }

  async readAll() {
    try {
      return JSON.parse(await readFile(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      throw error;
    }
  }

  async set(key, value) {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error('A proteção de credenciais do sistema operacional não está disponível.');
    }
    return this.enqueue(async () => {
      const data = await this.readAll();
      const encrypted = this.safeStorage.encryptString(String(value));
      data[key] = encrypted.toString('base64');
      await this.writeAll(data);
    });
  }

  async get(key) {
    const data = await this.readAll();
    if (!data[key]) return null;
    return this.safeStorage.decryptString(Buffer.from(data[key], 'base64'));
  }

  async remove(key) {
    return this.enqueue(async () => {
      const data = await this.readAll();
      delete data[key];
      await this.writeAll(data);
    });
  }

  enqueue(operation) {
    const result = this.mutation.then(operation, operation);
    this.mutation = result.catch(() => {});
    return result;
  }

  async writeAll(data) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }
}
