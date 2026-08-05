/**
 * Ajustes.jsx
 * ───────────────────────────────────────────────────────────────
 * Administración de catálogos (grupos base, etiquetas,
 * actividades), exportación del padrón, y gestión de la conexión.
 */

import { useState, useEffect } from 'react'
import {
  listarGruposBase, crearGrupoBase, eliminarGrupoBase,
  listarEtiquetas, crearEtiqueta, actualizarEtiqueta, eliminarEtiqueta,
  listarActividades, crearActividad, eliminarActividad,
} from '../lib/catalogos.js'
import { listarMilitantes } from '../lib/militantes.js'
import { exportarPadronExcel, exportarPadronPDF } from '../lib/exportar.js'
import { borrarCredenciales, getCredenciales } from '../lib/supabase.js'
import { PALETA, hexToRgba } from '../lib/colores.js'

export default function Ajustes({ onDesconectar }) {
  const [gruposBase, setGruposBase]     = useState([])
  const [etiquetas, setEtiquetas]       = useState([])
  const [actividades, setActividades]   = useState([])
  const [cargando, setCargando]         = useState(true)
  const [nuevoGB, setNuevoGB]           = useState('')
  const [nuevaEtiq, setNuevaEtiq]       = useState('')
  const [colorEtiq, setColorEtiq]       = useState('#1ABC9C')
  const [nuevaActividad, setNuevaActividad] = useState('')
  const [exportando, setExportando]     = useState(false)
  const [toast, setToast]               = useState(null)

  async function cargar() {
    setCargando(true)
    try {
      const [gb, et, ac] = await Promise.all([listarGruposBase(), listarEtiquetas(), listarActividades()])
      setGruposBase(gb)
      setEtiquetas(et)
      setActividades(ac)
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => { cargar() }, [])

  function mostrar(msg, tipo = 'ok') {
    setToast({ msg, tipo }); setTimeout(() => setToast(null), 2500)
  }

  async function agregarGB() {
    const nombre = nuevoGB.trim()
    if (!nombre) return
    if (gruposBase.some(g => g.nombre.toLowerCase() === nombre.toLowerCase())) {
      mostrar('Ya existe ese grupo base', 'error'); return
    }
    try {
      await crearGrupoBase(nombre)
      setNuevoGB('')
      await cargar()
      mostrar('Grupo base creado')
    } catch (e) { mostrar('Error: ' + e.message, 'error') }
  }

  async function quitarGB(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"? Los militantes que lo tengan quedarán sin grupo base.`)) return
    try { await eliminarGrupoBase(id); await cargar(); mostrar('Grupo base eliminado') }
    catch (e) { mostrar('Error: ' + e.message, 'error') }
  }

  async function agregarEtiq() {
    const nombre = nuevaEtiq.trim()
    if (!nombre) return
    if (etiquetas.some(e => e.nombre.toLowerCase() === nombre.toLowerCase())) {
      mostrar('Ya existe esa etiqueta', 'error'); return
    }
    try {
      await crearEtiqueta(nombre, colorEtiq)
      setNuevaEtiq('')
      await cargar()
      mostrar('Etiqueta creada')
    } catch (e) { mostrar('Error: ' + e.message, 'error') }
  }

  async function cambiarColorEtiq(id, color) {
    try { await actualizarEtiqueta(id, { color }); await cargar() }
    catch (e) { mostrar('Error: ' + e.message, 'error') }
  }

  async function quitarEtiq(id, nombre) {
    if (!confirm(`¿Eliminar la etiqueta "${nombre}"?`)) return
    try { await eliminarEtiqueta(id); await cargar(); mostrar('Etiqueta eliminada') }
    catch (e) { mostrar('Error: ' + e.message, 'error') }
  }

  async function agregarActividad() {
    const nombre = nuevaActividad.trim()
    if (!nombre) return
    if (actividades.some(a => a.nombre.toLowerCase() === nombre.toLowerCase())) {
      mostrar('Ya existe esa actividad', 'error'); return
    }
    try {
      await crearActividad(nombre)
      setNuevaActividad('')
      await cargar()
      mostrar('Actividad creada')
    } catch (e) { mostrar('Error: ' + e.message, 'error') }
  }

  async function quitarActividad(id, nombre) {
    if (!confirm(`¿Eliminar la actividad "${nombre}"? Los militantes que la tengan quedarán sin actividad asignada.`)) return
    try { await eliminarActividad(id); await cargar(); mostrar('Actividad eliminada') }
    catch (e) { mostrar('Error: ' + e.message, 'error') }
  }

  async function exportar(formato) {
    setExportando(true)
    try {
      const activos = await listarMilitantes()
      if (activos.length === 0) { mostrar('No hay militantes activos que exportar', 'error'); return }
      if (formato === 'excel') await exportarPadronExcel(activos)
      else exportarPadronPDF(activos)
      mostrar(`${formato === 'excel' ? 'Excel' : 'PDF'} descargado ✓`)
    } catch (e) {
      mostrar('Error al exportar: ' + e.message, 'error')
    } finally {
      setExportando(false)
    }
  }

  function desconectar() {
    if (confirm('¿Desconectar esta base de datos? Tus datos NO se borran — solo se cierra la sesión en este dispositivo.')) {
      borrarCredenciales()
      onDesconectar()
    }
  }

  if (cargando) return <div className="cargando">Cargando ajustes…</div>

  const creds = getCredenciales()

  return (
    <div>
      <div className="topbar"><div className="topbar-titulo">Ajustes</div></div>

      <div className="ajustes-cont">

        {/* ── Grupos base ── */}
        <section className="panel">
          <div className="panel-cabecera"><div className="panel-titulo">Grupos base</div></div>
          <div className="panel-cuerpo">
            <p className="panel-desc">Los grupos base aparecen al dar de alta y como filtro. También encabezan el texto de WhatsApp.</p>
            {gruposBase.length === 0
              ? <div className="vacio-chico">Aún no hay grupos base. Crea el primero abajo.</div>
              : gruposBase.map(gb => (
                  <div key={gb.id} className="item-lista">
                    <span className="item-nombre">{gb.nombre}</span>
                    <button className="item-borrar" onClick={() => quitarGB(gb.id, gb.nombre)}>🗑</button>
                  </div>
                ))
            }
            <div className="crear-inline">
              <input type="text" placeholder="Ej. GB Tamaulipas - Coahuila" value={nuevoGB}
                     maxLength={40} onChange={e => setNuevoGB(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && agregarGB()} />
              <button className="btn-chico primario" onClick={agregarGB}>Crear</button>
            </div>
          </div>
        </section>

        {/* ── Actividades (cargo dentro del partido) ── */}
        <section className="panel">
          <div className="panel-cabecera"><div className="panel-titulo">Actividades</div></div>
          <div className="panel-cuerpo">
            <p className="panel-desc">El cargo o labor de cada militante (ej. Finanzas, Propaganda, Solo milita). Sirve como filtro en la lista.</p>
            {actividades.length === 0
              ? <div className="vacio-chico">Aún no hay actividades. Crea la primera abajo.</div>
              : actividades.map(a => (
                  <div key={a.id} className="item-lista">
                    <span className="item-nombre">{a.nombre}</span>
                    <button className="item-borrar" onClick={() => quitarActividad(a.id, a.nombre)}>🗑</button>
                  </div>
                ))
            }
            <div className="crear-inline">
              <input type="text" placeholder="Ej. Finanzas, Propaganda…" value={nuevaActividad}
                     maxLength={40} onChange={e => setNuevaActividad(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && agregarActividad()} />
              <button className="btn-chico primario" onClick={agregarActividad}>Crear</button>
            </div>
          </div>
        </section>

        {/* ── Etiquetas ── */}
        <section className="panel">
          <div className="panel-cabecera"><div className="panel-titulo">Etiquetas</div></div>
          <div className="panel-cuerpo">
            <p className="panel-desc">Etiquetas libres con color, para clasificar como tú quieras (ej. "Célula Norte", "Nuevo ingreso").</p>
            {etiquetas.map(et => (
              <div key={et.id} className="etiqueta-admin">
                <span className="mini-etiqueta" style={{
                  background: hexToRgba(et.color, 0.18), color: et.color,
                  borderColor: hexToRgba(et.color, 0.35),
                }}>{et.nombre}</span>
                <div className="paleta chica">
                  {PALETA.map(hex => (
                    <button key={hex} type="button"
                      className={`color-punto chico ${et.color === hex ? 'sel' : ''}`}
                      style={{ background: hex }}
                      onClick={() => cambiarColorEtiq(et.id, hex)} />
                  ))}
                </div>
                <button className="item-borrar" onClick={() => quitarEtiq(et.id, et.nombre)}>🗑</button>
              </div>
            ))}
            <div className="crear-etiqueta">
              <input type="text" placeholder="Nombre de la etiqueta" value={nuevaEtiq}
                     maxLength={24} onChange={e => setNuevaEtiq(e.target.value)} />
              <div className="paleta chica">
                {PALETA.map(hex => (
                  <button key={hex} type="button"
                    className={`color-punto chico ${colorEtiq === hex ? 'sel' : ''}`}
                    style={{ background: hex }} onClick={() => setColorEtiq(hex)} />
                ))}
              </div>
              <button className="btn-chico primario" onClick={agregarEtiq}>Crear etiqueta</button>
            </div>
          </div>
        </section>

        {/* ── Exportar padrón ── */}
        <section className="panel">
          <div className="panel-cabecera"><div className="panel-titulo">Exportar padrón</div></div>
          <div className="panel-cuerpo">
            <p className="panel-desc">Descarga un respaldo con tus militantes activos: nombre, condición, grupo base, actividad, cuota y estado.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-chico" disabled={exportando} onClick={() => exportar('excel')} style={{ flex: 1 }}>
                📊 Excel
              </button>
              <button className="btn-chico" disabled={exportando} onClick={() => exportar('pdf')} style={{ flex: 1 }}>
                📄 PDF
              </button>
            </div>
          </div>
        </section>

        {/* ── Conexión ── */}
        <section className="panel">
          <div className="panel-cabecera"><div className="panel-titulo">Conexión</div></div>
          <div className="panel-cuerpo">
            <p className="panel-desc">Conectado a tu base de datos:</p>
            <div className="conexion-url">{creds?.url || '—'}</div>
            <button className="btn-secundario" onClick={desconectar}>Desconectar base de datos</button>
          </div>
        </section>

        <div className="version-nota">Gestor de Finanzas · v1.0</div>
      </div>

      {toast && <div className={`toast ${toast.tipo}`}>{toast.msg}</div>}
    </div>
  )
}
