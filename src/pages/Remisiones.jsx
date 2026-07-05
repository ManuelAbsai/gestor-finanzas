/**
 * Remisiones.jsx
 * ───────────────────────────────────────────────────────────────
 * Cierre mensual y remisiones al partido. Calcula lo recaudado
 * en el periodo, permite crear una remisión y generar su PDF.
 */

import { useState, useEffect } from 'react'
import { listarRemisiones, crearRemision, marcarRemisionEnviada, periodoActual } from '../lib/remisiones.js'
import { pagosDelPeriodo } from '../lib/pagos.js'
import { descargarComprobante } from '../lib/comprobante.js'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX')
const legible = p => { const [y,m] = p.split('-'); return `${MESES[parseInt(m,10)-1]} ${y}` }

export default function Remisiones() {
  const [remisiones, setRemisiones] = useState([])
  const [periodo, setPeriodo]       = useState(periodoActual())
  const [pagosPeriodo, setPagosPeriodo] = useState([])
  const [cargando, setCargando]     = useState(true)
  const [creando, setCreando]       = useState(false)
  const [toast, setToast]           = useState(null)

  async function cargar() {
    setCargando(true)
    try {
      const [rem, pg] = await Promise.all([listarRemisiones(), pagosDelPeriodo(periodo)])
      setRemisiones(rem)
      setPagosPeriodo(pg)
    } finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [periodo])

  function mostrar(msg, tipo = 'ok') { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2500) }

  const totalCuotas = pagosPeriodo.reduce((s, p) => s + Number(p.monto || 0), 0)
  const yaRemitido = remisiones
    .filter(r => r.periodo === periodo && r.estado === 'enviado')
    .reduce((s, r) => s + Number(r.total || 0), 0)

  async function crear() {
    setCreando(true)
    try {
      await crearRemision({
        fecha_remision: new Date().toISOString().slice(0, 10),
        periodo,
        monto_cuotas: totalCuotas,
        monto_otros: 0,
        total: totalCuotas,
        forma_envio: 'transferencia',
        estado: 'borrador',
      })
      await cargar()
      mostrar('Remisión creada como borrador')
    } catch (e) { mostrar('Error: ' + e.message, 'error') }
    finally { setCreando(false) }
  }

  async function generarPDF(rem) {
    try {
      const pagos = await pagosDelPeriodo(rem.periodo)
      descargarComprobante(rem, pagos)
      if (rem.estado === 'borrador') {
        await marcarRemisionEnviada(rem.id)
        await cargar()
      }
    } catch (e) { mostrar('Error al generar PDF: ' + e.message, 'error') }
  }

  if (cargando) return <div className="cargando">Cargando remisiones…</div>

  return (
    <div>
      <div className="topbar">
        <div className="topbar-titulo">Remisiones</div>
        <input type="month" className="selector-mes" value={periodo}
               onChange={e => setPeriodo(e.target.value)} />
      </div>

      {/* Cierre del periodo */}
      <div className="cierre-cont">
        <div className="cierre-titulo">Cierre — {legible(periodo)}</div>
        <div className="cierre-kpis">
          <div className="cierre-kpi">
            <div className="kpi-label">Cuotas cobradas</div>
            <div className="kpi-valor">{fmt(totalCuotas)}</div>
            <div className="kpi-sub">{pagosPeriodo.length} pago(s)</div>
          </div>
          <div className="cierre-kpi">
            <div className="kpi-label">Ya remitido</div>
            <div className="kpi-valor verde">{fmt(yaRemitido)}</div>
          </div>
          <div className="cierre-kpi">
            <div className="kpi-label">Pendiente de remitir</div>
            <div className="kpi-valor rojo">{fmt(totalCuotas - yaRemitido)}</div>
          </div>
        </div>
        <button className="btn-principal" onClick={crear} disabled={creando || totalCuotas === 0}>
          {creando ? 'Creando…' : 'Crear remisión de este periodo'}
        </button>
        {totalCuotas === 0 && <p className="nota-centrada">No hay cuotas cobradas en este periodo aún.</p>}
      </div>

      {/* Historial */}
      <div className="panel">
        <div className="panel-cabecera"><div className="panel-titulo">Historial de remisiones</div></div>
        <div className="panel-cuerpo sin-padding">
          {remisiones.length === 0
            ? <div className="vacio">Aún no hay remisiones.</div>
            : remisiones.map(r => (
                <div key={r.id} className="remision-fila">
                  <div className="remision-info">
                    <div className="remision-num">
                      Remisión #{String(r.numero).padStart(3, '0')}
                      <span className={`badge ${r.estado === 'enviado' ? 'verde' : 'ambar'}`}>
                        {r.estado === 'enviado' ? 'Enviada' : 'Borrador'}
                      </span>
                    </div>
                    <div className="remision-meta">{legible(r.periodo)} · {r.fecha_remision}</div>
                  </div>
                  <div className="remision-total">{fmt(r.total)}</div>
                  <button className="btn-chico primario" onClick={() => generarPDF(r)}>PDF</button>
                </div>
              ))
          }
        </div>
      </div>

      {toast && <div className={`toast ${toast.tipo}`}>{toast.msg}</div>}
    </div>
  )
}
