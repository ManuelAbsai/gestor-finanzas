/**
 * Dashboard.jsx
 * ───────────────────────────────────────────────────────────────
 * Vista de inicio: indicadores de cobranza del mes en curso,
 * gráfica histórica de cobranza, y militantes que requieren
 * atención.
 */

import { useState, useEffect } from 'react'
import { listarMilitantes } from '../lib/militantes.js'
import { listarPagos, periodoActual } from '../lib/pagos.js'
import {
  estadoCuota, ESTADO_META, calcularCobranza,
  generarPeriodos, calcularCobranzaDelPeriodo, periodoLegible,
} from '../lib/remisiones.js'
import { hexToRgba, iniciales } from '../lib/colores.js'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX')
const RANGOS = [
  { label: '1 mes', valor: 1 },
  { label: '3 meses', valor: 3 },
  { label: '6 meses', valor: 6 },
  { label: '1 año', valor: 12 },
]

export default function Dashboard({ onIrAMilitantes }) {
  const [militantes, setMilitantes] = useState([])
  const [pagos, setPagos]           = useState([])
  const [cargando, setCargando]     = useState(true)
  const [rango, setRango]           = useState(6)
  const [mesInicio, setMesInicio]   = useState(periodoActual())

  useEffect(() => {
    (async () => {
      try {
        const [m, p] = await Promise.all([listarMilitantes(), listarPagos()])
        setMilitantes(m); setPagos(p)
      } finally { setCargando(false) }
    })()
  }, [])

  if (cargando) return <div className="cargando">Cargando panel…</div>

  const periodo = periodoActual()
  const idsPagaron = new Set(
    pagos.filter(p => (p.meses_cubre || []).includes(periodo)).map(p => p.militante_id)
  )

  const { totalEsperado, cobrado, porCobrar, pct } = calcularCobranza(militantes, idsPagaron)

  const conAtencion = militantes
    .map(m => ({ ...m, estado: estadoCuota(m, idsPagaron.has(m.id)) }))
    .filter(m => m.estado === 'vencido' || m.estado === 'por_vencer')
    .sort((a, b) => (a.estado === 'vencido' ? -1 : 1))

  const hoy = new Date().getDate()
  const claseCobranza = pct >= 80 ? 'verde' : pct >= 40 ? 'ambar' : 'rojo'

  // ── Últimos 24 periodos disponibles para el selector de mes ──
  const opcionesMes = generarPeriodos(24, periodo)

  // ── Datos de la gráfica histórica según rango + mes de inicio ──
  const periodosGrafica = generarPeriodos(rango, mesInicio)
  const datosHist = periodosGrafica.map(p => {
    const { pct: pctP } = calcularCobranzaDelPeriodo(militantes, pagos, p)
    return { periodo: p, pct: pctP }
  })
  const promedioHist = datosHist.length
    ? Math.round(datosHist.reduce((s, d) => s + d.pct, 0) / datosHist.length)
    : 0
  const mejorHist = datosHist.reduce((a, b) => (b.pct > (a?.pct ?? -1) ? b : a), null)
  const peorHist  = datosHist.reduce((a, b) => (b.pct < (a?.pct ?? 101) ? b : a), null)

  function colorBarra(p) {
    if (p >= 80) return '#3DAF7D'
    if (p >= 40) return '#C17D2A'
    return '#B22222'
  }

  return (
    <div>
      <div className="topbar"><div className="topbar-titulo">Inicio</div></div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Recaudado / mes</div>
          <div className="kpi-valor verde">{fmt(cobrado)}</div>
          <div className="kpi-sub">Cuotas cobradas este mes</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">% de cobranza</div>
          <div className={`kpi-valor ${claseCobranza}`}>{pct}%</div>
          <div className="kpi-sub">{fmt(cobrado)} de {fmt(totalEsperado)}</div>
        </div>
        <div className="kpi clic" onClick={onIrAMilitantes}>
          <div className="kpi-label">Requieren atención</div>
          <div className="kpi-valor ambar">{conAtencion.length}</div>
          <div className="kpi-sub">Vencidas + por vencer</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Por cobrar</div>
          <div className="kpi-valor rojo">{fmt(porCobrar)}</div>
          <div className="kpi-sub">Falta que paguen este mes</div>
        </div>
      </div>

      {/* Gráfica histórica de cobranza */}
      <div className="panel dash-panel">
        <div className="panel-cabecera">
          <div className="panel-titulo">Cobranza histórica</div>
          <select value={mesInicio} onChange={e => setMesInicio(e.target.value)} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4,
            padding: '5px 8px', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 11,
          }}>
            {opcionesMes.map(p => <option key={p} value={p}>{periodoLegible(p)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '12px 20px 0' }}>
          {RANGOS.map(r => (
            <button
              key={r.valor}
              onClick={() => setRango(r.valor)}
              className={`btn-chico ${rango === r.valor ? 'primario' : ''}`}
            >{r.label}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '14px 20px 0' }}>
          <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Promedio</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18 }}>{promedioHist}%</div>
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Mejor mes</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#3DAF7D' }}>
              {mejorHist ? `${mejorHist.pct}% (${periodoLegible(mejorHist.periodo)})` : '—'}
            </div>
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Más bajo</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--red-light)' }}>
              {peorHist ? `${peorHist.pct}% (${periodoLegible(peorHist.periodo)})` : '—'}
            </div>
          </div>
        </div>

        {/* Barras simples con CSS, sin librerías externas */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '20px 20px 16px', height: 160, overflowX: 'auto' }}>
          {datosHist.map(d => (
            <div key={d.periodo} title={`${periodoLegible(d.periodo)}: ${d.pct}%`} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              flex: datosHist.length <= 6 ? 1 : '0 0 34px', minWidth: 28,
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{d.pct}%</div>
              <div style={{
                width: '100%', maxWidth: 34, height: Math.max(4, d.pct * 1.1),
                background: colorBarra(d.pct), borderRadius: '3px 3px 0 0',
              }} />
              <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>
                {periodoLegible(d.periodo).split(' ')[0].slice(0, 3)}
                <br />{periodoLegible(d.periodo).split(' ')[1].slice(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requieren atención */}
      <div className="panel dash-panel">
        <div className="panel-cabecera">
          <div className="panel-titulo">⚠ Requieren atención</div>
          <button className="panel-accion" onClick={onIrAMilitantes}>Ver todos →</button>
        </div>
        <div className="panel-cuerpo sin-padding">
          {conAtencion.length === 0
            ? <div className="dash-todo-ok">Todo al corriente 🎉</div>
            : conAtencion.map(m => {
                const em = ESTADO_META[m.estado]
                const color = m.color_individual || '#5B8DD9'
                const detalle = m.estado === 'vencido'
                  ? `Venció el día ${m.cuota_dia} · ${hoy - m.cuota_dia} día(s) de retraso`
                  : `Vence el día ${m.cuota_dia} · en ${m.cuota_dia - hoy} día(s)`
                return (
                  <div key={m.id} className="dash-item">
                    <div className="avatar" style={{
                      width: 32, height: 32,
                      background: hexToRgba(color, 0.18), borderColor: color, color,
                    }}>{iniciales(m.nombre)}</div>
                    <div className="dash-item-info">
                      <div className="dash-item-nombre">{m.nombre}</div>
                      <div className="dash-item-meta">{detalle}</div>
                    </div>
                    <div className="dash-item-monto">
                      <div>{fmt(m.cuota_monto)}</div>
                      <span className={`badge ${em.clase}`}>{em.label}</span>
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>
    </div>
  )
}
