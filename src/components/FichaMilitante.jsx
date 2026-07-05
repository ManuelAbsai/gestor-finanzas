/**
 * FichaMilitante.jsx
 * ───────────────────────────────────────────────────────────────
 * Perfil completo de un militante: datos, historial de pagos y
 * botón para editar. El registro de pago se abre desde aquí.
 */

import { useState, useEffect } from 'react'
import { obtenerMilitante, labelCondicion } from '../lib/militantes.js'
import { listarPagos, periodoActual } from '../lib/pagos.js'
import { estadoCuota, ESTADO_META } from '../lib/remisiones.js'
import { hexToRgba, iniciales } from '../lib/colores.js'
import DetallePago from './DetallePago.jsx'
import FormPago from './FormPago.jsx'

export default function FichaMilitante({ militanteId, etiquetas, onCerrar, onEditar, onCambio }) {
  const [m, setM]           = useState(null)
  const [pagos, setPagos]   = useState([])
  const [cargando, setCargando] = useState(true)
  const [detalle, setDetalle]   = useState(null)  // pago a ver
  const [pagando, setPagando]   = useState(false) // registrar pago

  async function cargar() {
    setCargando(true)
    try {
      const [mil, pg] = await Promise.all([
        obtenerMilitante(militanteId),
        listarPagos(militanteId),
      ])
      setM(mil)
      setPagos(pg)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [militanteId])

  if (cargando || !m) {
    return (
      <div className="modal-fondo" onClick={onCerrar}>
        <div className="modal-centrado" onClick={e => e.stopPropagation()}>
          <div className="cargando">Cargando…</div>
        </div>
      </div>
    )
  }

  const periodo = periodoActual()
  const pagadoEsteMes = pagos.some(p => (p.meses_cubre || []).includes(periodo))
  const estado = estadoCuota(m, pagadoEsteMes)
  const em = ESTADO_META[estado]
  const color = m.color_individual || '#5B8DD9'

  function fila(label, valor) {
    return (
      <div className="ficha-fila">
        <span className="ficha-label">{label}</span>
        <span className="ficha-valor">{valor || '—'}</span>
      </div>
    )
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-centrado" onClick={e => e.stopPropagation()}>

        {/* Cabecera con avatar */}
        <div className="ficha-cabecera">
          <button className="ficha-editar" onClick={() => onEditar(m)}>✎ Editar</button>
          <button className="cerrar" onClick={onCerrar}>✕</button>
          <div className="avatar grande" style={{
            background: hexToRgba(color, 0.18), borderColor: color, color,
          }}>
            {iniciales(m.nombre)}
          </div>
          <div className="ficha-nombre">{m.nombre}</div>
          <div className="ficha-chips">
            <span className="mini-etiqueta cond">{labelCondicion(m.condicion)}</span>
            {(m.etiquetas || []).map(eid => {
              const et = etiquetas.find(x => x.id === eid)
              if (!et) return null
              return (
                <span key={eid} className="mini-etiqueta" style={{
                  background: hexToRgba(et.color, 0.18), color: et.color,
                  borderColor: hexToRgba(et.color, 0.35),
                }}>{et.nombre}</span>
              )
            })}
          </div>
        </div>

        <div className="ficha-cuerpo">
          <div className="ficha-seccion-titulo">Contacto</div>
          {fila('Teléfono', m.telefono)}
          {fila('Correo', m.correo)}

          <div className="ficha-seccion-titulo">Militancia</div>
          {fila('Grupo base', m.grupo_base_nombre)}
          {fila('Fecha de alta', m.fecha_alta)}
          {fila('Referencia', m.referencia)}
          {fila('Actividad', m.actividad)}

          <div className="ficha-seccion-titulo">Cuota</div>
          <div className="ficha-cuota">
            <div>
              <div className="ficha-cuota-monto">${m.cuota_monto}</div>
              <div className="ficha-cuota-dia">Día {m.cuota_dia} de cada mes</div>
            </div>
            <span className={`badge ${em.clase}`}>{em.label}</span>
          </div>

          <div className="ficha-seccion-titulo">Historial de pagos</div>
          {pagos.length === 0
            ? <div className="ficha-vacio">Sin pagos registrados.</div>
            : pagos.map(p => (
                <div key={p.id} className="ficha-pago" onClick={() => setDetalle(p)}>
                  <div className="ficha-pago-info">
                    <div className="ficha-pago-periodo">{p.periodo_texto}</div>
                    <div className="ficha-pago-meta">{p.fecha_pago} · {p.forma_pago}</div>
                  </div>
                  <div className="ficha-pago-monto">${p.monto}</div>
                  <span className="ficha-pago-flecha">{p.evidencia_path ? '📎' : ''} ›</span>
                </div>
              ))
          }

          {m.notas && (
            <>
              <div className="ficha-seccion-titulo">Notas</div>
              <div className="ficha-notas">{m.notas}</div>
            </>
          )}

          {estado !== 'pagado' && (
            <button className="btn-principal" onClick={() => setPagando(true)}>
              Registrar pago
            </button>
          )}
        </div>
      </div>

      {detalle && (
        <DetallePago pago={detalle} militante={m} onCerrar={() => setDetalle(null)} />
      )}

      {pagando && (
        <FormPago
          militante={m}
          onGuardado={async () => { setPagando(false); await cargar(); onCambio?.() }}
          onCerrar={() => setPagando(false)}
        />
      )}
    </div>
  )
}
