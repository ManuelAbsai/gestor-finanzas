/**
 * ReunionDetalle.jsx
 * ───────────────────────────────────────────────────────────────
 * Una reunión con sus dos caras en pestañas:
 *   · Orden del día — con botón para copiar a WhatsApp.
 *   · Acta — asistencia, puntos, acuerdos y tareas, archivo
 *     original, y botón para copiar a WhatsApp.
 */

import { useState, useEffect } from 'react'
import {
  obtenerReunion, eliminarReunion, cambiarEstadoAcuerdo, estadoReunion, ESTADO_REUNION_META,
  CATEGORIAS, ORIGEN_META, textoOrdenDelDia, textoActa,
} from '../lib/reuniones.js'
import { abrirDocumento, borrarDocumento, copiarTexto } from '../lib/archivos.js'
import { listarMilitantes } from '../lib/militantes.js'
import { fechaLarga, fechaDocumento, horaTexto, diaMes } from '../lib/fechas.js'
import FormReunion from './FormReunion.jsx'
import FormActa from './FormActa.jsx'

export default function ReunionDetalle({ reunionId, pestanaInicial = 'orden', abrirActa = false, onCerrar, onCambio }) {
  const [det, setDet] = useState(null)
  const [error, setError] = useState(null)
  const [pestana, setPestana] = useState(pestanaInicial)
  const [editandoOrden, setEditandoOrden] = useState(false)
  const [editandoActa, setEditandoActa] = useState(false)
  const [militantes, setMilitantes] = useState([])
  const [copiado, setCopiado] = useState(null)
  const [menu, setMenu] = useState(false)

  async function cargar() {
    try {
      const d = await obtenerReunion(reunionId)
      setDet(d)
      return d
    } catch (e) { setError(e.message) }
  }

  useEffect(() => {
    (async () => {
      const d = await cargar()
      if (abrirActa && d) await empezarActa()
    })()
  }, [reunionId])

  async function empezarActa() {
    if (militantes.length === 0) {
      try { setMilitantes(await listarMilitantes()) } catch { /* sin chips */ }
    }
    setPestana('acta')
    setEditandoActa(true)
  }

  async function copiar(tipo) {
    const texto = tipo === 'orden'
      ? textoOrdenDelDia(det.reunion, det.puntos)
      : textoActa(det.reunion, det.puntos, det.acuerdos)
    const ok = await copiarTexto(texto)
    setCopiado(ok ? tipo : 'error')
    setTimeout(() => setCopiado(null), 1800)
  }

  async function borrar() {
    setMenu(false)
    if (!confirm('¿Eliminar esta reunión con su orden del día, su acta y sus acuerdos? No se puede deshacer.')) return
    try {
      await eliminarReunion(det.reunion)
      await borrarDocumento(det.reunion.acta_archivo_path)
      onCambio?.()
      onCerrar()
    } catch (e) { alert('No se pudo eliminar: ' + e.message) }
  }

  async function toggleAcuerdo(a) {
    const nuevo = a.estado === 'cumplido' ? 'pendiente' : 'cumplido'
    try { await cambiarEstadoAcuerdo(a.id, nuevo); await cargar(); onCambio?.() }
    catch (e) { alert('Error: ' + e.message) }
  }

  if (error) {
    return (
      <div className="modal-fondo" onClick={onCerrar}>
        <div className="modal-centrado" onClick={e => e.stopPropagation()}>
          <div className="estado-error"><p>No se pudo abrir la reunión.</p><p className="estado-error-detalle">{error}</p></div>
        </div>
      </div>
    )
  }

  if (!det) {
    return (
      <div className="modal-fondo" onClick={onCerrar}>
        <div className="modal-centrado" onClick={e => e.stopPropagation()}><div className="cargando chico">Cargando…</div></div>
      </div>
    )
  }

  const r = det.reunion
  const est = estadoReunion(r)
  const meta = ESTADO_REUNION_META[est]

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-centrado ancho" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div>
            <div className="modal-titulo">
              <span className={`badge ${r.ambito === 'GB' ? 'rojo' : 'azul'}`} style={{ marginRight: 8 }}>{r.ambito}</span>
              {fechaDocumento(r.fecha)}
            </div>
            <div className="modal-subtitulo">
              {fechaLarga(r.fecha)} · {horaTexto(r.hora)} · {r.sesion === 'extraordinaria' ? 'Extraordinaria' : 'Ordinaria'}
              {' '}<span className={`badge ${meta.clase}`}>{meta.label}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ position: 'relative' }}>
              <button className="menu-punto" onClick={() => setMenu(v => !v)} title="Más opciones">⋮</button>
              {menu && (
                <div className="menu-desplegable" onMouseLeave={() => setMenu(false)}>
                  <button className="menu-item peligro" onClick={borrar}>🗑 Eliminar reunión</button>
                </div>
              )}
            </div>
            <button className="cerrar" onClick={onCerrar}>✕</button>
          </div>
        </div>

        <div className="pestanas">
          <button className={pestana === 'orden' ? 'activo' : ''} onClick={() => setPestana('orden')}>Orden del día</button>
          <button className={pestana === 'acta' ? 'activo' : ''} onClick={() => setPestana('acta')}>
            Acta {r.acta_lista ? '✓' : ''}
          </button>
        </div>

        {pestana === 'orden' && (
          <div className="modal-cuerpo">
            <Agenda r={r} puntos={det.puntos} mostrarOrigen />
            <div className="acciones-fila">
              <button className="btn-copiar" onClick={() => copiar('orden')}>
                {copiado === 'orden' ? '✓ Copiado' : '📋 Copiar orden del día'}
              </button>
              <button className="btn-chico" onClick={() => setEditandoOrden(true)}>✎ Editar orden del día</button>
            </div>
            {!r.acta_lista && est !== 'proxima' && (
              <button className="btn-principal" style={{ marginTop: 10 }} onClick={empezarActa}>Levantar acta de esta reunión</button>
            )}
          </div>
        )}

        {pestana === 'acta' && (
          <div className="modal-cuerpo">
            {!r.acta_lista ? (
              <div className="vacio-acta">
                <p>Esta reunión aún no tiene acta.</p>
                <button className="btn-principal" onClick={empezarActa}>Levantar acta</button>
              </div>
            ) : (
              <>
                {r.asistentes?.length > 0 && (
                  <div className="acta-seccion">
                    <div className="acta-seccion-titulo">Asistencia ({r.asistentes.length})</div>
                    <div className="acta-texto">{r.asistentes.join(', ')}</div>
                  </div>
                )}
                {r.acta_archivo_path && (
                  <button className="archivo-chip boton" onClick={() => abrirDocumento(r.acta_archivo_path).catch(e => alert(e.message))}>
                    📎 {r.acta_archivo_nombre || 'Acta adjunta'} <span>Abrir ›</span>
                  </button>
                )}
                <Agenda r={r} puntos={det.puntos} conResultado />

                <div className="acta-seccion">
                  <div className="acta-seccion-titulo verde">Acuerdos</div>
                  <ListaAcuerdos lista={det.acuerdos.filter(a => a.tipo === 'acuerdo')} onToggle={toggleAcuerdo} />
                </div>
                <div className="acta-seccion">
                  <div className="acta-seccion-titulo ambar">Tareas</div>
                  <ListaAcuerdos lista={det.acuerdos.filter(a => a.tipo === 'tarea')} onToggle={toggleAcuerdo} />
                </div>
                {r.acta_notas && (
                  <div className="acta-seccion">
                    <div className="acta-seccion-titulo">Notas</div>
                    <div className="acta-texto" style={{ whiteSpace: 'pre-wrap' }}>{r.acta_notas}</div>
                  </div>
                )}

                <div className="acta-seccion">
                  <div className="acta-seccion-titulo">Texto para WhatsApp</div>
                  <div className="texto-whatsapp">{textoActa(r, det.puntos, det.acuerdos)}</div>
                </div>
                <div className="acciones-fila">
                  <button className="btn-copiar" onClick={() => copiar('acta')}>
                    {copiado === 'acta' ? '✓ Copiado' : '📋 Copiar acta'}
                  </button>
                  <button className="btn-chico" onClick={empezarActa}>✎ Editar acta</button>
                </div>
              </>
            )}
          </div>
        )}
        {copiado === 'error' && <div className="toast error">No se pudo copiar</div>}
      </div>

      {editandoOrden && (
        <FormReunion
          existente={{ reunion: r, puntos: det.puntos }}
          onGuardado={async () => { setEditandoOrden(false); await cargar(); onCambio?.() }}
          onCerrar={() => setEditandoOrden(false)}
        />
      )}

      {editandoActa && (
        <FormActa
          detalle={det}
          militantes={militantes}
          onGuardado={async () => { setEditandoActa(false); await cargar(); setPestana('acta'); onCambio?.() }}
          onCerrar={() => setEditandoActa(false)}
        />
      )}
    </div>
  )
}

function Agenda({ r, puntos, mostrarOrigen = false, conResultado = false }) {
  return (
    <div className="agenda">
      {(r.mesa || r.actas_responsable) && (
        <div className="agenda-mesa">
          {r.mesa && <span>Mesa: <b>{r.mesa}</b></span>}
          {r.actas_responsable && <span>Actas: <b>{r.actas_responsable}</b></span>}
          {r.lugar && <span>Lugar: <b>{r.lugar}</b></span>}
        </div>
      )}
      <div className="acta-seccion">
        <div className="acta-seccion-titulo">Discusión política</div>
        {r.discusion_tema
          ? <div className="agenda-punto">
              <div className="agenda-punto-texto">
                {r.discusion_tema}{r.discusion_continuacion && <span className="badge gris" style={{ marginLeft: 6 }}>continuación</span>}
                {r.discusion_expone && <div className="agenda-punto-resp">{r.discusion_expone}</div>}
                {r.material && (
                  <button className="material-chip" onClick={() => r.material.archivo_path && abrirDocumento(r.material.archivo_path).catch(e => alert(e.message))}>
                    📄 {r.material.titulo}{r.material.archivo_path ? ' ›' : ''}
                  </button>
                )}
              </div>
            </div>
          : <div className="vacio-chico">Sin tema definido.</div>}
      </div>
      {CATEGORIAS.map(cat => {
        const lista = puntos.filter(p => p.categoria === cat.id)
        if (!lista.length) return null
        return (
          <div key={cat.id} className="acta-seccion">
            <div className="acta-seccion-titulo">{cat.label}</div>
            {lista.map(p => (
              <div key={p.id || p._k} className="agenda-punto">
                {mostrarOrigen && <span className="punto-origen" title={ORIGEN_META[p.origen]?.label} style={{ background: ORIGEN_META[p.origen]?.color }} />}
                <div className="agenda-punto-texto">
                  {p.texto}
                  {p.responsable && <div className="agenda-punto-resp">{p.responsable}</div>}
                  {conResultado && p.resultado && <div className="agenda-punto-resultado">↳ {p.resultado}</div>}
                </div>
              </div>
            ))}
          </div>
        )
      })}
      {mostrarOrigen && puntos.length > 0 && (
        <div className="leyenda-origen">
          {['fijo', 'acuerdo', 'tarea', 'manual'].filter(id => puntos.some(p => p.origen === id)).map(id => (
            <span key={id}><i style={{ background: ORIGEN_META[id].color }} />{ORIGEN_META[id].label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function ListaAcuerdos({ lista, onToggle }) {
  if (!lista.length) return <div className="vacio-chico">Ninguno.</div>
  return lista.map(a => (
    <div key={a.id} className={`acuerdo-item ${a.estado}`}>
      <button className={`check ${a.estado === 'cumplido' ? 'on' : ''}`} onClick={() => onToggle(a)}
              title={a.estado === 'cumplido' ? 'Marcar como pendiente' : 'Marcar como cumplido'}>
        {a.estado === 'cumplido' ? '✓' : ''}
      </button>
      <div className="acuerdo-item-texto">
        {a.texto}
        <div className="agenda-punto-resp">
          {[a.responsable, a.fecha_limite && `para el ${diaMes(a.fecha_limite)}`,
            a.estado === 'cumplido' ? 'cumplido' : (a.llevado_a_reunion_id ? 'en seguimiento' : 'pendiente')]
            .filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  ))
}
