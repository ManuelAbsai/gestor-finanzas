/**
 * Remisiones.jsx
 * ───────────────────────────────────────────────────────────────
 * Cierre mensual y remisiones al partido. El mes recién cerrado
 * se genera solo como borrador (vista previa); el PDF se descarga
 * solo cuando tú lo pides. Incluye también el historial interno
 * de quién pagó y quién no cada mes (con nombres, solo para ti).
 */

import { useState, useEffect, useRef } from 'react'
import {
  listarRemisiones, crearRemision, marcarRemisionEnviada,
  periodoActual, generarPeriodos, periodoLegible,
} from '../lib/remisiones.js'
import { pagosDelPeriodo } from '../lib/pagos.js'
import { listarMilitantes } from '../lib/militantes.js'
import { descargarComprobante } from '../lib/comprobante.js'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX')

export default function Remisiones() {
  const [remisiones, setRemisiones] = useState([])
  const [militantes, setMilitantes] = useState([])
  const [periodo, setPeriodo]       = useState(periodoActual())
  const [pagosPeriodo, setPagosPeriodo] = useState([])
  const [cargando, setCargando]     = useState(true)
  const [creando, setCreando]       = useState(false)
  const [toast, setToast]           = useState(null)
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const yaAutoGenero = useRef(false)

  async function cargar() {
    setCargando(true)
    try {
      const [rem, pg, mil] = await Promise.all([
        listarRemisiones(), pagosDelPeriodo(periodo), listarMilitantes(),
      ])
      setRemisiones(rem)
      setPagosPeriodo(pg)
      setMilitantes(mil)
      return rem
    } finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [periodo])

  // ── Generación automática del mes recién cerrado (una vez) ──
  useEffect(() => {
    if (yaAutoGenero.current) return
    yaAutoGenero.current = true
    ;(async () => {
      const [mesAnterior] = generarPeriodos(2, periodoActual())
      const rem = await listarRemisiones()
      const yaExiste = rem.some(r => r.periodo === mesAnterior)
      if (yaExiste) return
      const pagosMes = await pagosDelPeriodo(mesAnterior)
      const total = pagosMes.reduce((s, p) => s + Number(p.monto || 0), 0)
      if (total === 0) return // nada que remitir ese mes, no crear vacío
      await crearRemision({
        fecha_remision: new Date().toISOString().slice(0, 10),
        periodo: mesAnterior,
        monto_cuotas: total,
        monto_otros: 0,
        total,
        forma_envio: 'transferencia',
        estado: 'borrador',
      })
      await cargar()
    })()
  }, [])

  function mostrar(msg, tipo = 'ok') { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2500) }

  const totalCuotas = pagosPeriodo.reduce((s, p) => s + Number(p.monto || 0), 0)
  const yaRemitido = remisiones
    .filter(r => r.periodo === periodo && r.estado === 'enviado')
    .reduce((s, r) => s + Number(r.total || 0), 0)

  // ── Historial mensual interno: quién pagó, quién no (con nombres) ──
  const idsPagaronPeriodo = new Set(pagosPeriodo.map(p => p.militante_id))
  const conPago = militantes.filter(m => idsPagaronPeriodo.has(m.id))
  const sinPago = militantes.filter(m => !idsPagaronPeriodo.has(m.id))

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
      const [pagos, mil] = await Promise.all([pagosDelPeriodo(rem.periodo), listarMilitantes()])
      const idsPagaron = new Set(pagos.map(p => p.militante_id))
      const resumen = {
        totalMilitantes: mil.length,
        aportaron: mil.filter(m => idsPagaron.has(m.id)).length,
        noAportaron: mil.filter(m => !idsPagaron.has(m.id)).length,
      }
      descargarComprobante(rem, pagos, resumen)
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
        <div className="cierre-titulo">Cierre — {periodoLegible(periodo)}</div>
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

      {/* Historial mensual interno (con nombres, solo para ti) */}
      <div className="panel">
        <div className="panel-cabecera" style={{ cursor: 'pointer' }} onClick={() => setHistorialAbierto(v => !v)}>
          <div className="panel-titulo">Historial mensual interno — {periodoLegible(periodo)}</div>
          <span className="panel-accion">{historialAbierto ? '▲ ocultar' : '▼ ver quién pagó'}</span>
        </div>
        {historialAbierto && (
          <div className="panel-cuerpo sin-padding">
            {conPago.length === 0 && sinPago.length === 0
              ? <div className="vacio">No hay militantes activos.</div>
              : <>
                  {conPago.map(m => (
                    <div key={m.id} className="dash-item">
                      <span className="badge verde">✓</span>
                      <div className="dash-item-info"><div className="dash-item-nombre">{m.nombre}</div></div>
                      <div className="dash-item-monto">{fmt(m.cuota_monto)}</div>
                    </div>
                  ))}
                  {sinPago.map(m => (
                    <div key={m.id} className="dash-item">
                      <span className="badge rojo">✕</span>
                      <div className="dash-item-info"><div className="dash-item-nombre">{m.nombre}</div></div>
                      <div className="dash-item-monto">{fmt(m.cuota_monto)}</div>
                    </div>
                  ))}
                </>
            }
          </div>
        )}
      </div>

      {/* Historial de remisiones */}
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
                        {r.estado === 'enviado' ? 'Enviada' : 'Borrador (vista previa)'}
                      </span>
                    </div>
                    <div className="remision-meta">{periodoLegible(r.periodo)} · {r.fecha_remision}</div>
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
