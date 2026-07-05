/**
 * FormPago.jsx
 * ───────────────────────────────────────────────────────────────
 * Registra un pago: meses que cubre (varios), monto, forma,
 * evidencia (imagen). Al guardar muestra el texto para WhatsApp
 * listo para copiar.
 */

import { useState } from 'react'
import { registrarPago, formatearMeses, textoWhatsApp } from '../lib/pagos.js'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Genera opciones: 2 meses atrás, actual, 2 adelante
function opcionesMeses() {
  const hoy = new Date()
  const ops = []
  for (let off = -2; off <= 2; off++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + off, 1)
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    ops.push({ valor, label: `${MESES[d.getMonth()]} ${d.getFullYear()}`, actual: off === 0 })
  }
  return ops
}

export default function FormPago({ militante, onGuardado, onCerrar }) {
  const ops = opcionesMeses()
  const [fecha, setFecha]       = useState(new Date().toISOString().slice(0, 10))
  const [meses, setMeses]       = useState([ops.find(o => o.actual).valor])
  const [monto, setMonto]       = useState(militante.cuota_monto || '')
  const [forma, setForma]       = useState('transferencia')
  const [notas, setNotas]       = useState('')
  const [archivo, setArchivo]   = useState(null)
  const [preview, setPreview]   = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]       = useState(null)
  const [textoFinal, setTextoFinal] = useState(null) // vista de confirmación
  const [copiado, setCopiado]   = useState(false)

  function toggleMes(valor) {
    setMeses(prev => prev.includes(valor) ? prev.filter(m => m !== valor) : [...prev, valor])
  }

  function onArchivo(e) {
    const file = e.target.files[0]
    if (!file) return
    setArchivo(file)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function guardar() {
    if (meses.length === 0) { setError('Marca al menos un mes.'); return }
    if (!monto) { setError('Ingresa el monto.'); return }
    setError(null)
    setGuardando(true)
    try {
      const mesesOrdenados = [...meses].sort()
      const periodoTexto = formatearMeses(mesesOrdenados)
      await registrarPago({
        militante_id: militante.id,
        fecha_pago: fecha,
        meses_cubre: mesesOrdenados,
        periodo_texto: periodoTexto,
        monto: Number(monto),
        forma_pago: forma,
        notas,
      }, archivo)

      // Preparar texto de WhatsApp
      setTextoFinal(textoWhatsApp(militante, Number(monto), periodoTexto))
    } catch (e) {
      setError('No se pudo guardar: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  function copiar() {
    navigator.clipboard.writeText(textoFinal).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1600)
    })
  }

  return (
    <div className="modal-fondo" style={{ zIndex: 500 }} onClick={onCerrar}>
      <div className="modal-hoja" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">
            {textoFinal ? 'Pago registrado' : `Pago — ${militante.nombre}`}
          </div>
          <button className="cerrar" onClick={textoFinal ? onGuardado : onCerrar}>✕</button>
        </div>

        {/* Vista de confirmación con texto para WhatsApp */}
        {textoFinal ? (
          <div className="modal-cuerpo">
            <div className="confirmacion-ok">✓ Pago registrado correctamente</div>
            <div className="campo">
              <label>Texto para WhatsApp</label>
              <div className="texto-whatsapp">{textoFinal}</div>
            </div>
            <button className="btn-copiar" onClick={copiar}>
              {copiado ? '✓ Copiado' : '📋 Copiar texto'}
            </button>
            <p className="nota-centrada">Pega este texto en WhatsApp junto con la captura.</p>
            <button className="btn-principal" onClick={onGuardado}>Listo</button>
          </div>
        ) : (
          <div className="modal-cuerpo">
            <div className="campo">
              <label>Fecha de pago *</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>

            <div className="campo">
              <label>Meses que cubre *</label>
              <div className="meses-checks">
                {ops.map(o => (
                  <label key={o.valor} className="mes-check">
                    <input type="checkbox" checked={meses.includes(o.valor)} onChange={() => toggleMes(o.valor)} />
                    {o.label}
                  </label>
                ))}
              </div>
              <div className="nota-inline">Marca varios si el pago cubre más de un mes.</div>
            </div>

            <div className="campo-fila">
              <div className="campo">
                <label>Monto recibido (total) *</label>
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
            </div>

            <div className="campo">
              <label>Captura de evidencia</label>
              <div className={`zona-subir ${archivo ? 'con-archivo' : ''}`}
                   onClick={() => document.getElementById('input-evidencia').click()}>
                {preview
                  ? <img src={preview} className="preview-evidencia" alt="evidencia" />
                  : <div className="zona-subir-texto">
                      <div className="zona-subir-icono">📎</div>
                      Toca para adjuntar la captura
                      <span>Descárgala de WhatsApp primero · JPG, PNG</span>
                    </div>
                }
              </div>
              <input id="input-evidencia" type="file" accept="image/*" style={{ display: 'none' }} onChange={onArchivo} />
              {archivo && (
                <div className="archivo-ok">
                  ✓ {archivo.name}
                  <button onClick={() => { setArchivo(null); setPreview(null) }}>Quitar</button>
                </div>
              )}
            </div>

            <div className="campo">
              <label>Notas (opcional)</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} />
            </div>

            {error && <div className="conexion-error">{error}</div>}

            <button className="btn-principal" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar pago'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
