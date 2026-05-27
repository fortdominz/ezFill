import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup:      resolve(__dirname, 'popup.html'),
        review:     resolve(__dirname, 'review.html'),
        content:    resolve(__dirname, 'src/content/content.js'),
        background: resolve(__dirname, 'src/background/service_worker.js'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'content')    return 'src/content/content.js'
          if (chunk.name === 'background') return 'src/background/service_worker.js'
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
