import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Ruta base cuando la app se sirve desde GitHub Pages en un subdirectorio
// (ej: usuario.github.io/gestor-finanzas/). En desarrollo local queda como '/'.
const base = process.env.NODE_ENV === 'production' ? '/gestor-finanzas/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gestor de Finanzas',
        short_name: 'Finanzas',
        description: 'Cuotas, pagos, evidencias y remisiones',
        theme_color: '#8B1A1A',
        background_color: '#0F0F0F',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
