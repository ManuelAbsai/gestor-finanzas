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
import { pagosDelPeriodo, listarPagos } from '../lib/pagos.js'
import { listarMilitantes } from '../lib/militantes.js'
import { descargarComprobante } from '../lib/comprobante.js'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX')
const RANGOS_CONCENTRADO = [
  { label: '3 meses', valor: 3 },
  { label: '6 meses', valor: 6 },
  { label: '12 meses', valor: 12 },
]

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

  // ── Concentrado mensual (matriz militante × mes) ──
  const [concentradoAbierto, setConcentradoAbierto] = useState(false)
  const [rangoConcentrado, setRangoConcentrado]     = useState(6)
  const [mesFinConcentrado, setMesFinConcentrado]   = useState(periodoActual())
  const [incluirBajas, setIncluirBajas]             = useState(false)
  const [todosMilitantes, setTodosMilitantes]       = useState([]) // activos + inactivos
  const [todosPagos, setTodosPagos]                 = useState([]) // historial completo

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

  // Cargar los datos completos (todos los militantes + todo el historial
  // de pagos) solo la primera vez que se abre el concentrado.
  const yaCargoConcentrado = useRef(false)
  useEffect(() => {
    if (!concentradoAbierto || yaCargoConcentrado.current) return
    yaCargoConcentrado.current = true
    ;(async () => {
      const [mil, pg] = await Promise.all([
        listarMilitantes({ incluirInactivos: true }),
        listarPagos(),
      ])
      setTodosMilitantes(mil)
      setTodosPagos(pg)
    })()
  }, [concentradoAbierto])

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

  // ── Cálculo del concentrado mensual ──
  const periodosConcentrado = generarPeriodos(rangoConcentrado, mesFinConcentrado)

  // Reparte el monto de cada pago entre los meses que cubre (por si un
  // pago cubrió varios meses de un jalón), para que los totales por
  // columna cuadren.
  const montoPorMilitantePeriodo = {} // "militanteId|periodo" -> monto
  todosPagos.forEach(p => {
    const meses = p.meses_cubre || []
    if (meses.length === 0) return
    const porMes = Number(p.monto || 0) / meses.length
    meses.forEach(mes => {
      const clave = `${p.militante_id}|${mes}`
      montoPorMilitantePeriodo[clave] = (montoPorMilitantePeriodo[clave] || 0) + porMes
    })
  })

  const activosConcentrado = todosMilitantes.filter(m => m.activo !== false)
  const bajasConActividad = incluirBajas
    ? todosMilitantes.filter(m => m.activo === false && periodosConcentrado.some(
        p => montoPorMilitantePeriodo[`${m.id}|${p}`] > 0
      ))
    : []
  const filasConcentrado = [...activosConcentrado, ...bajasConActividad]

  const totalesPorPeriodo = {}
  periodosConcentrado.forEach(p => {
    totalesPorPeriodo[p] = filasConcentrado.reduce(
      (s, m) => s + (montoPorMilitantePeriodo[`${m.id}|${p}`] || 0), 0
    )
  })

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

      {/* Concentrado mensual (matriz militante × mes) */}
      <div className="panel">
        <div className="panel-cabecera" style={{ cursor: 'pointer' }} onClick={() => setConcentradoAbierto(v => !v)}>
          <div className="panel-titulo">Concentrado mensual</div>
          <span className="panel-accion">{concentradoAbierto ? '▲ ocultar' : '▼ ver tabla'}</span>
        </div>
        {concentradoAbierto && (
          <div className="panel-cuerpo">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              {RANGOS_CONCENTRADO.map(r => (
                <button
                  key={r.valor}
                  className={`btn-chico ${rangoConcentrado === r.valor ? 'primario' : ''}`}
                  onClick={() => setRangoConcentrado(r.valor)}
                >{r.label}</button>
              ))}
              <select value={mesFinConcentrado} onChange={e => setMesFinConcentrado(e.target.value)} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4,
                padding: '5px 8px', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 11,
              }}>
                {generarPeriodos(24, periodoActual()).map(p => (
                  <option key={p} value={p}>hasta {periodoLegible(p)}</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
                <input type="checkbox" checked={incluirBajas} onChange={e => setIncluirBajas(e.target.checked)} />
                Incluir dados de baja
              </label>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, background: 'var(--surface)', minWidth: 130 }}>
                      Militante
                    </th>
                    {periodosConcentrado.map(p => (
                      <th key={p} style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {periodoLegible(p).split(' ')[0].slice(0, 3)} {periodoLegible(p).split(' ')[1].slice(2)}
                      </th>
                    ))}
                    <th style={{ textAlign: 'right', padding: '6px 10px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filasConcentrado.length === 0
                    ? <tr><td colSpan={periodosConcentrado.length + 2} style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--muted)' }}>Sin militantes que mostrar.</td></tr>
                    : filasConcentrado.map(m => {
                        const totalFila = periodosConcentrado.reduce(
                          (s, p) => s + (montoPorMilitantePeriodo[`${m.id}|${p}`] || 0), 0
                        )
                        const esBaja = m.activo === false
                        return (
                          <tr key={m.id} style={{ opacity: esBaja ? 0.55 : 1 }}>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, background: 'var(--surface)', whiteSpace: 'nowrap' }}>
                              {m.nombre}{esBaja ? ' (baja)' : ''}
                            </td>
                            {periodosConcentrado.map(p => {
                              const val = montoPorMilitantePeriodo[`${m.id}|${p}`]
                              return (
                                <td key={p} style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--mono)' }}>
                                  {val ? fmt(Math.round(val)) : '—'}
                                </td>
                              )
                            })}
                            <td style={{ textAlign: 'right', padding: '6px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                              {fmt(Math.round(totalFila))}
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
                {filasConcentrado.length > 0 && (
                  <tfoot>
                    <tr>
                      <td style={{ padding: '8px 10px', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--surface)' }}>Total mes</td>
                      {periodosConcentrado.map(p => (
                        <td key={p} style={{ textAlign: 'right', padding: '8px', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green)' }}>
                          {fmt(Math.round(totalesPorPeriodo[p] || 0))}
                        </td>
                      ))}
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
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
