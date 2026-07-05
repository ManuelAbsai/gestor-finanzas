/**
 * Conexion.jsx
 * ───────────────────────────────────────────────────────────────
 * Primera pantalla que ve un usuario nuevo: aquí conecta su
 * propio proyecto de Supabase. Guía amable, sin tecnicismos.
 */

import { useState } from 'react'
import { verificarConexion, guardarCredenciales } from '../lib/supabase.js'

const SQL_URL = 'https://github.com/TU_USUARIO/gestor-finanzas/blob/main/supabase/setup.sql'

export default function Conexion({ onConectado }) {
  const [paso, setPaso]       = useState('bienvenida') // 'bienvenida' | 'formulario' | 'falta_setup'
  const [url, setUrl]         = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [error, setError]     = useState(null)
  const [cargando, setCargando] = useState(false)

  async function conectar() {
    setError(null)
    setCargando(true)

    const resultado = await verificarConexion(url.trim(), anonKey.trim())

    setCargando(false)

    if (resultado.ok) {
      guardarCredenciales(url.trim(), anonKey.trim())
      onConectado()
      return
    }

    if (resultado.error === 'FALTA_SETUP') {
      // Credenciales correctas pero las tablas no existen
      guardarCredenciales(url.trim(), anonKey.trim())
      setPaso('falta_setup')
      return
    }

    setError(resultado.error)
  }

  async function reintentar() {
    setCargando(true)
    const resultado = await verificarConexion(url.trim(), anonKey.trim())
    setCargando(false)
    if (resultado.ok) {
      onConectado()
    } else if (resultado.error !== 'FALTA_SETUP') {
      setError(resultado.error)
      setPaso('formulario')
    }
    // si sigue en FALTA_SETUP, se queda en esta pantalla
  }

  // ══ Pantalla 1: Bienvenida ══════════════════════════════════
  if (paso === 'bienvenida') {
    return (
      <div className="conexion-screen">
        <div className="conexion-card">
          <div className="conexion-logo">◈</div>
          <h1 className="conexion-titulo">Gestor de Finanzas</h1>
          <p className="conexion-sub">
            Cuotas, pagos, evidencias y remisiones — todo en un solo lugar,
            en tu propia base de datos.
          </p>

          <div className="conexion-info">
            <p><strong>Tus datos son tuyos.</strong> Esta app se conecta a
            una base de datos que tú controlas (Supabase, gratis). Nadie más
            tiene acceso — ni siquiera quien te compartió esta app.</p>
          </div>

          <button className="btn-principal" onClick={() => setPaso('formulario')}>
            Comenzar
          </button>

          <p className="conexion-hint">
            ¿Primera vez? La guía de instalación te lleva paso a paso.
          </p>
        </div>
      </div>
    )
  }

  // ══ Pantalla 3: Faltan las tablas ═══════════════════════════
  if (paso === 'falta_setup') {
    return (
      <div className="conexion-screen">
        <div className="conexion-card">
          <div className="conexion-logo" style={{ color: 'var(--amber)' }}>⚠</div>
          <h1 className="conexion-titulo">Ya casi — falta un paso</h1>
          <p className="conexion-sub">
            Tu conexión funciona, pero tu base de datos está vacía.
            Hay que crear las tablas (solo esta vez).
          </p>

          <div className="conexion-pasos">
            <div className="conexion-paso">
              <span className="paso-num">1</span>
              <span>Abre tu proyecto en <strong>supabase.com</strong></span>
            </div>
            <div className="conexion-paso">
              <span className="paso-num">2</span>
              <span>En el menú lateral, entra a <strong>SQL Editor</strong></span>
            </div>
            <div className="conexion-paso">
              <span className="paso-num">3</span>
              <span>Copia el contenido del archivo <strong>setup.sql</strong> (viene con la app), pégalo y presiona <strong>Run</strong></span>
            </div>
            <div className="conexion-paso">
              <span className="paso-num">4</span>
              <span>Regresa aquí y toca el botón de abajo</span>
            </div>
          </div>

          <button className="btn-principal" onClick={reintentar} disabled={cargando}>
            {cargando ? 'Verificando…' : 'Ya lo hice, verificar'}
          </button>

          <button className="btn-secundario" onClick={() => setPaso('formulario')}>
            ← Cambiar conexión
          </button>
        </div>
      </div>
    )
  }

  // ══ Pantalla 2: Formulario de conexión ══════════════════════
  return (
    <div className="conexion-screen">
      <div className="conexion-card">
        <div className="conexion-logo">◈</div>
        <h1 className="conexion-titulo">Conecta tu base de datos</h1>
        <p className="conexion-sub">
          Estos datos están en tu panel de Supabase, en
          <strong> Settings → API</strong>.
        </p>

        <div className="campo">
          <label>URL del proyecto</label>
          <input
            type="url"
            placeholder="https://xxxxx.supabase.co"
            value={url}
            onChange={e => setUrl(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="campo">
          <label>Clave anon public</label>
          <textarea
            placeholder="eyJhbGciOi… (la clave larga que dice anon public)"
            value={anonKey}
            onChange={e => setAnonKey(e.target.value)}
            rows={3}
          />
        </div>

        {error && <div className="conexion-error">{error}</div>}

        <button
          className="btn-principal"
          onClick={conectar}
          disabled={cargando || !url || !anonKey}
        >
          {cargando ? 'Conectando…' : 'Conectar'}
        </button>

        <p className="conexion-hint">
          Estos datos se guardan solo en este dispositivo.
          Nunca salen de aquí.
        </p>
      </div>
    </div>
  )
}
