import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    include: ['./src/tests/**/*.test.{js,jsx,ts,tsx}'],
  },
});
