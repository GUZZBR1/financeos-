import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildContentSecurityPolicy } from './config/content-security-policy.mjs'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'financeos-content-security-policy',
      transformIndexHtml(html) {
        return html.replace('%FINANCEOS_CSP%', buildContentSecurityPolicy({ development: command === 'serve' }))
      },
    },
  ],
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
  },
}))
