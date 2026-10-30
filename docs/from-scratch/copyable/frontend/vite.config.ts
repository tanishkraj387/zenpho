import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('@monaco-editor')) {
            return 'monaco'
          }

          if (id.includes('@supabase') || id.includes('@tanstack')) {
            return 'supabase'
          }

          if (id.includes('framer-motion') || id.includes('react-resizable-panels')) {
            return 'animation'
          }

          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('react-router-dom') ||
            id.includes('zustand')
          ) {
            return 'react'
          }

          return 'vendor'
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
})
