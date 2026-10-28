/**
 * Aspirantes.jsx
 * ───────────────────────────────────────────────────────────────
 * Seguimiento de nuevo ingreso: lista con estados, ficha con el
 * historial de llamadas, registro de contacto con fecha de la
 * siguiente llamada, y conversión a militante.
 * v2.1: etiqueta de origen (Facebook, Instagram, TikTok, Web,
 * Referido), motivo de descarte, resumen mensual y Excel.
 */

import { useState, useEffect } from 'react'
import {
  listarAspirantes, guardarAspirante, eliminarAspirante, cambiarEstadoAspirante,
  registrarContacto, eliminarContacto, convertirEnMilitante,
  ESTADOS_ASPIRANTE, MEDIOS_CONTACTO, CANALES, MOTIVOS_DESCARTE,
  metaEstadoAspirante, metaCanal, textoCanal, labelMedio, fechaIngreso,
  resumenAspirantes, efectividadPorCanal, textoResumenAspirantes, exportarAspirantesExcel,
} from '../lib/aspirantes.js'
import { listarGruposBase } from '../lib/catalogos.js'
import { listarMilitantes } from '../lib/militantes.js'
import { leerMensajeContacto, telefonoClave, OCUPACIONES } from '../lib/lectorContacto.js'
import { copiarTexto } from '../lib/archivos.js'
import { hoyISO, diaMes, sumarDias, mesActual, mesLegible, ultimosMeses } from '../lib/fechas.js'

/** Pastilla de color con el origen del contacto. */
export function EtiquetaCanal({ a }) {
  const c = metaCanal(a.canal)
  const texto = textoCanal(a)
  if (!texto) return null
  return (
    <span className="canal-tag" style={c ? { color: c.color, borderColor: c.color } : undefined}>{texto}</span>
  )
}

/** Selector de motivo de descarte (chips + texto si es "Otro"). */
function SelectorMotivo({ valor, onChange }) {
  const esOtro = valor && !MOTIVOS_DESCARTE.includes(valor)
  const base = esOtro ? 'Otro' : valor
  return (
    <>
      <div className="chips">
        {MOTIVOS_DESCARTE.map(m => (
          <button type="button" key={m} className={`chip ${base === m ? 'sel' : ''}`} onClick={() => onChange(m)}>{m}</button>
        ))}
      </div>
      {base === 'Otro' && (
        <input type="text" className="input-suelto" placeholder="¿Cuál? (opcional)" value={esOtro ? valor.replace(/^Otro: ?/, '') : ''}
               onChange={e => onChange(e.target.value.trim() ? `Otro: ${e.target.value}` : 'Otro')} />
      )}
    </>
  )
}

export default function Aspirantes({ ir, abrirId = null }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [fEstado, setFEstado] = useState('activos')
  const [fCanal, setFCanal] = useState('')
  const [pestana, setPestana] = useState('lista')
  const [fichaId, setFichaId] = useState(abrirId)
  const [editando, setEditando] = useState(null) // {} nuevo · objeto edición
  const [toast, setToast] = useState(null)

  async function cargar() {
    setError(null)
    try { setLista(await listarAspirantes()) }
    catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  function mostrar(msg, tipo = 'ok') { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2600) }

  async function exportar() {
    try { await exportarAspirantesExcel(lista); mostrar('Excel descargado ✓') }
    catch (e) { mostrar('Error al exportar: ' + e.message, 'error') }
  }

  if (cargando) return <div className="cargando">Cargando aspirantes…</div>
  if (error) return (
    <div className="estado-error">
      <p>No se pudieron cargar los aspirantes.</p>
      <p className="estado-error-detalle">{error}</p>
      <button className="btn-secundario" onClick={cargar}>Reintentar</button>
    </div>
  )

  const q = busqueda.trim().toLowerCase()
  const filtrados = lista.filter(a => {
    if (q && !a.nombre.toLowerCase().includes(q) && !(a.telefono || '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')) return false
    if (fCanal === '_sin' ? metaCanal(a.canal) : (fCanal && a.canal !== fCanal)) return false
    if (fEstado === 'activos') return a.estado === 'contactado' || a.estado === 'en_seguimiento'
    if (fEstado) return a.estado === fEstado
    return true
  })
  const conteo = id => lista.filter(a => a.estado === id).length
  const ficha = lista.find(a => a.id === fichaId)

  return (
    <div>
      <div className="topbar">
        <div className="topbar-titulo">Aspirantes</div>
        <div className="topbar-acciones">
          {lista.length > 0 && <button className="btn-chico" onClick={exportar} title="Descargar en Excel">⬇ Excel</button>}
          <button className="btn-chico primario" onClick={() => setEditando({})}>+ Nuevo</button>
        </div>
      </div>

      <div className="pestanas pagina">
        <button className={pestana === 'lista' ? 'activo' : ''} onClick={() => setPestana('lista')}>Contactos ({lista.length})</button>
        <button className={pestana === 'resumen' ? 'activo' : ''} onClick={() => setPestana('resumen')}>Resumen del mes</button>
      </div>

      {pestana === 'resumen' ? <ResumenMes lista={lista} onMensaje={mostrar} /> : <>

      <div className="fila-badges">
        {ESTADOS_ASPIRANTE.map(e => conteo(e.id) > 0 && (
          <span key={e.id} className={`badge ${e.clase}`}>{conteo(e.id)} {e.label.toLowerCase()}</span>
        ))}
        {lista.length === 0 && <span className="badge gris">Sin aspirantes aún</span>}
      </div>

      <div className="barra-buscar">
        <input type="text" placeholder="Buscar por nombre o teléfono…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>
      <div className="barra-filtros">
        <span className="filtro-etiqueta">Mostrar:</span>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)}>
          <option value="activos">En proceso (contactados y en seguimiento)</option>
          {ESTADOS_ASPIRANTE.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          <option value="">Todos</option>
        </select>
        <select value={fCanal} onChange={e => setFCanal(e.target.value)}>
          <option value="">Cualquier origen</option>
          {CANALES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          <option value="_sin">Sin etiqueta</option>
        </select>
      </div>

      {filtrados.length === 0
        ? <div className="vacio">{lista.length === 0 ? 'Registra al primer aspirante con "+ Nuevo aspirante".' : 'Nadie con ese filtro.'}</div>
        : filtrados.map(a => {
          const meta = metaEstadoAspirante(a.estado)
          const ultimo = a.contactos[0]
          const vencida = a.proxima_accion && a.proxima_accion < hoyISO()
          return (
            <div key={a.id} className="fila-militante" onClick={() => setFichaId(a.id)}>
              <div className="avatar" style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--muted)' }}>☎</div>
              <div className="fila-info">
                <div className="fila-nombre">{a.nombre} <EtiquetaCanal a={a} /></div>
                <div className="fila-meta">
                  {a.telefono || 'sin teléfono'}
                  {ultimo ? ` · último contacto ${diaMes(ultimo.fecha)}` : ' · sin contactos'}
                  {a.proxima_accion && <span className={vencida ? 'texto-ambar' : ''}> · llamar {diaMes(a.proxima_accion)}</span>}
                  {a.estado === 'descartado' && a.motivo_descarte && <> · {a.motivo_descarte}</>}
                </div>
              </div>
              <span className={`badge ${meta.clase}`}>{meta.label}</span>
            </div>
          )
        })}
      </>}

      {ficha && (
        <FichaAspirante
          a={ficha}
          onCerrar={() => setFichaId(null)}
          onEditar={() => setEditando(ficha)}
          onCambio={cargar}
          onMensaje={mostrar}
          irAMilitantes={() => ir('militantes')}
        />
      )}

      {editando && (
        <FormAspirante
          a={editando}
          lista={lista}
          onCerrar={() => setEditando(null)}
          onGuardado={async (guardado, eliminado) => {
            setEditando(null)
            if (eliminado) setFichaId(null)
            await cargar()
            if (guardado && !editando.id) setFichaId(guardado.id)
            mostrar(eliminado ? 'Aspirante eliminado' : 'Guardado ✓')
          }}
        />
      )}

      {toast && <div className={`toast ${toast.tipo}`}>{toast.msg}</div>}
    </div>
  )
}

function FichaAspirante({ a, onCerrar, onEditar, onCambio, onMensaje, irAMilitantes }) {
  const [contacto, setContacto] = useState({ fecha: hoyISO(), medio: 'llamada', notas: '', proxima_accion: sumarDias(hoyISO(), 7) })
  const [registrando, setRegistrando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [gruposBase, setGruposBase] = useState(null)
  const [grupo, setGrupo] = useState('')
  const [descartando, setDescartando] = useState(null) // motivo elegido mientras se descarta
  const meta = metaEstadoAspirante(a.estado)

  async function guardarContacto() {
    setGuardando(true)
    try {
      await registrarContacto(a, contacto)
      setRegistrando(false)
      setContacto({ fecha: hoyISO(), medio: 'llamada', notas: '', proxima_accion: sumarDias(hoyISO(), 7) })
      await onCambio()
      onMensaje('Contacto registrado ✓')
    } catch (e) { onMensaje('Error: ' + e.message, 'error') }
    finally { setGuardando(false) }
  }

  async function cambiarEstado(estado, motivo = '') {
    if (estado === 'descartado' && descartando === null) { setDescartando(''); return }
    try {
      await cambiarEstadoAspirante(a.id, estado, motivo)
      setDescartando(null)
      await onCambio()
      if (estado === 'descartado') onMensaje('Descartado. Queda guardado en el registro ✓')
    } catch (e) { onMensaje('Error: ' + e.message, 'error') }
  }

  async function prepararConversion() {
    try {
      const gb = await listarGruposBase()
      setGruposBase(gb)
      setGrupo(gb[0]?.id || '')
    } catch (e) { onMensaje('Error: ' + e.message, 'error') }
  }

  async function convertir() {
    setGuardando(true)
    try {
      await convertirEnMilitante(a, grupo || null)
      setGruposBase(null)
      await onCambio()
      onMensaje(`${a.nombre} ya está en el padrón de militantes ✓`)
    } catch (e) { onMensaje('Error: ' + e.message, 'error') }
    finally { setGuardando(false) }
  }

  async function borrarContacto(id) {
    if (!confirm('¿Borrar este contacto del historial?')) return
    try { await eliminarContacto(id); await onCambio() }
    catch (e) { onMensaje('Error: ' + e.message, 'error') }
  }

  const telLimpio = (a.telefono || '').replace(/[^\d+]/g, '')

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-centrado" onClick={e => e.stopPropagation()}>
        <div className="ficha-cabecera">
          <button className="ficha-editar" onClick={onEditar}>✎ Editar</button>
          <button className="cerrar" onClick={onCerrar}>✕</button>
          <div className="avatar grande" style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--muted)' }}>☎</div>
          <div className="ficha-nombre">{a.nombre}</div>
          <div className="ficha-chips"><span className={`badge ${meta.clase}`}>{meta.label}</span><EtiquetaCanal a={a} /></div>
          {telLimpio && (
            <div className="acciones-contacto">
              <a className="btn-chico" href={`tel:${telLimpio}`}>📞 Llamar</a>
              <a className="btn-chico" href={`https://wa.me/${telLimpio.replace(/^\+/, '')}`} target="_blank" rel="noopener">💬 WhatsApp</a>
            </div>
          )}
        </div>

        <div className="ficha-cuerpo">
          <div className="ficha-seccion-titulo">Datos</div>
          <div className="ficha-fila"><span className="ficha-label">Teléfono</span><span className="ficha-valor">{a.telefono || '—'}</span></div>
          {a.correo && <div className="ficha-fila"><span className="ficha-label">Correo</span><span className="ficha-valor"><a className="enlace-chico" href={`mailto:${a.correo}`}>{a.correo}</a></span></div>}
          {a.edad && <div className="ficha-fila"><span className="ficha-label">Edad</span><span className="ficha-valor">{a.edad} años</span></div>}
          {(a.ciudad || a.estado_rep) && <div className="ficha-fila"><span className="ficha-label">Lugar</span><span className="ficha-valor">{[a.ciudad, a.estado_rep].filter(Boolean).join(', ')}</span></div>}
          {a.ocupacion && <div className="ficha-fila"><span className="ficha-label">Ocupación</span><span className="ficha-valor">{a.ocupacion}</span></div>}
          {a.escuela_trabajo && <div className="ficha-fila"><span className="ficha-label">Escuela o trabajo</span><span className="ficha-valor">{a.escuela_trabajo}</span></div>}
          <div className="ficha-fila"><span className="ficha-label">Origen</span><span className="ficha-valor">{textoCanal(a) || '—'}</span></div>
          <div className="ficha-fila"><span className="ficha-label">Ingresó</span><span className="ficha-valor">{diaMes(fechaIngreso(a))}</span></div>
          <div className="ficha-fila"><span className="ficha-label">Próxima llamada</span><span className="ficha-valor">{a.proxima_accion ? diaMes(a.proxima_accion) : '—'}</span></div>
          {a.motivo && <>
            <div className="ficha-seccion-titulo">¿Por qué quiere participar?</div>
            <div className="ficha-notas">“{a.motivo}”</div>
          </>}
          {a.notas && <div className="ficha-notas" style={{ marginTop: 10 }}>{a.notas}</div>}

          <div className="ficha-seccion-titulo">Estado</div>
          <div className="chips">
            {ESTADOS_ASPIRANTE.filter(e => e.id !== 'incorporado').map(e => (
              <button key={e.id} className={`chip ${a.estado === e.id ? 'sel' : ''}`}
                      disabled={a.estado === 'incorporado'}
                      onClick={() => a.estado !== e.id && cambiarEstado(e.id)}>{e.label}</button>
            ))}
          </div>
          {a.estado === 'descartado' && descartando === null && (
            <div className="aviso-suave">
              Descartado{a.descartado_en ? ` el ${diaMes(a.descartado_en)}` : ''}{a.motivo_descarte ? ` · ${a.motivo_descarte}` : ''}.
              {' '}<button className="enlace-chico" onClick={() => setDescartando(a.motivo_descarte || '')}>Cambiar motivo</button>
            </div>
          )}
          {descartando !== null && (
            <div className="sub-bloque">
              <label className="etiqueta-campo">¿Por qué se descarta?</label>
              <SelectorMotivo valor={descartando} onChange={setDescartando} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-chico" onClick={() => setDescartando(null)}>Cancelar</button>
                <button className="btn-chico primario" style={{ flex: 1 }} onClick={() => cambiarEstado('descartado', descartando)}>
                  {a.estado === 'descartado' ? 'Guardar motivo' : 'Descartar'}
                </button>
              </div>
            </div>
          )}

          <div className="ficha-seccion-titulo">Historial de contactos</div>
          {!registrando
            ? <button className="btn-principal" onClick={() => setRegistrando(true)}>☎ Registrar llamada / contacto</button>
            : (
              <div className="sub-bloque">
                <div className="campo-fila">
                  <div className="campo"><label>Fecha</label><input type="date" value={contacto.fecha} onChange={e => setContacto({ ...contacto, fecha: e.target.value })} /></div>
                  <div className="campo"><label>Medio</label>
                    <select value={contacto.medio} onChange={e => setContacto({ ...contacto, medio: e.target.value })}>
                      {MEDIOS_CONTACTO.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="campo"><label>¿Qué se habló?</label>
                  <textarea rows={3} value={contacto.notas} placeholder="Interés, dudas, acuerdos, siguiente paso…" onChange={e => setContacto({ ...contacto, notas: e.target.value })} />
                </div>
                <div className="campo"><label>Volver a llamar el (opcional)</label>
                  <input type="date" value={contacto.proxima_accion || ''} onChange={e => setContacto({ ...contacto, proxima_accion: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-chico" onClick={() => setRegistrando(false)}>Cancelar</button>
                  <button className="btn-chico primario" style={{ flex: 1 }} disabled={guardando} onClick={guardarContacto}>{guardando ? 'Guardando…' : 'Guardar contacto'}</button>
                </div>
              </div>
            )}
          {a.contactos.length === 0
            ? <div className="ficha-vacio">Sin contactos registrados.</div>
            : a.contactos.map(c => (
              <div key={c.id} className="contacto-item">
                <div className="contacto-cabecera">
                  <b>{diaMes(c.fecha)}</b> · {labelMedio(c.medio)}
                  <button className="item-borrar" onClick={() => borrarContacto(c.id)} title="Borrar">✕</button>
                </div>
                {c.notas && <div className="contacto-notas">{c.notas}</div>}
              </div>
            ))}

          <div className="ficha-seccion-titulo">Incorporación</div>
          {a.estado === 'incorporado'
            ? <div className="aviso-suave">Incorporado{a.incorporado_en ? ` el ${diaMes(a.incorporado_en)}` : ''}. Ya está en el padrón. <button className="enlace-chico" onClick={irAMilitantes}>Ver militantes →</button></div>
            : gruposBase === null
              ? <button className="btn-secundario" onClick={prepararConversion}>Convertir en militante</button>
              : (
                <div className="sub-bloque">
                  <p className="panel-desc">Se dará de alta en el padrón con su nombre y teléfono, como simpatizante. Después puedes completar su ficha en Militantes.</p>
                  <div className="campo"><label>Grupo base</label>
                    <select value={grupo} onChange={e => setGrupo(e.target.value)}>
                      <option value="">— Sin grupo base —</option>
                      {gruposBase.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-chico" onClick={() => setGruposBase(null)}>Cancelar</button>
                    <button className="btn-chico primario" style={{ flex: 1 }} disabled={guardando} onClick={convertir}>Dar de alta como militante</button>
                  </div>
                </div>
              )}
        </div>
      </div>
    </div>
  )
}

function FormAspirante({ a, lista = [], onCerrar, onGuardado }) {
  const esEdicion = !!a.id
  const [f, setF] = useState({
    nombre: a.nombre || '', telefono: a.telefono || '',
    correo: a.correo || '', edad: a.edad || '', estado_rep: a.estado_rep || '', ciudad: a.ciudad || '',
    ocupacion: a.ocupacion || '', escuela_trabajo: a.escuela_trabajo || '', motivo: a.motivo || '',
    fecha_registro: a.fecha_registro || '',
    canal: a.canal || '', referido_por: a.referido_por || '',
    estado: a.estado || 'contactado', notas: a.notas || '', proxima_accion: a.proxima_accion || '',
    motivo_descarte: a.motivo_descarte || '', descartado_en: a.descartado_en || '',
  })
  const [guardando, setGuardando] = useState(false)
  const [pegar, setPegar] = useState(!esEdicion)  // bloque "pegar mensaje" abierto al crear
  const [mensaje, setMensaje] = useState('')
  const [leido, setLeido] = useState(null)        // campos reconocidos
  const [militantes, setMilitantes] = useState([])
  const set = (c, v) => setF(prev => ({ ...prev, [c]: v }))

  useEffect(() => { listarMilitantes({ incluirInactivos: true }).then(setMilitantes).catch(() => {}) }, [])

  function leer(texto) {
    const { datos, reconocidos } = leerMensajeContacto(texto)
    if (reconocidos.length === 0) { setLeido([]); return }
    // Solo se llenan los campos que vinieron en el mensaje
    setF(prev => {
      const nuevo = { ...prev }
      Object.entries(datos).forEach(([k, v]) => { if (v) nuevo[k] = v })
      return nuevo
    })
    setLeido(reconocidos)
    setPegar(false)
  }

  async function pegarPortapapeles() {
    try {
      const t = await navigator.clipboard.readText()
      if (t && t.trim()) { setMensaje(t); leer(t); return }
    } catch { /* sin permiso: que pegue a mano */ }
    document.getElementById('mensaje-comision')?.focus()
  }

  // ¿Ya lo tenemos registrado? (por teléfono)
  const clave = telefonoClave(f.telefono)
  const repetidoAsp = clave && lista.find(x => x.id !== a.id && telefonoClave(x.telefono) === clave)
  const repetidoMil = clave && militantes.find(m => telefonoClave(m.telefono) === clave)

  async function guardar() {
    if (!f.nombre.trim()) return
    setGuardando(true)
    try { onGuardado(await guardarAspirante(f, a.id)) }
    catch (e) { alert('No se pudo guardar: ' + e.message); setGuardando(false) }
  }

  async function borrar() {
    if (!confirm(`¿Eliminar a ${a.nombre} y su historial de contactos? No se puede deshacer.`)) return
    try { await eliminarAspirante(a.id); onGuardado(null, true) }
    catch (e) { alert('No se pudo eliminar: ' + e.message) }
  }

  return (
    <div className="modal-fondo" style={{ zIndex: 450 }} onClick={onCerrar}>
      <div className="modal-hoja" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">{esEdicion ? `Editar — ${a.nombre}` : 'Nuevo aspirante'}</div>
          <button className="cerrar" onClick={onCerrar}>✕</button>
        </div>
        <div className="modal-cuerpo">
          {pegar ? (
            <div className="sub-bloque pegar-mensaje">
              <label className="etiqueta-campo">¿Te pasaron el contacto por WhatsApp?</label>
              <p className="panel-desc">Copia el mensaje completo de la comisión y pégalo aquí. La app llena los campos sola y tú solo revisas.</p>
              <button type="button" className="btn-copiar" onClick={pegarPortapapeles}>📋 Pegar mensaje copiado</button>
              <textarea id="mensaje-comision" rows={4} className="input-suelto" value={mensaje}
                        placeholder="…o mantén presionado aquí y elige Pegar"
                        onChange={e => setMensaje(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-chico" onClick={() => setPegar(false)}>Capturar a mano</button>
                <button type="button" className="btn-chico primario" style={{ flex: 1 }} disabled={!mensaje.trim()} onClick={() => leer(mensaje)}>Leer datos</button>
              </div>
              {leido && leido.length === 0 && <div className="aviso-inline">No reconocí datos en ese texto. Revisa que sea el mensaje completo.</div>}
            </div>
          ) : (
            <button type="button" className="enlace-chico" style={{ marginBottom: 12 }} onClick={() => { setPegar(true); setLeido(null) }}>📋 Pegar mensaje de la comisión</button>
          )}
          {leido && leido.length > 0 && (
            <div className="aviso-suave">✓ Se llenaron: {leido.join(', ')}. Revisa que todo esté bien antes de guardar.</div>
          )}
          {(repetidoAsp || repetidoMil) && (
            <div className="aviso-inline">
              ⚠ Ese teléfono ya está registrado {repetidoMil ? `en el padrón de militantes (${repetidoMil.nombre}${repetidoMil.activo === false ? ', dado de baja' : ''})` : `como aspirante (${repetidoAsp.nombre}, ${metaEstadoAspirante(repetidoAsp.estado).label.toLowerCase()})`}.
            </div>
          )}

          <div className="campo"><label>Nombre *</label><input type="text" value={f.nombre} onChange={e => set('nombre', e.target.value)} /></div>
          <div className="campo-fila">
            <div className="campo"><label>Teléfono</label><input type="tel" value={f.telefono} onChange={e => set('telefono', e.target.value)} /></div>
            <div className="campo"><label>Correo</label><input type="email" value={f.correo} onChange={e => set('correo', e.target.value)} /></div>
          </div>
          <div className="campo-fila">
            <div className="campo"><label>Edad</label>
              <input type="text" list="rangos-edad" value={f.edad} placeholder="Ej. 15-17" onChange={e => set('edad', e.target.value)} />
              <datalist id="rangos-edad">{['15-17', '18-24', '25-29', '30-39', '40+'].map(x => <option key={x} value={x} />)}</datalist>
            </div>
            <div className="campo"><label>Fecha en que se registró</label><input type="date" value={f.fecha_registro || ''} onChange={e => set('fecha_registro', e.target.value)} /></div>
          </div>
          <div className="campo-fila">
            <div className="campo"><label>Ciudad</label><input type="text" value={f.ciudad} placeholder="Saltillo" onChange={e => set('ciudad', e.target.value)} /></div>
            <div className="campo"><label>Estado</label><input type="text" value={f.estado_rep} placeholder="Coahuila" onChange={e => set('estado_rep', e.target.value)} /></div>
          </div>
          <div className="campo-fila">
            <div className="campo"><label>Ocupación</label>
              <input type="text" list="ocupaciones" value={f.ocupacion} placeholder="Estudiante" onChange={e => set('ocupacion', e.target.value)} />
              <datalist id="ocupaciones">{OCUPACIONES.map(x => <option key={x} value={x} />)}</datalist>
            </div>
            <div className="campo"><label>Escuela o trabajo</label><input type="text" value={f.escuela_trabajo} onChange={e => set('escuela_trabajo', e.target.value)} /></div>
          </div>
          <div className="campo"><label>¿De dónde llegó?</label>
            <div className="chips">
              {CANALES.map(c => (
                <button type="button" key={c.id} className={`chip canal ${f.canal === c.id ? 'sel' : ''}`}
                        style={f.canal === c.id ? { color: c.color, borderColor: c.color, background: 'transparent' } : undefined}
                        onClick={() => set('canal', f.canal === c.id ? '' : c.id)}>{c.label}</button>
              ))}
            </div>
            {!f.canal && a.como_llego && <div className="vacio-chico">Antes se anotó: “{a.como_llego}”</div>}
          </div>
          {f.canal === 'referido' && (
            <div className="campo"><label>¿Quién lo refirió?</label>
              <input type="text" value={f.referido_por} placeholder="Nombre de quien te pasó el contacto" onChange={e => set('referido_por', e.target.value)} />
            </div>
          )}
          <div className="campo-fila">
            <div className="campo"><label>Estado</label>
              <select value={f.estado} onChange={e => set('estado', e.target.value)}>
                {ESTADOS_ASPIRANTE.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div className="campo"><label>Próxima llamada</label><input type="date" value={f.proxima_accion || ''} onChange={e => set('proxima_accion', e.target.value)} /></div>
          </div>
          {f.estado === 'descartado' && (
            <div className="campo"><label>Motivo de descarte</label>
              <SelectorMotivo valor={f.motivo_descarte} onChange={v => set('motivo_descarte', v)} />
            </div>
          )}
          <div className="campo"><label>¿Por qué quiere participar?</label><textarea rows={3} value={f.motivo} onChange={e => set('motivo', e.target.value)} /></div>
          <div className="campo"><label>Notas tuyas</label><textarea rows={2} value={f.notas} onChange={e => set('notas', e.target.value)} /></div>
          <button className="btn-principal" disabled={guardando || !f.nombre.trim()} onClick={guardar}>{guardando ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Registrar aspirante')}</button>
          {esEdicion && <button className="btn-secundario peligro" onClick={borrar}>Eliminar aspirante</button>}
        </div>
      </div>
    </div>
  )
}

function ResumenMes({ lista, onMensaje }) {
  const [mes, setMes] = useState(mesActual())
  const r = resumenAspirantes(lista, mes)
  const efectividad = efectividadPorCanal(lista)
  const maxCanal = Math.max(1, ...r.porCanal.map(x => x.n))

  async function copiar() {
    const ok = await copiarTexto(textoResumenAspirantes(r))
    onMensaje(ok ? 'Resumen copiado ✓' : 'No se pudo copiar', ok ? 'ok' : 'error')
  }

  return (
    <div>
      <div className="barra-filtros">
        <span className="filtro-etiqueta">Mes:</span>
        <select value={mes} onChange={e => setMes(e.target.value)}>
          {ultimosMeses(12).map(m => <option key={m} value={m}>{mesLegible(m)}{m === mesActual() ? ' (en curso)' : ''}</option>)}
        </select>
        <button className="btn-copiar" style={{ marginLeft: 'auto' }} onClick={copiar}>📋 Copiar resumen</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Contactos nuevos</div>
          <div className="kpi-valor">{r.nuevos.length}</div>
          <div className="kpi-sub">te llegaron este mes</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Contactados</div>
          <div className="kpi-valor ambar">{r.contactados.length}</div>
          <div className="kpi-sub">{r.contactos} llamada(s) o mensaje(s)</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Incorporados</div>
          <div className="kpi-valor verde">{r.incorporados.length}</div>
          <div className="kpi-sub">{r.nuevos.length ? `${Math.round((r.incorporados.length / r.nuevos.length) * 100)}% de los nuevos` : 'pasaron a militantes'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Descartados</div>
          <div className="kpi-valor rojo">{r.descartados.length}</div>
          <div className="kpi-sub">{r.enProceso.length} siguen en proceso</div>
        </div>
      </div>

      <div className="informe-grid">
        <section className="panel">
          <div className="panel-cabecera"><div className="panel-titulo">De dónde llegaron</div></div>
          <div className="panel-cuerpo">
            {r.porCanal.length === 0 ? <div className="vacio-chico">Sin contactos nuevos este mes.</div>
              : r.porCanal.map(x => {
                const color = CANALES.find(c => c.label === x.k)?.color || '#B0ABA3'
                return (
                  <div key={x.k} className="barra-tipo">
                    <span className="barra-tipo-nombre"><i style={{ background: color }} />{x.k}</span>
                    <span className="barra-tipo-barra"><span style={{ width: `${(x.n / maxCanal) * 100}%`, background: color }} /></span>
                    <span className="barra-tipo-n">{x.n}</span>
                  </div>
                )
              })}
            {r.referidores.length > 0 && (
              <div className="vacio-chico" style={{ marginTop: 8 }}>Referidos por: {r.referidores.map(x => `${x.k} (${x.n})`).join(', ')}</div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-cabecera"><div className="panel-titulo">Por qué se descartaron</div></div>
          <div className="panel-cuerpo">
            {r.motivos.length === 0 ? <div className="vacio-chico">Nadie descartado este mes.</div>
              : r.motivos.map(x => (
                <div key={x.k} className="inicio-punto"><b>{x.n}</b> · {x.k}</div>
              ))}
            {r.incorporados.length > 0 && <>
              <div className="ficha-seccion-titulo">Incorporados</div>
              {r.incorporados.map(a => <div key={a.id} className="inicio-punto">{a.nombre} <EtiquetaCanal a={a} /></div>)}
            </>}
          </div>
        </section>
      </div>

      {r.nuevos.length > 0 && (
        <div className="informe-grid tres">
          {[['Edades', r.porEdad], ['Ocupación', r.porOcupacion], ['Ciudad', r.porCiudad]].map(([titulo, datos]) => (
            <section key={titulo} className="panel">
              <div className="panel-cabecera"><div className="panel-titulo">{titulo} de los nuevos</div></div>
              <div className="panel-cuerpo">
                {datos.map(x => <div key={x.k} className="inicio-punto"><b>{x.n}</b> · {x.k}</div>)}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="panel dash-panel">
        <div className="panel-cabecera"><div className="panel-titulo">Qué canal funciona mejor (todo el registro)</div></div>
        <div className="panel-cuerpo tabla-scroll">
          {efectividad.length === 0 ? <div className="vacio-chico">Aún no hay aspirantes registrados.</div> : (
            <table className="tabla-simple">
              <thead><tr><th>Origen</th><th>Total</th><th>Incorporados</th><th>En proceso</th><th>Descartados</th><th>Efectividad</th></tr></thead>
              <tbody>
                {efectividad.map(f => (
                  <tr key={f.id || 'sin'}>
                    <td><i className="punto-color" style={{ background: f.color }} />{f.label}</td>
                    <td>{f.total}</td>
                    <td>{f.incorporados}</td>
                    <td>{f.enProceso}</td>
                    <td>{f.descartados}</td>
                    <td>{Math.round((f.incorporados / f.total) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
