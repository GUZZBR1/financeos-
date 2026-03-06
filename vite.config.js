import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE: substitua 'financeos' pelo nome exato do seu repositório no GitHub
export default defineConfig({
  plugins: [react()],
  base: '/financeos-/',
})
