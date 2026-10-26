/**
 * FormReunion.jsx
 * ───────────────────────────────────────────────────────────────
 * Programar una reunión nueva o editar su orden del día.
 *
 * Al programar una nueva, el borrador se arma solo:
 *   · puntos fijos de la plantilla (Ajustes)
 *   · acuerdos y tareas pendientes del acta anterior
 *   · opción de continuar el tema de discusión anterior
 */

import { useState, useEffect } from 'react'
import {
  AMBITOS, prepararNuevaReunion, pendientesParaOrden, puntoDesdeAcuerdo,
  crearReunion, guardarOrden,
} from '../lib/reuniones.js'
import { listarMateriales, guardarMaterial } from '../lib/materiales.js'
import { diaMes } from '../lib/fechas.js'
import PuntosEditor, { conClaves } from './PuntosEditor.jsx'

export default function FormReunion({ existente = null, fechaInicial = null, onGuardado, onCerrar }) {
  // existente = { reunion, puntos } cuando se edita
  const esEdicion = !!existente
  const [cargando, setCargando] = useState(true)
  const [datos, setDatos] = useState(null)
  const [puntos, setPuntos] = useState([])
  const [pendientes, setPendientes] = useState([])
  const [nuevos, setNuevos] = useState(0)
  const [temaAnterior, setTemaAnterior] = useState(null)
  const [materiales, setMateriales] = useState([])
  const [nuevoMaterial, setNuevoMaterial] = useState(null) // { titulo, archivo }
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const mats = await listarMateriales()
        setMateriales(mats)
        if (esEdicion) {
          const r = existente.reunion
          setDatos({ ...r, material_id: r.material_id || '' })
          setPuntos(conClaves(existente.puntos))
          setPendientes(await pendientesParaOrden(r.id))
        } else {
          const b = await prepararNuevaReunion(fechaInicial)
          setDatos({ ...b.datos, material_id: '' })
          // Los pendientes del acta anterior entran solos a la orden del día
          setPuntos(conClaves([...b.puntos, ...b.nuevos.map(puntoDesdeAcuerdo)]))
          setPendientes(b.pendientes)
          setNuevos(b.nuevos.length)
          setTemaAnterior(b.temaAnterior)
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  function set(campo, valor) { setDatos(prev => ({ ...prev, [campo]: valor })) }

  function continuarTema() {
    if (!temaAnterior) return
    setDatos(prev => ({
      ...prev,
      discusion_tema: temaAnterior.discusion_tema,
      discusion_expone: temaAnterior.discusion_expone,
      material_id: temaAnterior.material_id || '',
      discusion_continuacion: true,
    }))
  }

  const idsEnOrden = new Set(puntos.map(p => p.origen_id).filter(Boolean))
  const pendientesFuera = pendientes.filter(a => !idsEnOrden.has(a.id))

  function agregarPendiente(a) {
    setPuntos(prev => conClaves([...prev, puntoDesdeAcuerdo(a)]))
  }

  async function guardar() {
    if (!datos.fecha) return
    setGuardando(true)
    setError(null)
    try {
      let material_id = datos.material_id || null
      if (nuevoMaterial?.titulo?.trim()) {
        const m = await guardarMaterial({ titulo: nuevoMaterial.titulo, autor: nuevoMaterial.autor, tipo: 'texto' }, nuevoMaterial.archivo || null)
        material_id = m.id
      }
      const final = { ...datos, material_id }
      let reunion
      if (esEdicion) {
        await guardarOrden(datos.id, final, puntos)
        reunion = { ...datos, ...final }
      } else {
        reunion = await crearReunion(final, puntos)
      }
      onGuardado(reunion)
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-hoja ancha" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">{esEdicion ? 'Editar orden del día' : 'Programar reunión'}</div>
          <button className="cerrar" onClick={onCerrar}>✕</button>
        </div>

        {cargando || !datos ? <div className="cargando chico">Preparando borrador…</div> : (
          <div className="modal-cuerpo">
            {!esEdicion && (
              <div className="aviso-suave">
                El borrador ya trae los puntos fijos de tu plantilla
                {nuevos > 0 && <> y <strong>{nuevos} acuerdo(s) o tarea(s) nuevos</strong> del acta anterior</>}.
                Edita, quita o agrega lo que necesites.
              </div>
            )}

            <div className="campo-fila tres">
              <div className="campo">
                <label>Fecha *</label>
                <input type="date" value={datos.fecha} onChange={e => set('fecha', e.target.value)} />
              </div>
              <div className="campo">
                <label>Hora</label>
                <input type="time" value={datos.hora} onChange={e => set('hora', e.target.value)} />
              </div>
              <div className="campo">
                <label>Zona horaria</label>
                <input type="text" value={datos.zona_horaria} onChange={e => set('zona_horaria', e.target.value)} />
              </div>
            </div>

            <div className="campo-fila tres">
              <div className="campo">
                <label>Reunión</label>
                <select value={datos.ambito} onChange={e => set('ambito', e.target.value)}>
                  {AMBITOS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div className="campo">
                <label>Sesión</label>
                <select value={datos.sesion} onChange={e => set('sesion', e.target.value)}>
                  <option value="ordinaria">Ordinaria</option>
                  <option value="extraordinaria">Extraordinaria</option>
                </select>
              </div>
              <div className="campo">
                <label>Lugar (opcional)</label>
                <input type="text" value={datos.lugar || ''} placeholder="Presencial, en línea…" onChange={e => set('lugar', e.target.value)} />
              </div>
            </div>

            <div className="campo-fila">
              <div className="campo">
                <label>Mesa</label>
                <input type="text" value={datos.mesa || ''} placeholder="¿Quién modera?" onChange={e => set('mesa', e.target.value)} />
              </div>
              <div className="campo">
                <label>Actas</label>
                <input type="text" value={datos.actas_responsable || ''} placeholder="¿Quién redacta?" onChange={e => set('actas_responsable', e.target.value)} />
              </div>
            </div>

            {/* Discusión política */}
            <div className="bloque">
              <div className="bloque-titulo">
                Discusión política
                {temaAnterior && !esEdicion && (
                  <button type="button" className="btn-chico" onClick={continuarTema}>
                    ↻ Continuar tema del {diaMes(temaAnterior.fecha)}
                  </button>
                )}
              </div>
              <div className="campo">
                <label>Tema</label>
                <input type="text" value={datos.discusion_tema || ''} placeholder="Tema, artículo o libro a discutir"
                       onChange={e => set('discusion_tema', e.target.value)} />
              </div>
              <div className="campo-fila">
                <div className="campo">
                  <label>Expone</label>
                  <input type="text" value={datos.discusion_expone || ''} onChange={e => set('discusion_expone', e.target.value)} />
                </div>
                <div className="campo">
                  <label>Material de estudio</label>
                  <select value={nuevoMaterial ? '__nuevo' : (datos.material_id || '')}
                          onChange={e => {
                            if (e.target.value === '__nuevo') { setNuevoMaterial({ titulo: '', autor: '', archivo: null }); return }
                            setNuevoMaterial(null); set('material_id', e.target.value)
                          }}>
                    <option value="">— Sin material —</option>
                    {materiales.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                    <option value="__nuevo">+ Subir material nuevo…</option>
                  </select>
                </div>
              </div>
              {nuevoMaterial && (
                <div className="sub-bloque">
                  <div className="campo-fila">
                    <div className="campo">
                      <label>Título del material *</label>
                      <input type="text" value={nuevoMaterial.titulo} onChange={e => setNuevoMaterial({ ...nuevoMaterial, titulo: e.target.value })} />
                    </div>
                    <div className="campo">
                      <label>Autor</label>
                      <input type="text" value={nuevoMaterial.autor} onChange={e => setNuevoMaterial({ ...nuevoMaterial, autor: e.target.value })} />
                    </div>
                  </div>
                  <div className="campo">
                    <label>Archivo (PDF o Word)</label>
                    <input type="file" accept=".pdf,.doc,.docx,.odt,.txt,.epub"
                           onChange={e => setNuevoMaterial({ ...nuevoMaterial, archivo: e.target.files[0] || null })} />
                  </div>
                </div>
              )}
              <label className="check-linea">
                <input type="checkbox" checked={!!datos.discusion_continuacion}
                       onChange={e => set('discusion_continuacion', e.target.checked)} />
                Es continuación del tema anterior
              </label>
            </div>

            {/* Pendientes que aún no están en la orden */}
            {pendientesFuera.length > 0 && (
              <div className="bloque">
                <div className="bloque-titulo">Siguen pendientes de actas anteriores</div>
                {pendientesFuera.map(a => (
                  <div key={a.id} className="pendiente-fila">
                    <span className={`badge ${a.tipo === 'tarea' ? 'ambar' : 'verde'}`}>{a.tipo === 'tarea' ? 'Tarea' : 'Acuerdo'}</span>
                    <span className="pendiente-texto">
                      {a.texto}
                      <span className="pendiente-meta">
                        Acta del {diaMes(a.reunion?.fecha)}{a.yaLlevado && a.llevado ? ` · ya estuvo en la orden del ${diaMes(a.llevado.fecha)}` : ''}
                      </span>
                    </span>
                    <button type="button" className="btn-chico" onClick={() => agregarPendiente(a)}>+ Agregar</button>
                  </div>
                ))}
              </div>
            )}

            <div className="bloque">
              <div className="bloque-titulo">Puntos de la orden del día</div>
              <PuntosEditor puntos={puntos} onChange={setPuntos} />
            </div>

            {error && <div className="conexion-error">No se pudo guardar: {error}</div>}

            <button className="btn-principal" onClick={guardar} disabled={guardando || !datos.fecha}>
              {guardando ? 'Guardando…' : (esEdicion ? 'Guardar orden del día' : 'Programar reunión')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
