/**
 * Calendario.jsx
 * ───────────────────────────────────────────────────────────────
 * Vista mensual: muestra vencimientos de cuota, pagos recibidos y
 * eventos manuales. Al tocar un día se ven sus eventos y se puede
 * agregar un evento manual.
 */

import { useState, useEffect } from 'react'
import { listarMilitantes } from '../lib/militantes.js'
import { listarPagos } from '../lib/pagos.js'
import { listarEventos, crearEvento, eliminarEvento } from '../lib/remisiones.js'

const DIAS = ['D','L','M','M','J','V','S']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Calendario() {
  const [ref, setRef]             = useState(new Date())
  const [militantes, setMilitantes] = useState([])
  const [pagos, setPagos]         = useState([])
  const [eventos, setEventos]     = useState([])
  const [cargando, setCargando]   = useState(true)
  const [diaSel, setDiaSel]       = useState(null)
  const [nuevoEvento, setNuevoEvento] = useState('')

  async function cargar() {
    setCargando(true)
    try {
      const [m, p, ev] = await Promise.all([listarMilitantes(), listarPagos(), listarEventos()])
      setMilitantes(m); setPagos(p); setEventos(ev)
    } finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  const anio = ref.getFullYear()
  const mes = ref.getMonth()
  const periodo = `${anio}-${String(mes + 1).padStart(2, '0')}`
  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const hoy = new Date()

  // Marcas por día
  function marcasDelDia(dia) {
    const marcas = []
    // Vencimientos de cuota (día de pago de cada militante)
    militantes.forEach(m => {
      if (parseInt(m.cuota_dia, 10) === dia) marcas.push('cuota')
    })
    // Pagos recibidos ese día
    const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (pagos.some(p => p.fecha_pago === fechaStr)) marcas.push('pago')
    // Eventos manuales
    if (eventos.some(e => e.fecha === fechaStr)) marcas.push('evento')
    return marcas
  }

  const COLOR_MARCA = { cuota: '#B22222', pago: '#3DAF7D', evento: '#9B59B6' }

  function fechaDelDia(dia) {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  async function agregarEvento() {
    if (!nuevoEvento.trim() || !diaSel) return
    try {
      await crearEvento({ fecha: fechaDelDia(diaSel), titulo: nuevoEvento.trim(), tipo: 'recordatorio' })
      setNuevoEvento('')
      await cargar()
    } catch (e) { alert('Error: ' + e.message) }
  }

  async function borrarEvento(id) {
    try { await eliminarEvento(id); await cargar() } catch (e) { alert('Error: ' + e.message) }
  }

  function cambiarMes(delta) {
    setRef(new Date(anio, mes + delta, 1))
    setDiaSel(null)
  }

  if (cargando) return <div className="cargando">Cargando calendario…</div>

  // Datos del día seleccionado
  const fechaSel = diaSel ? fechaDelDia(diaSel) : null
  const eventosDia = fechaSel ? eventos.filter(e => e.fecha === fechaSel) : []
  const pagosDia = fechaSel ? pagos.filter(p => p.fecha_pago === fechaSel) : []
  const cuotasDia = fechaSel ? militantes.filter(m => parseInt(m.cuota_dia, 10) === diaSel) : []

  return (
    <div>
      <div className="topbar"><div className="topbar-titulo">Calendario</div></div>

      <div className="cal-cont">
        <div className="cal-nav">
          <button onClick={() => cambiarMes(-1)}>‹</button>
          <span>{MESES[mes]} {anio}</span>
          <button onClick={() => cambiarMes(1)}>›</button>
        </div>

        <div className="cal-dias-semana">
          {DIAS.map((d, i) => <div key={i} className="cal-dia-semana">{d}</div>)}
        </div>

        <div className="cal-grid">
          {Array.from({ length: primerDia }).map((_, i) => <div key={'v' + i} className="cal-celda vacia" />)}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1
            const marcas = marcasDelDia(dia)
            const esHoy = hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === anio
            const sel = diaSel === dia
            return (
              <div key={dia} className={`cal-celda ${esHoy ? 'hoy' : ''} ${sel ? 'sel' : ''}`}
                   onClick={() => setDiaSel(sel ? null : dia)}>
                <span className="cal-num">{dia}</span>
                <div className="cal-puntos">
                  {marcas.map((mk, j) => (
                    <span key={j} className="cal-punto" style={{ background: COLOR_MARCA[mk] }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="cal-leyenda">
          <span><i style={{ background: '#B22222' }} /> Vencimiento de cuota</span>
          <span><i style={{ background: '#3DAF7D' }} /> Pago recibido</span>
          <span><i style={{ background: '#9B59B6' }} /> Evento</span>
        </div>
      </div>

      {/* Panel del día */}
      {diaSel && (
        <div className="cal-dia-panel">
          <div className="cal-dia-titulo">{diaSel} de {MESES[mes]}</div>

          {cuotasDia.length > 0 && (
            <div className="cal-dia-grupo">
              <div className="cal-dia-label">Vencen cuota</div>
              {cuotasDia.map(m => <div key={m.id} className="cal-dia-item">· {m.nombre} (${m.cuota_monto})</div>)}
            </div>
          )}

          {pagosDia.length > 0 && (
            <div className="cal-dia-grupo">
              <div className="cal-dia-label">Pagos recibidos</div>
              {pagosDia.map(p => <div key={p.id} className="cal-dia-item">· ${p.monto} — {p.periodo_texto}</div>)}
            </div>
          )}

          {eventosDia.length > 0 && (
            <div className="cal-dia-grupo">
              <div className="cal-dia-label">Eventos</div>
              {eventosDia.map(e => (
                <div key={e.id} className="cal-dia-item con-borrar">
                  · {e.titulo}
                  <button onClick={() => borrarEvento(e.id)}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="cal-agregar">
            <input type="text" placeholder="Agregar evento o recordatorio…" value={nuevoEvento}
                   onChange={e => setNuevoEvento(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && agregarEvento()} />
            <button className="btn-chico primario" onClick={agregarEvento}>Agregar</button>
          </div>
        </div>
      )}
    </div>
  )
}
