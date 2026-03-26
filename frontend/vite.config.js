import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,mp3}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB, needed for timer.mp3
      },
      manifest: false, // we provide our own in public/
    }),
  ],
  base: '/workout-tracker/',
})
