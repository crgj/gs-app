import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/gs-app/', // 🚀注意这里！！你的仓库名，前后都有 /
  build: {
    outDir: 'dist', // ✅ 设置输出目录为 dist
    emptyOutDir: true, // ✅ build之前清空目录，保持干净
  },
}))
