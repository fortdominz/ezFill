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
        // Popup — full React app, bundled with React/ReactDOM
        popup: resolve(__dirname, 'popup.html'),
        // Content script — plain JS, runs on job application pages
        content: resolve(__dirname, 'src/content/content.js'),
        // Service worker — background message hub
        background: resolve(__dirname, 'src/background/service_worker.js'),
      },
      output: {
        // Predictable names so manifest.json can reference them exactly
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
