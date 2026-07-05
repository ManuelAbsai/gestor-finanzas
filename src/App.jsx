/**
 * App.jsx
 * ───────────────────────────────────────────────────────────────
 * Punto de entrada. Decide qué mostrar:
 *   · Sin conexión configurada  → pantalla de Conexión
 *   · Con conexión              → la app completa
 */

import { useState } from 'react'
import { hayConexion } from './lib/supabase.js'
import Conexion from './pages/Conexion.jsx'
import Shell from './pages/Shell.jsx'

export default function App() {
  const [conectado, setConectado] = useState(hayConexion())

  if (!conectado) {
    return <Conexion onConectado={() => setConectado(true)} />
  }

  return <Shell onDesconectar={() => setConectado(false)} />
}
