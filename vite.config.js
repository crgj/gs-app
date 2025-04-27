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
  build: {
    outDir: 'dist', // ✅ 设置输出目录为 dist
    emptyOutDir: true, // ✅ build之前清空目录，保持干净
  },
}))
