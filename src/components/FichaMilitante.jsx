/**
 * FichaMilitante.jsx
 * ───────────────────────────────────────────────────────────────
 * Perfil completo de un militante: datos de contacto y militancia,
 * botón para editar y para dar de baja. Su historial de pagos
 * (de cuando se llevaban finanzas) queda plegado como archivo.
 */

import { useState, useEffect } from 'react'
import { obtenerMilitante, labelCondicion, labelCategoria } from '../lib/militantes.js'
import { listarPagos } from '../lib/pagos.js'
import { hexToRgba, iniciales } from '../lib/colores.js'
import DetallePago from './DetallePago.jsx'

export default function FichaMilitante({ militanteId, etiquetas, fotoUrl, onCerrar, onEditar, onCambio, onBaja }) {
  const [m, setM]           = useState(null)
  const [pagos, setPagos]   = useState([])
  const [cargando, setCargando] = useState(true)
  const [detalle, setDetalle]   = useState(null)  // pago a ver
  const [verPagos, setVerPagos] = useState(false) // archivo de finanzas

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
          <button className="ficha-editar" onClick={() => onEditar({ ...m, _numPagos: pagos.length })}>✎ Editar</button>
          <button className="cerrar" onClick={onCerrar}>✕</button>
          {fotoUrl
            ? <div className="avatar grande" style={{ overflow: 'hidden', border: `3px solid ${color}` }}>
                <img src={fotoUrl} alt={m.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            : <div className="avatar grande" style={{
                background: hexToRgba(color, 0.18), borderColor: color, color,
              }}>
                {iniciales(m.nombre)}
              </div>
          }
          <div className="ficha-nombre">{m.nombre}</div>
          <div className="ficha-chips">
            {m.activo === false && <span className="badge rojo">Dado de baja</span>}
            <span className="mini-etiqueta cond">{labelCondicion(m.condicion)}</span>
            {m.categoria && <span className="mini-etiqueta cond">{labelCategoria(m.categoria)}</span>}
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
          {fila('Folio', m.folio)}
          {fila('Grupo base', m.grupo_base_nombre)}
          {fila('Papel en el GB', m.actividad_nombre)}
          {fila('Categoría', labelCategoria(m.categoria))}
          {fila('Responsable de seguimiento', m.responsable_nombre)}
          {fila('Ciudad', m.ciudad)}
          {fila('Estado', m.estado)}
          {fila('Fecha de alta', m.fecha_alta)}
          {fila('Referencia', m.referencia)}

          {m.notas && (
            <>
              <div className="ficha-seccion-titulo">Notas</div>
              <div className="ficha-notas">{m.notas}</div>
            </>
          )}

          {m.activo !== false && onBaja && (
            <button className="btn-secundario" onClick={() => onBaja(m)}>Dar de baja</button>
          )}

          <button className="plegable" onClick={() => setVerPagos(v => !v)}>
            <span>Finanzas (archivo) · {pagos.length} pago(s)</span>
            <span>{verPagos ? '▲' : '▼'}</span>
          </button>
          {verPagos && (pagos.length === 0
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
              )))
          }
        </div>
      </div>

      {detalle && (
        <DetallePago pago={detalle} militante={m} onCerrar={() => setDetalle(null)} onCambio={cargar} />
      )}
    </div>
  )
}
