/**
 * Actividades.jsx
 * ───────────────────────────────────────────────────────────────
 * Registro de lo que hace el grupo base (pegas, eventos,
 * formación…). Una actividad puede venir de una tarea de acta;
 * al registrarla se puede dar la tarea por cumplida.
 */

import { useState, useEffect } from 'react'
import { listarActividadesGB, guardarActividadGB, eliminarActividadGB, listarTiposActividad } from '../lib/actividadesGB.js'
import { listarAcuerdos, cambiarEstadoAcuerdo } from '../lib/reuniones.js'
import { hexToRgba } from '../lib/colores.js'
import { hoyISO, diaMes, mesLegible, ultimosMeses } from '../lib/fechas.js'

export default function Actividades({ ir }) {
  const [lista, setLista] = useState([])
  const [tipos, setTipos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [fMes, setFMes] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [toast, setToast] = useState(null)

  async function cargar() {
    setError(null)
    try {
      const [a, t] = await Promise.all([listarActividadesGB(), listarTiposActividad()])
      setLista(a); setTipos(t)
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  function mostrar(msg, tipo = 'ok') { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2600) }

  if (cargando) return <div className="cargando">Cargando actividades…</div>
  if (error) return (
    <div className="estado-error">
      <p>No se pudieron cargar las actividades.</p>
      <p className="estado-error-detalle">{error}</p>
      <button className="btn-secundario" onClick={cargar}>Reintentar</button>
    </div>
  )

  const q = busqueda.trim().toLowerCase()
  const filtradas = lista.filter(a => {
    if (fMes && a.fecha.slice(0, 7) !== fMes) return false
    if (fTipo && a.tipo_id !== fTipo) return false
    if (q && ![a.titulo, a.lugar, a.participantes, a.notas].join(' ').toLowerCase().includes(q)) return false
    return true
  })

  // Agrupar por mes
  const grupos = {}
  filtradas.forEach(a => { (grupos[a.fecha.slice(0, 7)] ||= []).push(a) })

  return (
    <div>
      <div className="topbar">
        <div className="topbar-titulo">Actividades</div>
        <button className="btn-chico primario" onClick={() => setEditando({})}>+ Registrar actividad</button>
      </div>

      <div className="barra-buscar">
        <input type="text" placeholder="Buscar por lo que se hizo, lugar, participantes…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>
      <div className="barra-filtros">
        <span className="filtro-etiqueta">Filtrar:</span>
        <select value={fMes} onChange={e => setFMes(e.target.value)}>
          <option value="">Mes: todos</option>
          {ultimosMeses(12).map(m => <option key={m} value={m}>{mesLegible(m)}</option>)}
        </select>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)}>
          <option value="">Tipo: todos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <button className="btn-chico" onClick={() => ir('informe')}>Ver informe mensual →</button>
      </div>

      {filtradas.length === 0
        ? <div className="vacio">{lista.length === 0 ? 'Aún no hay actividades. Registra la primera: una pega, un evento, un círculo de estudio…' : 'Nada con esos filtros.'}</div>
        : Object.entries(grupos).map(([mes, items]) => (
          <div key={mes}>
            <div className="seccion-lista">{mesLegible(mes)} <span className="contador">{items.length}</span></div>
            {items.map(a => {
              const color = a.tipo?.color || '#7A7670'
              return (
                <div key={a.id} className="fila-militante" style={{ borderLeftColor: color }} onClick={() => setEditando(a)}>
                  <div className="fila-fecha-chica">{diaMes(a.fecha)}</div>
                  <div className="fila-info">
                    <div className="fila-nombre">{a.titulo}</div>
                    <div className="fila-meta">
                      {[a.lugar, a.participantes, a.cantidad != null && `${a.cantidad} ${a.unidad || ''}`].filter(Boolean).join(' · ') || '—'}
                    </div>
                    {a.acuerdo && <div className="fila-meta texto-ambar">↳ de la tarea: {a.acuerdo.texto}</div>}
                  </div>
                  {a.tipo && (
                    <span className="mini-etiqueta" style={{ background: hexToRgba(color, 0.18), color, borderColor: hexToRgba(color, 0.35) }}>{a.tipo.nombre}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}

      {editando && (
        <FormActividad
          a={editando}
          tipos={tipos}
          onCerrar={() => setEditando(null)}
          onGuardado={async msg => { setEditando(null); await cargar(); mostrar(msg) }}
        />
      )}

      {toast && <div className={`toast ${toast.tipo}`}>{toast.msg}</div>}
    </div>
  )
}

function FormActividad({ a, tipos, onCerrar, onGuardado }) {
  const esEdicion = !!a.id
  const [f, setF] = useState({
    fecha: a.fecha || hoyISO(), tipo_id: a.tipo_id || tipos[0]?.id || '', titulo: a.titulo || '',
    lugar: a.lugar || '', participantes: a.participantes || '', cantidad: a.cantidad ?? '',
    unidad: a.unidad || '', acuerdo_id: a.acuerdo_id || '', notas: a.notas || '',
  })
  const [tareas, setTareas] = useState([])
  const [cumplirTarea, setCumplirTarea] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const set = (c, v) => setF(prev => ({ ...prev, [c]: v }))

  useEffect(() => {
    listarAcuerdos().then(l => setTareas(l.filter(x => x.tipo === 'tarea' && (x.estado === 'pendiente' || x.id === a.acuerdo_id))))
      .catch(() => setTareas([]))
  }, [])

  function elegirTarea(id) {
    set('acuerdo_id', id)
    const t = tareas.find(x => x.id === id)
    if (t && !f.titulo.trim()) set('titulo', t.texto.replace(/^Se (asistirá|establecerá|hará|realizará) /i, '').replace(/\.$/, ''))
  }

  async function guardar() {
    if (!f.titulo.trim()) return
    setGuardando(true)
    try {
      await guardarActividadGB(f, a.id)
      const tarea = tareas.find(x => x.id === f.acuerdo_id)
      if (tarea && cumplirTarea && tarea.estado === 'pendiente') await cambiarEstadoAcuerdo(tarea.id, 'cumplido')
      onGuardado(esEdicion ? 'Actividad actualizada ✓' : 'Actividad registrada ✓')
    } catch (e) { alert('No se pudo guardar: ' + e.message); setGuardando(false) }
  }

  async function borrar() {
    if (!confirm('¿Eliminar esta actividad?')) return
    try { await eliminarActividadGB(a.id); onGuardado('Actividad eliminada') }
    catch (e) { alert('No se pudo eliminar: ' + e.message) }
  }

  const tareaSel = tareas.find(x => x.id === f.acuerdo_id)

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-hoja" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">{esEdicion ? 'Editar actividad' : 'Registrar actividad'}</div>
          <button className="cerrar" onClick={onCerrar}>✕</button>
        </div>
        <div className="modal-cuerpo">
          {tareas.length > 0 && (
            <div className="campo">
              <label>¿Viene de una tarea de acta? (opcional)</label>
              <select value={f.acuerdo_id} onChange={e => elegirTarea(e.target.value)}>
                <option value="">— No —</option>
                {tareas.map(t => <option key={t.id} value={t.id}>{diaMes(t.reunion?.fecha)}: {t.texto.slice(0, 70)}{t.texto.length > 70 ? '…' : ''}</option>)}
              </select>
              {tareaSel?.estado === 'pendiente' && (
                <label className="check-linea">
                  <input type="checkbox" checked={cumplirTarea} onChange={e => setCumplirTarea(e.target.checked)} />
                  Dar la tarea por cumplida
                </label>
              )}
            </div>
          )}
          <div className="campo"><label>¿Qué se hizo? *</label>
            <input type="text" value={f.titulo} placeholder="Ej. Pega de propaganda en la Alameda" onChange={e => set('titulo', e.target.value)} />
          </div>
          <div className="campo-fila">
            <div className="campo"><label>Fecha</label><input type="date" value={f.fecha} onChange={e => set('fecha', e.target.value)} /></div>
            <div className="campo"><label>Tipo</label>
              <select value={f.tipo_id} onChange={e => set('tipo_id', e.target.value)}>
                <option value="">— Sin tipo —</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="campo"><label>Lugar</label><input type="text" value={f.lugar} onChange={e => set('lugar', e.target.value)} /></div>
          <div className="campo"><label>Quiénes participaron</label><input type="text" value={f.participantes} placeholder="Karen, Alfredo, Manuel…" onChange={e => set('participantes', e.target.value)} /></div>
          <div className="campo-fila">
            <div className="campo"><label>Resultado (cantidad)</label><input type="number" value={f.cantidad} placeholder="Ej. 150" onChange={e => set('cantidad', e.target.value)} /></div>
            <div className="campo"><label>¿De qué?</label><input type="text" value={f.unidad} placeholder="volantes, periódicos, contactos…" onChange={e => set('unidad', e.target.value)} /></div>
          </div>
          <div className="campo"><label>Notas / balance</label><textarea rows={3} value={f.notas} onChange={e => set('notas', e.target.value)} /></div>
          <button className="btn-principal" disabled={guardando || !f.titulo.trim()} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar actividad'}</button>
          {esEdicion && <button className="btn-secundario peligro" onClick={borrar}>Eliminar actividad</button>}
        </div>
      </div>
    </div>
  )
}
