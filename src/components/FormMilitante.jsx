/**
 * FormMilitante.jsx
 * ───────────────────────────────────────────────────────────────
 * Alta y edición. Si recibe un militante con id, es edición;
 * si recibe {}, es alta nueva.
 */

import { useState } from 'react'
import { CONDICIONES, labelCondicion } from '../lib/militantes.js'
import { PALETA, hexToRgba, iniciales } from '../lib/colores.js'

const hoy = () => new Date().toISOString().slice(0, 10)

export default function FormMilitante({ militante, gruposBase, etiquetas, onGuardar, onCerrar }) {
  const esEdicion = !!militante.id

  const [f, setF] = useState({
    nombre:           militante.nombre || '',
    telefono:         militante.telefono || '',
    correo:           militante.correo || '',
    condicion:        militante.condicion || 'militante_trabajador',
    grupo_base_id:    militante.grupo_base_id || (gruposBase[0]?.id || ''),
    color_individual: militante.color_individual || '#5B8DD9',
    cuota_monto:      militante.cuota_monto || '',
    cuota_dia:        militante.cuota_dia || '',
    fecha_alta:       militante.fecha_alta || hoy(),
    referencia:       militante.referencia || '',
    actividad:        militante.actividad || '',
    notas:            militante.notas || '',
  })
  const [etiqSel, setEtiqSel] = useState(militante.etiquetas || [])
  const [guardando, setGuardando] = useState(false)

  function set(campo, valor) { setF(prev => ({ ...prev, [campo]: valor })) }

  function toggleEtiqueta(id) {
    setEtiqSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function guardar() {
    if (!f.nombre.trim()) return
    setGuardando(true)
    const datos = {
      ...f,
      cuota_monto: Number(f.cuota_monto) || 0,
      cuota_dia: Number(f.cuota_dia) || 1,
      grupo_base_id: f.grupo_base_id || null,
      etiquetas: etiqSel,
    }
    await onGuardar(datos, militante.id)
    setGuardando(false)
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-hoja" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">{esEdicion ? `Editar — ${militante.nombre}` : 'Nuevo alta'}</div>
          <button className="cerrar" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal-cuerpo">
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
              <span className="preview-nota">vista del avatar</span>
            </div>
          </div>

          <div className="campo-fila">
            <div className="campo">
              <label>Cuota mensual ($) *</label>
              <input type="number" value={f.cuota_monto} onChange={e => set('cuota_monto', e.target.value)} placeholder="350" />
            </div>
            <div className="campo">
              <label>Día de pago *</label>
              <input type="number" min="1" max="31" value={f.cuota_dia} onChange={e => set('cuota_dia', e.target.value)} placeholder="15" />
            </div>
          </div>

          <div className="campo">
            <label>Fecha de alta *</label>
            <input type="date" value={f.fecha_alta} onChange={e => set('fecha_alta', e.target.value)} />
          </div>

          <div className="campo-fila">
            <div className="campo">
              <label>Referencia</label>
              <input type="text" value={f.referencia} onChange={e => set('referencia', e.target.value)} placeholder="¿Quién lo invitó?" />
            </div>
            <div className="campo">
              <label>Actividad</label>
              <input type="text" value={f.actividad} onChange={e => set('actividad', e.target.value)} placeholder="Difusión, logística…" />
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

          <button className="btn-principal" onClick={guardar} disabled={guardando || !f.nombre.trim()}>
            {guardando ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Registrar alta')}
          </button>
        </div>
      </div>
    </div>
  )
}
