/**
 * Dashboard.jsx
 * ───────────────────────────────────────────────────────────────
 * Vista de inicio: indicadores de cobranza del mes en curso y
 * la lista de militantes que requieren atención.
 */

import { useState, useEffect } from 'react'
import { listarMilitantes } from '../lib/militantes.js'
import { listarPagos, periodoActual } from '../lib/pagos.js'
import { estadoCuota, ESTADO_META, calcularCobranza } from '../lib/remisiones.js'
import { hexToRgba, iniciales } from '../lib/colores.js'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX')

export default function Dashboard({ onIrAMilitantes }) {
  const [militantes, setMilitantes] = useState([])
  const [pagos, setPagos]           = useState([])
  const [cargando, setCargando]     = useState(true)

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
