import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Ruta base cuando la app se sirve desde GitHub Pages en un subdirectorio
// (ej: usuario.github.io/gestor-finanzas/). En desarrollo local queda como '/'.
// El nombre de la carpeta se queda igual aunque la app ahora se llame PCR,
// para no romper el enlace ni la app ya instalada en los celulares.
const base = process.env.NODE_ENV === 'production' ? '/gestor-finanzas/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png', 'logos/*.png'],
      manifest: {
        id: base,
        name: 'PCR',
        short_name: 'PCR',
        description: 'Reuniones, actas, órdenes del día, aspirantes y actividades del grupo base',
        theme_color: '#8B1A1A',
        background_color: '#0F0F0F',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
