/**
 * DetallePago.jsx
 * ───────────────────────────────────────────────────────────────
 * Muestra un pago del historial completo: monto, meses, forma,
 * evidencia (cargada bajo demanda desde Storage) y el texto para
 * WhatsApp con botón de copiar. Se puede corregir (monto, forma,
 * notas) o eliminar si se registró por error.
 */

import { useState, useEffect } from 'react'
import { urlEvidencia, textoWhatsApp, actualizarPago, eliminarPago, formatearMeses } from '../lib/pagos.js'

export default function DetallePago({ pago: pagoInicial, militante, onCerrar, onCambio }) {
  const [pago, setPago]       = useState(pagoInicial)
  const [urlImg, setUrlImg]   = useState(null)
  const [cargandoImg, setCargandoImg] = useState(!!pagoInicial.evidencia_path)
  const [copiado, setCopiado] = useState(false)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  // Campos editables
  const [monto, setMonto] = useState(pagoInicial.monto)
  const [forma, setForma] = useState(pagoInicial.forma_pago)
  const [notas, setNotas] = useState(pagoInicial.notas || '')

  useEffect(() => {
    let vivo = true
    if (pago.evidencia_path) {
      urlEvidencia(pago.evidencia_path).then(url => {
        if (vivo) { setUrlImg(url); setCargandoImg(false) }
      })
    }
    return () => { vivo = false }
  }, [pago.evidencia_path])

  const texto = textoWhatsApp(militante, pago.monto, pago.periodo_texto)

  function copiar() {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1600)
    })
  }

  async function guardarCorreccion() {
    setGuardando(true)
    try {
      const actualizado = await actualizarPago(pago.id, {
        monto: Number(monto),
        forma_pago: forma,
        notas,
      })
      setPago(actualizado)
      setEditando(false)
      onCambio?.()
    } catch (e) {
      alert('No se pudo guardar: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar() {
    if (!confirm(`¿Eliminar este pago de ${militante.nombre} (${pago.periodo_texto}, $${pago.monto})? No se puede deshacer.`)) return
    setEliminando(true)
    try {
      await eliminarPago(pago.id)
      onCambio?.()
      onCerrar()
    } catch (e) {
      alert('No se pudo eliminar: ' + e.message)
      setEliminando(false)
    }
  }

  return (
    <div className="modal-fondo" style={{ zIndex: 550 }} onClick={onCerrar}>
      <div className="modal-centrado angosto" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">{editando ? 'Corregir pago' : 'Detalle del pago'}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editando && (
              <button className="btn-chico" onClick={() => setEditando(true)} title="Corregir monto, forma o notas">
                ✎ Editar
              </button>
            )}
            <button className="cerrar" onClick={onCerrar}>✕</button>
          </div>
        </div>

        <div className="modal-cuerpo">
          {editando ? (
            <>
              <div className="detalle-encabezado">
                <div className="detalle-nombre">{militante.nombre}</div>
                <div className="detalle-meses">{pago.periodo_texto}</div>
              </div>

              <div className="campo">
                <label>Monto recibido (total)</label>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)} />
              </div>
              <div className="campo">
                <label>Forma de pago</label>
                <select value={forma} onChange={e => setForma(e.target.value)}>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="campo">
                <label>Notas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} />
              </div>
              <div className="nota-inline" style={{ marginBottom: 12 }}>
                Los meses que cubre y la evidencia no se pueden cambiar aquí — si te equivocaste en eso, elimina el pago y regístralo de nuevo.
              </div>

              <button className="btn-principal" onClick={guardarCorreccion} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar corrección'}
              </button>
              <button className="btn-secundario" onClick={() => setEditando(false)}>Cancelar</button>
            </>
          ) : (
            <>
              <div className="detalle-encabezado">
                <div className="detalle-monto">${pago.monto}</div>
                <div className="detalle-nombre">{militante.nombre}</div>
                <div className="detalle-meses">{pago.periodo_texto}</div>
              </div>

              <div className="ficha-fila"><span className="ficha-label">Fecha de pago</span><span className="ficha-valor">{pago.fecha_pago}</span></div>
              <div className="ficha-fila"><span className="ficha-label">Forma de pago</span><span className="ficha-valor">{pago.forma_pago}</span></div>
              <div className="ficha-fila"><span className="ficha-label">Grupo base</span><span className="ficha-valor">{militante.grupo_base_nombre || '—'}</span></div>
              {pago.notas && <div className="ficha-fila"><span className="ficha-label">Notas</span><span className="ficha-valor">{pago.notas}</span></div>}

              {/* Evidencia */}
              <div className="ficha-seccion-titulo">Evidencia</div>
              {!pago.evidencia_path
                ? <div className="evidencia-caja vacia">Sin evidencia adjunta</div>
                : cargandoImg
                  ? <div className="evidencia-caja">Cargando imagen…</div>
                  : urlImg
                    ? <img src={urlImg} className="evidencia-img" alt="evidencia del pago" />
                    : <div className="evidencia-caja">📎 Evidencia</div>
              }

              {/* Texto WhatsApp */}
              <div className="ficha-seccion-titulo">Texto para WhatsApp</div>
              <div className="texto-whatsapp">{texto}</div>
              <button className="btn-copiar" onClick={copiar}>
                {copiado ? '✓ Copiado' : '📋 Copiar texto'}
              </button>

              <button
                onClick={confirmarEliminar}
                disabled={eliminando}
                style={{ width: '100%', padding: 10, background: 'none', border: '1px solid var(--red)', borderRadius: 4, color: 'var(--red-light)', fontFamily: 'var(--sans)', fontSize: 12, cursor: 'pointer', marginTop: 8 }}
              >
                🗑 {eliminando ? 'Eliminando…' : 'Eliminar este pago'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
