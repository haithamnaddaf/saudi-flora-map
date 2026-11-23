import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        preview: resolve(import.meta.dirname, 'index.html'),
        manage: resolve(import.meta.dirname, 'manage.html'),
        'flora-map': resolve(import.meta.dirname, 'src/widget.js')
      },
      output: {
        entryFileNames: chunk => chunk.name === 'flora-map' ? 'assets/flora-map.js' : 'assets/[name]-[hash].js'
      }
    }
  }
})
