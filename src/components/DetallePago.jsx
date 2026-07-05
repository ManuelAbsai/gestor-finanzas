/**
 * DetallePago.jsx
 * ───────────────────────────────────────────────────────────────
 * Muestra un pago del historial completo: monto, meses, forma,
 * evidencia (cargada bajo demanda desde Storage) y el texto para
 * WhatsApp con botón de copiar.
 */

import { useState, useEffect } from 'react'
import { urlEvidencia, textoWhatsApp } from '../lib/pagos.js'

export default function DetallePago({ pago, militante, onCerrar }) {
  const [urlImg, setUrlImg]   = useState(null)
  const [cargandoImg, setCargandoImg] = useState(!!pago.evidencia_path)
  const [copiado, setCopiado] = useState(false)

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

  return (
    <div className="modal-fondo" style={{ zIndex: 550 }} onClick={onCerrar}>
      <div className="modal-centrado angosto" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">Detalle del pago</div>
          <button className="cerrar" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal-cuerpo">
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
        </div>
      </div>
    </div>
  )
}
