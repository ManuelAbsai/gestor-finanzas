/**
 * FormActa.jsx
 * ───────────────────────────────────────────────────────────────
 * Levantar (o corregir) el acta de una reunión. Dos formas:
 *   · Escribirla aquí: parte de la orden del día ya cargada.
 *   · Subir el Word/PDF que alguien más levantó.
 * En ambas se capturan acuerdos y tareas, porque son los que
 * alimentan la siguiente orden del día.
 */

import { useState } from 'react'
import { guardarActa } from '../lib/reuniones.js'
import { subirDocumento, borrarDocumento } from '../lib/archivos.js'
import PuntosEditor, { conClaves, nuevaClave } from './PuntosEditor.jsx'

function primerNombre(nombre) {
  return (nombre || '').trim().split(/\s+/)[0] || ''
}

export default function FormActa({ detalle, militantes, onGuardado, onCerrar }) {
  const { reunion } = detalle
  const [modo, setModo] = useState(
    reunion.acta_lista && reunion.acta_archivo_path && detalle.puntos.every(p => !p.resultado) && !reunion.acta_notas
      ? 'archivo' : 'texto'
  )
  const [datos, setDatos] = useState({
    hora: reunion.hora, mesa: reunion.mesa || '', actas_responsable: reunion.actas_responsable || '',
    discusion_tema: reunion.discusion_tema || '', discusion_expone: reunion.discusion_expone || '',
    acta_notas: reunion.acta_notas || '',
  })
  const [asistentes, setAsistentes] = useState(reunion.asistentes || [])
  const [nuevoAsistente, setNuevoAsistente] = useState('')
  const [puntos, setPuntos] = useState(conClaves(detalle.puntos))
  const [acuerdos, setAcuerdos] = useState(conClaves(detalle.acuerdos))
  const [archivo, setArchivo] = useState(null)
  const [quitarArchivo, setQuitarArchivo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  function set(c, v) { setDatos(prev => ({ ...prev, [c]: v })) }

  // Chips de asistencia: primeros nombres del padrón + los que ya estén en el acta
  const sugeridos = [...new Set([
    ...militantes.map(m => primerNombre(m.nombre)).filter(Boolean),
    ...asistentes,
  ])].sort((a, b) => a.localeCompare(b, 'es'))

  function toggleAsistente(n) {
    setAsistentes(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }
  function agregarAsistente() {
    const n = nuevoAsistente.trim()
    if (n && !asistentes.includes(n)) setAsistentes(prev => [...prev, n])
    setNuevoAsistente('')
  }

  function setAcuerdo(k, campo, valor) {
    setAcuerdos(prev => prev.map(a => a._k === k ? { ...a, [campo]: valor } : a))
  }
  function agregarAcuerdo(tipo) {
    setAcuerdos(prev => [...prev, { _k: nuevaClave(), tipo, texto: '', responsable: '', fecha_limite: '' }])
  }

  const tieneArchivo = (reunion.acta_archivo_path && !quitarArchivo) || archivo

  async function guardar() {
    if (modo === 'archivo' && !tieneArchivo) { setError('Adjunta el archivo del acta o cambia a "Escribirla aquí".'); return }
    setGuardando(true)
    setError(null)
    try {
      let acta_archivo_path = quitarArchivo ? '' : (reunion.acta_archivo_path || '')
      let acta_archivo_nombre = quitarArchivo ? '' : (reunion.acta_archivo_nombre || '')
      if (archivo) {
        const sub = await subirDocumento(archivo, 'actas')
        if (reunion.acta_archivo_path) await borrarDocumento(reunion.acta_archivo_path)
        acta_archivo_path = sub.path
        acta_archivo_nombre = sub.nombre
      } else if (quitarArchivo && reunion.acta_archivo_path) {
        await borrarDocumento(reunion.acta_archivo_path)
      }
      await guardarActa(reunion.id, {
        ...datos, asistentes, acta_archivo_path, acta_archivo_nombre,
      }, puntos, acuerdos)
      onGuardado()
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <div className="modal-fondo" style={{ zIndex: 450 }} onClick={onCerrar}>
      <div className="modal-hoja ancha" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">{reunion.acta_lista ? 'Editar acta' : 'Levantar acta'}</div>
          <button className="cerrar" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal-cuerpo">
          <div className="selector-modo">
            <button type="button" className={modo === 'texto' ? 'activo' : ''} onClick={() => setModo('texto')}>✎ Escribirla aquí</button>
            <button type="button" className={modo === 'archivo' ? 'activo' : ''} onClick={() => setModo('archivo')}>📎 Subir Word / PDF</button>
          </div>

          {/* Asistencia */}
          <div className="bloque">
            <div className="bloque-titulo">Asistencia <span className="contador">{asistentes.length}</span></div>
            <div className="chips">
              {sugeridos.map(n => (
                <button key={n} type="button" className={`chip ${asistentes.includes(n) ? 'sel' : ''}`} onClick={() => toggleAsistente(n)}>
                  {asistentes.includes(n) ? '✓ ' : ''}{n}
                </button>
              ))}
            </div>
            <div className="crear-inline">
              <input type="text" placeholder="Agregar otro nombre…" value={nuevoAsistente}
                     onChange={e => setNuevoAsistente(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarAsistente())} />
              <button type="button" className="btn-chico" onClick={agregarAsistente}>+ Agregar</button>
            </div>
          </div>

          <div className="campo-fila tres">
            <div className="campo"><label>Hora real</label><input type="time" value={datos.hora} onChange={e => set('hora', e.target.value)} /></div>
            <div className="campo"><label>Mesa</label><input type="text" value={datos.mesa} onChange={e => set('mesa', e.target.value)} /></div>
            <div className="campo"><label>Actas</label><input type="text" value={datos.actas_responsable} onChange={e => set('actas_responsable', e.target.value)} /></div>
          </div>

          {/* Archivo */}
          {(modo === 'archivo' || tieneArchivo) && (
            <div className="bloque">
              <div className="bloque-titulo">Archivo del acta {modo === 'texto' && <span className="nota-inline">(opcional)</span>}</div>
              {reunion.acta_archivo_path && !quitarArchivo && !archivo && (
                <div className="archivo-chip">
                  📎 {reunion.acta_archivo_nombre || 'Acta adjunta'}
                  <button type="button" onClick={() => setQuitarArchivo(true)}>Quitar</button>
                </div>
              )}
              {archivo && (
                <div className="archivo-chip">
                  📎 {archivo.name}
                  <button type="button" onClick={() => setArchivo(null)}>Quitar</button>
                </div>
              )}
              {!archivo && (!reunion.acta_archivo_path || quitarArchivo) && (
                <input type="file" accept=".pdf,.doc,.docx,.odt" onChange={e => setArchivo(e.target.files[0] || null)} />
              )}
            </div>
          )}
          {modo === 'texto' && !tieneArchivo && (
            <button type="button" className="enlace-chico" onClick={() => setModo('archivo')}>+ Adjuntar también el Word/PDF</button>
          )}

          {modo === 'texto' && (
            <>
              <div className="bloque">
                <div className="bloque-titulo">Discusión política</div>
                <div className="campo-fila">
                  <div className="campo"><label>Tema</label><input type="text" value={datos.discusion_tema} onChange={e => set('discusion_tema', e.target.value)} /></div>
                  <div className="campo"><label>Expuso</label><input type="text" value={datos.discusion_expone} onChange={e => set('discusion_expone', e.target.value)} /></div>
                </div>
              </div>

              <div className="bloque">
                <div className="bloque-titulo">Puntos tratados</div>
                <p className="panel-desc">Vienen de la orden del día. Ajusta si cambió algo en la reunión y, si quieres, anota qué se informó en cada punto.</p>
                <PuntosEditor puntos={puntos} onChange={setPuntos} conResultado />
              </div>
            </>
          )}

          {/* Acuerdos y tareas */}
          <div className="bloque">
            <div className="bloque-titulo">Acuerdos y tareas</div>
            <p className="panel-desc">Lo que quede pendiente aparecerá solo en la siguiente orden del día.</p>
            {acuerdos.length === 0 && <div className="vacio-chico">Sin acuerdos ni tareas todavía.</div>}
            {acuerdos.map(a => (
              <div key={a._k} className={`acuerdo-editor ${a.tipo}`}>
                <div className="acuerdo-editor-fila">
                  <select value={a.tipo} onChange={e => setAcuerdo(a._k, 'tipo', e.target.value)}>
                    <option value="acuerdo">Acuerdo</option>
                    <option value="tarea">Tarea</option>
                  </select>
                  <button type="button" className="punto-btn peligro" onClick={() => setAcuerdos(prev => prev.filter(x => x._k !== a._k))}>✕</button>
                </div>
                <textarea rows={2} value={a.texto} placeholder={a.tipo === 'tarea' ? 'Qué se va a hacer…' : 'Qué se acordó…'}
                          onChange={e => setAcuerdo(a._k, 'texto', e.target.value)} />
                <div className="acuerdo-editor-fila">
                  <input type="text" value={a.responsable || ''} placeholder="Responsable (opcional)"
                         onChange={e => setAcuerdo(a._k, 'responsable', e.target.value)} />
                  {a.tipo === 'tarea' && (
                    <input type="date" value={a.fecha_limite || ''} title="Fecha límite (opcional)"
                           onChange={e => setAcuerdo(a._k, 'fecha_limite', e.target.value)} />
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn-chico" onClick={() => agregarAcuerdo('acuerdo')}>+ Acuerdo</button>
              <button type="button" className="btn-chico" onClick={() => agregarAcuerdo('tarea')}>+ Tarea</button>
            </div>
          </div>

          {modo === 'texto' && (
            <div className="campo">
              <label>Notas generales (opcional)</label>
              <textarea rows={3} value={datos.acta_notas} onChange={e => set('acta_notas', e.target.value)} />
            </div>
          )}

          {error && <div className="conexion-error">{error}</div>}

          <button className="btn-principal" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar acta'}
          </button>
        </div>
      </div>
    </div>
  )
}
