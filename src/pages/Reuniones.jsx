/**
 * Reuniones.jsx
 * ───────────────────────────────────────────────────────────────
 * Lista de reuniones: próximas (con su orden del día) y pasadas
 * (con su acta). Desde aquí se programa una reunión nueva.
 */

import { useState, useEffect } from 'react'
import { listarReuniones, estadoReunion, ESTADO_REUNION_META } from '../lib/reuniones.js'
import { fechaCorta, horaTexto, hoyISO } from '../lib/fechas.js'
import ReunionDetalle from '../components/ReunionDetalle.jsx'
import FormReunion from '../components/FormReunion.jsx'

export default function Reuniones({ abrir = null }) {
  const [reuniones, setReuniones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [fAmbito, setFAmbito] = useState('')
  const [detalle, setDetalle] = useState(abrir?.id ? { id: abrir.id, pestana: abrir.pestana || 'orden', acta: !!abrir.acta } : null)
  const [nueva, setNueva] = useState(abrir?.nueva ? { fecha: abrir.fecha || null } : null)

  async function cargar() {
    setError(null)
    try { setReuniones(await listarReuniones()) }
    catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  if (cargando) return <div className="cargando">Cargando reuniones…</div>
  if (error) return (
    <div className="estado-error">
      <p>No se pudieron cargar las reuniones.</p>
      <p className="estado-error-detalle">{error}</p>
      <button className="btn-secundario" onClick={cargar}>Reintentar</button>
    </div>
  )

  const hoy = hoyISO()
  const q = busqueda.trim().toLowerCase()
  const filtradas = reuniones.filter(r => {
    if (fAmbito && r.ambito !== fAmbito) return false
    if (!q) return true
    return [r.discusion_tema, r.discusion_expone, r.mesa, r.actas_responsable, r.fecha, (r.asistentes || []).join(' ')]
      .join(' ').toLowerCase().includes(q)
  })
  const proximas = filtradas.filter(r => r.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const pasadas = filtradas.filter(r => r.fecha < hoy)
  const faltanActa = reuniones.filter(r => estadoReunion(r) === 'falta_acta').length

  return (
    <div>
      <div className="topbar">
        <div className="topbar-titulo">Reuniones</div>
        <button className="btn-chico primario" onClick={() => setNueva({ fecha: null })}>+ Programar reunión</button>
      </div>

      <div className="fila-badges">
        <span className="badge gris">{reuniones.length} reuniones</span>
        {faltanActa > 0 && <span className="badge ambar">{faltanActa} sin acta</span>}
      </div>

      <div className="barra-buscar">
        <input type="text" placeholder="Buscar por tema, fecha, quién expuso, asistentes…"
               value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>
      <div className="barra-filtros">
        <span className="filtro-etiqueta">Filtrar:</span>
        <select value={fAmbito} onChange={e => setFAmbito(e.target.value)}>
          <option value="">Todas</option>
          <option value="GB">GB</option>
          <option value="CG">CG</option>
          <option value="otro">Otras</option>
        </select>
      </div>

      <div className="seccion-lista">Próximas</div>
      {proximas.length === 0
        ? <div className="vacio-chico relleno">No hay reuniones programadas. <button className="enlace-chico" onClick={() => setNueva({ fecha: null })}>Programar la siguiente</button></div>
        : proximas.map(r => <FilaReunion key={r.id} r={r} onClick={() => setDetalle({ id: r.id, pestana: 'orden' })} />)}

      <div className="seccion-lista">Historial</div>
      {pasadas.length === 0
        ? <div className="vacio-chico relleno">Sin reuniones anteriores.</div>
        : pasadas.map(r => <FilaReunion key={r.id} r={r} onClick={() => setDetalle({ id: r.id, pestana: r.acta_lista ? 'acta' : 'orden' })} />)}

      {detalle && (
        <ReunionDetalle
          reunionId={detalle.id}
          pestanaInicial={detalle.pestana}
          abrirActa={detalle.acta}
          onCerrar={() => setDetalle(null)}
          onCambio={cargar}
        />
      )}

      {nueva && (
        <FormReunion
          fechaInicial={nueva.fecha}
          onGuardado={async r => { setNueva(null); await cargar(); setDetalle({ id: r.id, pestana: 'orden' }) }}
          onCerrar={() => setNueva(null)}
        />
      )}
    </div>
  )
}

export function FilaReunion({ r, onClick }) {
  const est = estadoReunion(r)
  const meta = ESTADO_REUNION_META[est]
  return (
    <div className="fila-reunion" onClick={onClick}>
      <div className={`fila-reunion-fecha ${r.ambito === 'GB' ? '' : 'otro'}`}>
        <span className="dia">{r.fecha.slice(8, 10)}</span>
        <span className="mes">{fechaCorta(r.fecha).split(' ')[2]}</span>
      </div>
      <div className="fila-info">
        <div className="fila-nombre">
          <span className={`badge ${r.ambito === 'GB' ? 'rojo' : 'azul'}`}>{r.ambito}</span>
          {fechaCorta(r.fecha)} · {horaTexto(r.hora)}
        </div>
        <div className="fila-meta">
          {r.discusion_tema ? `${r.discusion_tema}${r.discusion_continuacion ? ' (cont.)' : ''}` : 'Sin tema de discusión'}
        </div>
      </div>
      <span className={`badge ${meta.clase}`}>{meta.label}</span>
    </div>
  )
}
