/**
 * FormMilitante.jsx
 * ───────────────────────────────────────────────────────────────
 * Alta y edición. Si recibe un militante con id, es edición;
 * si recibe {}, es alta nueva.
 */

import { useState } from 'react'
import { CONDICIONES, CATEGORIAS_SOCIALES, subirFotoPerfil, eliminarMilitante } from '../lib/militantes.js'
import { crearActividad } from '../lib/catalogos.js'
import { PALETA, hexToRgba, iniciales } from '../lib/colores.js'

const hoy = () => new Date().toISOString().slice(0, 10)

export default function FormMilitante({ militante, padron = [], gruposBase, etiquetas, actividades, fotoUrlInicial, onGuardar, onCerrar, onCatalogosCambio, onEliminado }) {
  const esEdicion = !!militante.id

  const [f, setF] = useState({
    nombre:           militante.nombre || '',
    telefono:         militante.telefono || '',
    correo:           militante.correo || '',
    ciudad:           militante.ciudad || '',
    estado:           militante.estado || '',
    condicion:        militante.condicion || 'militante_trabajador',
    grupo_base_id:    militante.grupo_base_id || (gruposBase[0]?.id || ''),
    actividad_id:     militante.actividad_id || '',
    categoria:        militante.categoria || '',
    responsable_id:   militante.responsable_id || '',
    folio:            militante.folio || '',
    color_individual: militante.color_individual || '#5B8DD9',
    cuota_monto:      militante.cuota_monto || '',
    cuota_dia:        militante.cuota_dia || '',
    fecha_alta:       militante.fecha_alta || hoy(),
    referencia:       militante.referencia || '',
    notas:            militante.notas || '',
  })
  const [etiqSel, setEtiqSel]         = useState(militante.etiquetas || [])
  const [guardando, setGuardando]     = useState(false)
  const [archivoFoto, setArchivoFoto] = useState(null)
  const [previewFoto, setPreviewFoto] = useState(fotoUrlInicial || null)
  const [fotoQuitada, setFotoQuitada] = useState(false)
  const [nuevaActividad, setNuevaActividad] = useState('')
  const [avanzadas, setAvanzadas]     = useState(false)
  const [confirmaNombre, setConfirmaNombre] = useState('')
  const [eliminando, setEliminando]   = useState(false)
  const [verFinanzas, setVerFinanzas] = useState(false)

  function set(campo, valor) { setF(prev => ({ ...prev, [campo]: valor })) }

  function toggleEtiqueta(id) {
    setEtiqSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function onArchivo(e) {
    const file = e.target.files[0]
    if (!file) return
    setArchivoFoto(file)
    setFotoQuitada(false)
    const reader = new FileReader()
    reader.onload = ev => setPreviewFoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  function quitarFoto() {
    setArchivoFoto(null)
    setPreviewFoto(null)
    setFotoQuitada(true)
  }

  async function agregarActividadInline() {
    const nombre = nuevaActividad.trim()
    if (!nombre) return
    try {
      const creada = await crearActividad(nombre)
      setNuevaActividad('')
      set('actividad_id', creada.id)
      await onCatalogosCambio?.()
    } catch (e) {
      alert('No se pudo crear la actividad: ' + e.message)
    }
  }

  async function guardar() {
    if (!f.nombre.trim()) return
    setGuardando(true)
    try {
      let foto_path = militante.foto_path || ''
      if (fotoQuitada) foto_path = ''
      if (esEdicion && archivoFoto) {
        foto_path = await subirFotoPerfil(archivoFoto, militante.id)
      }

      const datos = {
        ...f,
        cuota_monto: Number(f.cuota_monto) || 0,
        cuota_dia: Number(f.cuota_dia) || 1,
        grupo_base_id: f.grupo_base_id || null,
        actividad_id: f.actividad_id || null,
        responsable_id: f.responsable_id || null,
        folio: f.folio.trim(),
        foto_path,
        etiquetas: etiqSel,
      }
      await onGuardar(datos, militante.id, !esEdicion ? archivoFoto : null)
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar() {
    if (confirmaNombre.trim() !== militante.nombre.trim()) return
    setEliminando(true)
    try {
      await eliminarMilitante(militante.id, militante.foto_path)
      onEliminado?.(militante.id)
    } catch (e) {
      alert('No se pudo eliminar: ' + e.message)
      setEliminando(false)
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-hoja" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">{esEdicion ? `Editar — ${militante.nombre}` : 'Nuevo alta'}</div>
          <button className="cerrar" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal-cuerpo">
          {/* Foto de perfil */}
          <div className="campo">
            <label>Foto de perfil (opcional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                onClick={() => document.getElementById('input-foto-perfil').click()}
                style={{
                  width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--surface2)', border: '2px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, fontSize: 18, color: 'var(--muted)',
                }}
              >
                {previewFoto
                  ? <img src={previewFoto} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '📷'}
              </div>
              <div style={{ flex: 1 }}>
                <button type="button" className="btn-chico" onClick={() => document.getElementById('input-foto-perfil').click()}>
                  📷 Tomar o elegir foto
                </button>
                {previewFoto && (
                  <button type="button" onClick={quitarFoto} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', marginLeft: 8 }}>
                    Quitar
                  </button>
                )}
                <div className="nota-inline">Se reduce sola antes de subirse. Si no hay foto, se usan las iniciales con color.</div>
              </div>
            </div>
            <input id="input-foto-perfil" type="file" accept="image/*" style={{ display: 'none' }} onChange={onArchivo} />
          </div>

          <div className="campo">
            <label>Nombre completo *</label>
            <input type="text" value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre Apellido" />
          </div>

          <div className="campo-fila">
            <div className="campo">
              <label>Teléfono</label>
              <input type="tel" value={f.telefono} onChange={e => set('telefono', e.target.value)} />
            </div>
            <div className="campo">
              <label>Correo</label>
              <input type="email" value={f.correo} onChange={e => set('correo', e.target.value)} />
            </div>
          </div>

          <div className="campo-fila">
            <div className="campo">
              <label>Ciudad</label>
              <input type="text" value={f.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="Saltillo" />
            </div>
            <div className="campo">
              <label>Estado</label>
              <input type="text" value={f.estado} onChange={e => set('estado', e.target.value)} placeholder="Coahuila" />
            </div>
          </div>

          <div className="campo">
            <label>Condición *</label>
            <select value={f.condicion} onChange={e => set('condicion', e.target.value)}>
              {CONDICIONES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div className="campo">
            <label>Grupo base *</label>
            {gruposBase.length === 0
              ? <div className="aviso-inline">Crea un grupo base primero (en Ajustes).</div>
              : <select value={f.grupo_base_id} onChange={e => set('grupo_base_id', e.target.value)}>
                  {gruposBase.map(gb => <option key={gb.id} value={gb.id}>{gb.nombre}</option>)}
                </select>
            }
          </div>

          <div className="campo">
            <label>Categoría</label>
            <div className="chips">
              {CATEGORIAS_SOCIALES.map(c => (
                <button type="button" key={c.id} className={`chip ${f.categoria === c.id ? 'sel' : ''}`}
                        onClick={() => set('categoria', f.categoria === c.id ? '' : c.id)}>{c.label}</button>
              ))}
            </div>
          </div>

          <div className="campo-fila">
            <div className="campo">
              <label>Responsable de seguimiento</label>
              <select value={f.responsable_id} onChange={e => set('responsable_id', e.target.value)}>
                <option value="">— Nadie —</option>
                {padron.filter(p => p.id !== militante.id).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Folio militante</label>
              <input type="text" value={f.folio} inputMode="numeric" placeholder="Lo asigna el partido" onChange={e => set('folio', e.target.value)} />
            </div>
          </div>

          {/* Color individual */}
          <div className="campo">
            <label>Color de identificación *</label>
            <div className="paleta">
              {PALETA.map(hex => (
                <button
                  key={hex}
                  type="button"
                  className={`color-punto ${f.color_individual === hex ? 'sel' : ''}`}
                  style={{ background: hex }}
                  onClick={() => set('color_individual', hex)}
                />
              ))}
            </div>
            <div className="preview-avatar">
              <div className="avatar" style={{
                background: hexToRgba(f.color_individual, 0.18),
                borderColor: f.color_individual, color: f.color_individual,
              }}>
                {f.nombre ? iniciales(f.nombre) : 'AB'}
              </div>
              <span className="preview-nota">vista del avatar (si no hay foto)</span>
            </div>
          </div>

          <div className="campo">
            <label>Fecha de alta *</label>
            <input type="date" value={f.fecha_alta} onChange={e => set('fecha_alta', e.target.value)} />
          </div>

          <div className="campo">
            <label>Referencia</label>
            <input type="text" value={f.referencia} onChange={e => set('referencia', e.target.value)} placeholder="¿Quién lo invitó?" />
          </div>

          {/* Actividad (catálogo administrable) */}
          <div className="campo">
            <label>Papel en el GB (responsabilidad)</label>
            {actividades.length === 0
              ? <div className="aviso-inline">Aún no hay responsabilidades. Crea la primera abajo.</div>
              : <select value={f.actividad_id} onChange={e => set('actividad_id', e.target.value)}>
                  <option value="">— Sin especificar —</option>
                  {actividades.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
            }
            <div className="crear-inline" style={{ marginTop: 8 }}>
              <input
                type="text" placeholder="Otra responsabilidad (ej. Propaganda)"
                value={nuevaActividad} maxLength={40}
                onChange={e => setNuevaActividad(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarActividadInline())}
              />
              <button type="button" className="btn-chico" onClick={agregarActividadInline}>+ Crear</button>
            </div>
          </div>

          {/* Etiquetas */}
          {etiquetas.length > 0 && (
            <div className="campo">
              <label>Etiquetas (opcional)</label>
              <div className="etiquetas-selector">
                {etiquetas.map(et => {
                  const activa = etiqSel.includes(et.id)
                  return (
                    <button
                      key={et.id}
                      type="button"
                      className="etiqueta-chip"
                      style={{
                        background: activa ? et.color : hexToRgba(et.color, 0.12),
                        color: activa ? '#fff' : et.color,
                        borderColor: activa ? et.color : hexToRgba(et.color, 0.35),
                      }}
                      onClick={() => toggleEtiqueta(et.id)}
                    >
                      {activa ? '✓ ' : ''}{et.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="campo">
            <label>Notas (opcional)</label>
            <textarea value={f.notas} onChange={e => set('notas', e.target.value)} />
          </div>

          {/* Datos de finanzas: ya no se usan, pero se conservan */}
          <button type="button" className="plegable" onClick={() => setVerFinanzas(v => !v)}>
            <span>Datos de finanzas (archivo)</span><span>{verFinanzas ? '▲' : '▼'}</span>
          </button>
          {verFinanzas && (
            <div className="campo-fila">
              <div className="campo">
                <label>Cuota mensual ($)</label>
                <input type="number" value={f.cuota_monto} onChange={e => set('cuota_monto', e.target.value)} placeholder="0" />
              </div>
              <div className="campo">
                <label>Día de pago</label>
                <input type="number" min="1" max="31" value={f.cuota_dia} onChange={e => set('cuota_dia', e.target.value)} placeholder="1" />
              </div>
            </div>
          )}

          <button className="btn-principal" onClick={guardar} disabled={guardando || !f.nombre.trim()}>
            {guardando ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Registrar alta')}
          </button>

          {/* Eliminar: escondido a propósito para evitar accidentes */}
          {esEdicion && (
            <div className="zona-avanzada">
              <button type="button" className="plegable sutil" onClick={() => setAvanzadas(v => !v)}>
                <span>Opciones avanzadas</span><span>{avanzadas ? '▲' : '▼'}</span>
              </button>
              {avanzadas && (
                <div className="zona-peligro">
                  <p>Eliminar borra a <b>{militante.nombre}</b> y todo su historial de forma <b>permanente</b>. Si solo dejó de participar, mejor usa <b>Dar de baja</b> desde su ficha: se conserva todo y se puede reactivar.</p>
                  <div className="campo">
                    <label>Escribe su nombre completo para confirmar</label>
                    <input type="text" value={confirmaNombre} placeholder={militante.nombre} onChange={e => setConfirmaNombre(e.target.value)} />
                  </div>
                  <button type="button" className="btn-peligro" onClick={confirmarEliminar}
                          disabled={eliminando || confirmaNombre.trim() !== militante.nombre.trim()}>
                    🗑 {eliminando ? 'Eliminando…' : 'Eliminar definitivamente'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
