import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: command === 'build' ? '/gs-app/' : '/', // ✅ 动态base
}))
