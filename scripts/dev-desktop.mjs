import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const nodeExecutable = process.execPath;
const viteCli = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const electronPath = process.env.FINANCEOS_ELECTRON_PATH || join(projectRoot, '.runtime', 'electron-v43.0.0', 'electron.exe');
const devUrl = 'http://127.0.0.1:5173/';

if (!existsSync(electronPath)) {
  console.error('Runtime Electron ausente. Execute npm run setup:desktop-runtime.');
  process.exit(1);
}

const vite = spawn(nodeExecutable, [viteCli, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(devUrl);
      if (response.ok) return;
    } catch {
      // O servidor ainda está inicializando.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('O Vite não iniciou dentro do tempo esperado.');
}

let electron;
try {
  await waitForServer();
  const electronEnvironment = { ...process.env, FINANCEOS_DEV_URL: devUrl };
  delete electronEnvironment.ELECTRON_RUN_AS_NODE;
  electron = spawn(electronPath, ['.'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: electronEnvironment,
  });
  electron.on('exit', (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
} catch (error) {
  vite.kill();
  console.error(error);
  process.exit(1);
}

process.on('SIGINT', () => {
  electron?.kill();
  vite.kill();
});
