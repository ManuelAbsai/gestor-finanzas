/**
 * Shell.jsx
 * ───────────────────────────────────────────────────────────────
 * Estructura de navegación: sidebar en PC, barra inferior en móvil
 * (con un menú "Más" para las secciones menos usadas).
 */

import { useState, useEffect } from 'react'
import { verificarTablas, borrarCredenciales } from '../lib/supabase.js'
import Inicio from './Inicio.jsx'
import Calendario from './Calendario.jsx'
import Reuniones from './Reuniones.jsx'
import Estudio from './Estudio.jsx'
import Militantes from './Militantes.jsx'
import Aspirantes from './Aspirantes.jsx'
import Actividades from './Actividades.jsx'
import Informe from './Informe.jsx'
import Ajustes from './Ajustes.jsx'
import FinanzasArchivo from './FinanzasArchivo.jsx'

const BASE = import.meta.env.BASE_URL

const GRUPOS = [
  { titulo: 'General', vistas: [
    { id: 'inicio',      label: 'Inicio',          icon: '◈' },
    { id: 'calendario',  label: 'Calendario',      icon: '◻' },
  ]},
  { titulo: 'Reuniones', vistas: [
    { id: 'reuniones',   label: 'Reuniones',       icon: '▤' },
    { id: 'estudio',     label: 'Estudio',         icon: '❡' },
  ]},
  { titulo: 'Padrón', vistas: [
    { id: 'militantes',  label: 'Militantes',      icon: '◉' },
    { id: 'aspirantes',  label: 'Aspirantes',      icon: '☎' },
  ]},
  { titulo: 'Trabajo', vistas: [
    { id: 'actividades', label: 'Actividades',     icon: '⚑' },
    { id: 'informe',     label: 'Informe mensual', icon: '▦' },
  ]},
]

const TODAS = GRUPOS.flatMap(g => g.vistas).concat([{ id: 'ajustes', label: 'Ajustes', icon: '⚙' }])
const EN_BARRA = ['inicio', 'reuniones', 'militantes', 'aspirantes']
const EN_MAS = ['calendario', 'estudio', 'actividades', 'informe', 'ajustes']

export default function Shell({ onDesconectar }) {
  const [nav, setNav] = useState({ vista: 'inicio', param: null })
  const [estadoTablas, setEstadoTablas] = useState(null)
  const [masAbierto, setMasAbierto] = useState(false)

  useEffect(() => {
    verificarTablas()
      .then(r => setEstadoTablas(r))
      .catch(() => setEstadoTablas({ completo: false, faltantes: ['(sin conexión)'] }))
  }, [])

  function ir(vista, param = null) {
    setNav({ vista, param })
    setMasAbierto(false)
    document.querySelector('.main-content')?.scrollTo(0, 0)
  }

  function desconectar() {
    borrarCredenciales()
    onDesconectar()
  }

  if (estadoTablas && !estadoTablas.completo) {
    return (
      <div className="conexion-screen">
        <div className="conexion-card">
          <div className="conexion-logo" style={{ color: 'var(--amber)' }}>⚠</div>
          <h1 className="conexion-titulo">Falta actualizar tu base de datos</h1>
          <p className="conexion-sub">
            La app se actualizó y a tu base le falta: <strong>{estadoTablas.faltantes.join(', ')}</strong>.
          </p>
          <div className="conexion-pasos">
            <div className="conexion-paso"><span className="paso-num">1</span>Entra a supabase.com → tu proyecto → <strong>SQL Editor</strong>.</div>
            <div className="conexion-paso"><span className="paso-num">2</span>Pega todo el archivo <strong>actualizacion_pcr.sql</strong> (está en la carpeta <em>supabase</em> del proyecto) y presiona <strong>Run</strong>. Aunque ya lo hayas corrido antes, córrelo otra vez completo.</div>
            <div className="conexion-paso"><span className="paso-num">3</span>Regresa aquí y presiona el botón de abajo. No se borra nada de lo que ya tenías.</div>
          </div>
          <button className="btn-principal" onClick={() => window.location.reload()}>
            Ya lo corrí, verificar de nuevo
          </button>
          <button className="btn-secundario" onClick={desconectar}>Cambiar conexión</button>
        </div>
      </div>
    )
  }

  const vista = nav.vista
  const activoMas = EN_MAS.includes(vista) || vista === 'finanzas'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand marca">
          <img src={`${BASE}logos/emblema-blanco.png`} alt="" className="marca-emblema" />
          <div>
            <div className="sidebar-eyebrow">Grupo base</div>
            <div className="sidebar-name">PCR</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {GRUPOS.map(g => (
            <div key={g.titulo}>
              <div className="nav-seccion">{g.titulo}</div>
              {g.vistas.map(v => (
                <button key={v.id} className={`nav-item ${vista === v.id ? 'activo' : ''}`} onClick={() => ir(v.id)}>
                  <span className="nav-icon">{v.icon}</span>{v.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className={`nav-item ${vista === 'ajustes' || vista === 'finanzas' ? 'activo' : ''}`} onClick={() => ir('ajustes')}>
            <span className="nav-icon">⚙</span>Ajustes
          </button>
        </div>
      </aside>

      <main className="main-content">
        {estadoTablas === null
          ? <div className="cargando">Verificando tu base de datos…</div>
          : <Vista nav={nav} ir={ir} onDesconectar={desconectar} />
        }
      </main>

      <nav className="bottom-nav">
        {EN_BARRA.map(id => {
          const v = TODAS.find(x => x.id === id)
          return (
            <button key={id} className={`bnav-item ${vista === id ? 'activo' : ''}`} onClick={() => ir(id)}>
              <span className="bnav-icon">{v.icon}</span>
              <span className="bnav-label">{v.label}</span>
            </button>
          )
        })}
        <button className={`bnav-item ${activoMas ? 'activo' : ''}`} onClick={() => setMasAbierto(true)}>
          <span className="bnav-icon">☰</span>
          <span className="bnav-label">Más</span>
        </button>
      </nav>

      {masAbierto && (
        <div className="modal-fondo" onClick={() => setMasAbierto(false)}>
          <div className="modal-hoja" onClick={e => e.stopPropagation()}>
            <div className="modal-cabecera">
              <div className="modal-titulo">Más secciones</div>
              <button className="cerrar" onClick={() => setMasAbierto(false)}>✕</button>
            </div>
            <div className="menu-mas">
              {EN_MAS.map(id => {
                const v = TODAS.find(x => x.id === id)
                return (
                  <button key={id} className={`menu-mas-item ${vista === id ? 'activo' : ''}`} onClick={() => ir(id)}>
                    <span className="menu-mas-icono">{v.icon}</span>{v.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Vista({ nav, ir, onDesconectar }) {
  const p = nav.param
  switch (nav.vista) {
    case 'inicio':      return <Inicio ir={ir} />
    case 'calendario':  return <Calendario ir={ir} />
    case 'reuniones':   return <Reuniones ir={ir} abrir={p} key={JSON.stringify(p)} />
    case 'estudio':     return <Estudio ir={ir} />
    case 'militantes':  return <Militantes ir={ir} />
    case 'aspirantes':  return <Aspirantes ir={ir} abrirId={p} key={p || 'asp'} />
    case 'actividades': return <Actividades ir={ir} />
    case 'informe':     return <Informe ir={ir} />
    case 'ajustes':     return <Ajustes ir={ir} onDesconectar={onDesconectar} />
    case 'finanzas':    return <FinanzasArchivo ir={ir} />
    default:            return <Inicio ir={ir} />
  }
}
