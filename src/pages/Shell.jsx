/**
 * Shell.jsx
 * ───────────────────────────────────────────────────────────────
 * Estructura de navegación: sidebar en PC, barra inferior en móvil.
 * Enruta a todas las vistas de la app.
 */

import { useState, useEffect } from 'react'
import { verificarTablas, borrarCredenciales } from '../lib/supabase.js'
import Dashboard from './Dashboard.jsx'
import Calendario from './Calendario.jsx'
import Militantes from './Militantes.jsx'
import Remisiones from './Remisiones.jsx'
import Ajustes from './Ajustes.jsx'

const VISTAS = [
  { id: 'dashboard',  label: 'Inicio',      icon: '◈' },
  { id: 'calendario', label: 'Calendario',  icon: '◻' },
  { id: 'militantes', label: 'Militantes',  icon: '◉' },
  { id: 'remisiones', label: 'Remisiones',  icon: '◻' },
]

export default function Shell({ onDesconectar }) {
  const [vista, setVista] = useState('dashboard')
  const [estadoTablas, setEstadoTablas] = useState(null)

  useEffect(() => {
    verificarTablas()
      .then(r => setEstadoTablas(r))
      .catch(() => setEstadoTablas({ completo: false, faltantes: ['(sin conexión)'] }))
  }, [])

  function desconectar() {
    borrarCredenciales()
    onDesconectar()
  }

  if (estadoTablas && !estadoTablas.completo) {
    return (
      <div className="conexion-screen">
        <div className="conexion-card">
          <div className="conexion-logo" style={{ color: 'var(--amber)' }}>⚠</div>
          <h1 className="conexion-titulo">Instalación incompleta</h1>
          <p className="conexion-sub">
            Faltan tablas en tu base de datos: <strong>{estadoTablas.faltantes.join(', ')}</strong>.
            Corre el archivo <strong>setup.sql</strong> completo en el SQL Editor de Supabase.
          </p>
          <button className="btn-principal" onClick={() => window.location.reload()}>
            Ya lo corrí, verificar de nuevo
          </button>
          <button className="btn-secundario" onClick={desconectar}>Cambiar conexión</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-eyebrow">Gestor de</div>
          <div className="sidebar-name">Finanzas</div>
        </div>
        <nav className="sidebar-nav">
          {VISTAS.map(v => (
            <button key={v.id} className={`nav-item ${vista === v.id ? 'activo' : ''}`}
                    onClick={() => setVista(v.id)}>
              <span className="nav-icon">{v.icon}</span>{v.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className={`nav-item ${vista === 'ajustes' ? 'activo' : ''}`} onClick={() => setVista('ajustes')}>
            <span className="nav-icon">⚙</span>Ajustes
          </button>
        </div>
      </aside>

      <main className="main-content">
        {estadoTablas === null
          ? <div className="cargando">Verificando tu base de datos…</div>
          : <Vista vista={vista} setVista={setVista} onDesconectar={desconectar} />
        }
      </main>

      <nav className="bottom-nav">
        {VISTAS.map(v => (
          <button key={v.id} className={`bnav-item ${vista === v.id ? 'activo' : ''}`}
                  onClick={() => setVista(v.id)}>
            <span className="bnav-icon">{v.icon}</span>
            <span className="bnav-label">{v.label}</span>
          </button>
        ))}
        <button className={`bnav-item ${vista === 'ajustes' ? 'activo' : ''}`} onClick={() => setVista('ajustes')}>
          <span className="bnav-icon">⚙</span>
          <span className="bnav-label">Ajustes</span>
        </button>
      </nav>
    </div>
  )
}

function Vista({ vista, setVista, onDesconectar }) {
  switch (vista) {
    case 'dashboard':  return <Dashboard onIrAMilitantes={() => setVista('militantes')} />
    case 'calendario': return <Calendario />
    case 'militantes': return <Militantes />
    case 'remisiones': return <Remisiones />
    case 'ajustes':    return <Ajustes onDesconectar={onDesconectar} />
    default:           return <Dashboard onIrAMilitantes={() => setVista('militantes')} />
  }
}
