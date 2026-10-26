/**
 * Calendario.jsx
 * ───────────────────────────────────────────────────────────────
 * Vista mensual: reuniones (GB y otras), llamadas programadas a
 * aspirantes, actividades realizadas y recordatorios manuales.
 * Al tocar un día se ve lo que hay y se puede programar una
 * reunión o agregar un recordatorio.
 */

import { useState, useEffect } from 'react'
import { listarReuniones, estadoReunion, ESTADO_REUNION_META } from '../lib/reuniones.js'
import { listarAspirantes } from '../lib/aspirantes.js'
import { listarActividadesGB } from '../lib/actividadesGB.js'
import { listarEventos, crearEvento, eliminarEvento } from '../lib/remisiones.js'
import { MESES, aISO, horaTexto } from '../lib/fechas.js'

const DIAS = ['D','L','M','M','J','V','S']
const COLOR = { gb: '#B22222', otra: '#5B8DD9', llamada: '#C17D2A', actividad: '#3DAF7D', evento: '#9B59B6' }

export default function Calendario({ ir }) {
  const [ref, setRef] = useState(new Date())
  const [reuniones, setReuniones] = useState([])
  const [aspirantes, setAspirantes] = useState([])
  const [actividades, setActividades] = useState([])
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [diaSel, setDiaSel] = useState(null)
  const [nuevoEvento, setNuevoEvento] = useState('')

  async function cargar() {
    setError(null)
    try {
      const [r, a, ac, ev] = await Promise.all([listarReuniones(), listarAspirantes(), listarActividadesGB(), listarEventos()])
      setReuniones(r); setAspirantes(a); setActividades(ac); setEventos(ev)
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  const anio = ref.getFullYear()
  const mes = ref.getMonth()
  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const hoy = aISO(new Date())
  const fechaDe = dia => aISO(new Date(anio, mes, dia))

  function delDia(f) {
    return {
      reuniones: reuniones.filter(r => r.fecha === f),
      llamadas: aspirantes.filter(a => a.proxima_accion === f && (a.estado === 'contactado' || a.estado === 'en_seguimiento')),
      actividades: actividades.filter(a => a.fecha === f),
      eventos: eventos.filter(e => e.fecha === f),
    }
  }

  function marcas(f) {
    const d = delDia(f)
    return [
      ...d.reuniones.map(r => r.ambito === 'GB' ? COLOR.gb : COLOR.otra),
      ...d.llamadas.map(() => COLOR.llamada),
      ...d.actividades.map(() => COLOR.actividad),
      ...d.eventos.map(() => COLOR.evento),
    ].slice(0, 5)
  }

  async function agregarEvento() {
    if (!nuevoEvento.trim() || !diaSel) return
    try {
      await crearEvento({ fecha: fechaDe(diaSel), titulo: nuevoEvento.trim(), tipo: 'recordatorio' })
      setNuevoEvento('')
      await cargar()
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function borrarEvento(id) {
    try { await eliminarEvento(id); await cargar() } catch (e) { alert('Error: ' + e.message) }
  }

  function cambiarMes(delta) { setRef(new Date(anio, mes + delta, 1)); setDiaSel(null) }

  if (cargando) return <div className="cargando">Cargando calendario…</div>
  if (error) return <div className="estado-error"><p>No se pudo cargar el calendario.</p><p className="estado-error-detalle">{error}</p><button className="btn-secundario" onClick={cargar}>Reintentar</button></div>

  const fSel = diaSel ? fechaDe(diaSel) : null
  const d = fSel ? delDia(fSel) : null
  const nombreMes = MESES[mes][0].toUpperCase() + MESES[mes].slice(1)

  return (
    <div>
      <div className="topbar">
        <div className="topbar-titulo">Calendario</div>
        <button className="btn-chico primario" onClick={() => ir('reuniones', { nueva: true, fecha: fSel })}>+ Programar reunión</button>
      </div>

      <div className="cal-cont">
        <div className="cal-nav">
          <button onClick={() => cambiarMes(-1)}>‹</button>
          <span>{nombreMes} {anio}</span>
          <button onClick={() => cambiarMes(1)}>›</button>
        </div>

        <div className="cal-dias-semana">
          {DIAS.map((x, i) => <div key={i} className="cal-dia-semana">{x}</div>)}
        </div>

        <div className="cal-grid">
          {Array.from({ length: primerDia }).map((_, i) => <div key={'v' + i} className="cal-celda vacia" />)}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1
            const f = fechaDe(dia)
            const sel = diaSel === dia
            return (
              <div key={dia} className={`cal-celda ${f === hoy ? 'hoy' : ''} ${sel ? 'sel' : ''}`} onClick={() => setDiaSel(sel ? null : dia)}>
                <span className="cal-num">{dia}</span>
                <div className="cal-puntos">
                  {marcas(f).map((c, j) => <span key={j} className="cal-punto" style={{ background: c }} />)}
                </div>
              </div>
            )
          })}
        </div>

        <div className="cal-leyenda">
          <span><i style={{ background: COLOR.gb }} /> Reunión GB</span>
          <span><i style={{ background: COLOR.otra }} /> Otra reunión</span>
          <span><i style={{ background: COLOR.llamada }} /> Llamada a aspirante</span>
          <span><i style={{ background: COLOR.actividad }} /> Actividad</span>
          <span><i style={{ background: COLOR.evento }} /> Recordatorio</span>
        </div>
      </div>

      {diaSel && (
        <div className="cal-dia-panel">
          <div className="cal-dia-titulo">{diaSel} de {MESES[mes]}</div>

          {d.reuniones.length > 0 && (
            <div className="cal-dia-grupo">
              <div className="cal-dia-label">Reuniones</div>
              {d.reuniones.map(r => (
                <div key={r.id} className="cal-dia-item clic" onClick={() => ir('reuniones', { id: r.id })}>
                  · {r.ambito} {horaTexto(r.hora)} — {r.discusion_tema || 'sin tema'}{' '}
                  <span className={`badge ${ESTADO_REUNION_META[estadoReunion(r)].clase}`}>{ESTADO_REUNION_META[estadoReunion(r)].label}</span>
                </div>
              ))}
            </div>
          )}

          {d.llamadas.length > 0 && (
            <div className="cal-dia-grupo">
              <div className="cal-dia-label">Llamar a</div>
              {d.llamadas.map(a => (
                <div key={a.id} className="cal-dia-item clic" onClick={() => ir('aspirantes', a.id)}>· {a.nombre} {a.telefono ? `(${a.telefono})` : ''}</div>
              ))}
            </div>
          )}

          {d.actividades.length > 0 && (
            <div className="cal-dia-grupo">
              <div className="cal-dia-label">Actividades</div>
              {d.actividades.map(a => <div key={a.id} className="cal-dia-item">· {a.titulo}</div>)}
            </div>
          )}

          {d.eventos.length > 0 && (
            <div className="cal-dia-grupo">
              <div className="cal-dia-label">Recordatorios</div>
              {d.eventos.map(e => (
                <div key={e.id} className="cal-dia-item con-borrar">
                  · {e.titulo}
                  <button onClick={() => borrarEvento(e.id)}>✕</button>
                </div>
              ))}
            </div>
          )}

          <button className="btn-chico primario" style={{ width: '100%', marginBottom: 10 }}
                  onClick={() => ir('reuniones', { nueva: true, fecha: fSel })}>
            + Programar reunión este día
          </button>

          <div className="cal-agregar">
            <input type="text" placeholder="Agregar recordatorio…" value={nuevoEvento}
                   onChange={e => setNuevoEvento(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && agregarEvento()} />
            <button className="btn-chico" onClick={agregarEvento}>Agregar</button>
          </div>
        </div>
      )}
    </div>
  )
}
