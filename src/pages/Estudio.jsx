/**
 * Estudio.jsx
 * ───────────────────────────────────────────────────────────────
 * Coherencia en la discusión política:
 *   · Historial: qué se ha estudiado en cada reunión (y quién lo
 *     expuso), para elegir el siguiente tema con continuidad.
 *   · Biblioteca: los materiales (PDF/Word) para descargar.
 */

import { useState, useEffect } from 'react'
import { listarReuniones } from '../lib/reuniones.js'
import { listarMateriales, guardarMaterial, eliminarMaterial, TIPOS_MATERIAL, labelTipoMaterial } from '../lib/materiales.js'
import { abrirDocumento } from '../lib/archivos.js'
import { fechaDocumento, diaMes } from '../lib/fechas.js'

export default function Estudio({ ir }) {
  const [pestana, setPestana] = useState('historial')
  const [reuniones, setReuniones] = useState([])
  const [materiales, setMateriales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [editando, setEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  async function cargar() {
    setError(null)
    try {
      const [r, m] = await Promise.all([listarReuniones(), listarMateriales()])
      setReuniones(r.filter(x => x.discusion_tema)); setMateriales(m)
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  function abrir(path) { abrirDocumento(path).catch(e => alert('No se pudo abrir: ' + e.message)) }

  if (cargando) return <div className="cargando">Cargando…</div>
  if (error) return <div className="estado-error"><p>No se pudo cargar.</p><p className="estado-error-detalle">{error}</p><button className="btn-secundario" onClick={cargar}>Reintentar</button></div>

  const q = busqueda.trim().toLowerCase()
  const histFiltrado = reuniones.filter(r => !q || [r.discusion_tema, r.discusion_expone, r.material?.titulo].join(' ').toLowerCase().includes(q))
  const matFiltrados = materiales.filter(m => !q || [m.titulo, m.autor, m.notas].join(' ').toLowerCase().includes(q))
  const usos = id => reuniones.filter(r => r.material_id === id)

  return (
    <div>
      <div className="topbar">
        <div className="topbar-titulo">Estudio</div>
        <button className="btn-chico primario" onClick={() => setEditando({})}>+ Subir material</button>
      </div>

      <div className="pestanas pagina">
        <button className={pestana === 'historial' ? 'activo' : ''} onClick={() => setPestana('historial')}>Lo que hemos estudiado</button>
        <button className={pestana === 'biblioteca' ? 'activo' : ''} onClick={() => setPestana('biblioteca')}>Biblioteca ({materiales.length})</button>
      </div>

      <div className="barra-buscar">
        <input type="text" placeholder="Buscar tema, autor, material…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {pestana === 'historial' && (
        histFiltrado.length === 0
          ? <div className="vacio">Aún no hay discusiones registradas. El tema se define al programar cada reunión.</div>
          : <div className="linea-tiempo">
              {histFiltrado.map(r => (
                <div key={r.id} className="lt-item" onClick={() => ir('reuniones', { id: r.id, pestana: r.acta_lista ? 'acta' : 'orden' })}>
                  <div className="lt-fecha">{diaMes(r.fecha)}<span>{r.fecha.slice(0, 4)}</span></div>
                  <div className="lt-punto" />
                  <div className="lt-cuerpo">
                    <div className="lt-tema">
                      {r.discusion_tema}
                      {r.discusion_continuacion && <span className="badge gris" style={{ marginLeft: 6 }}>continuación</span>}
                    </div>
                    <div className="fila-meta">{r.ambito} · {fechaDocumento(r.fecha)}{r.discusion_expone ? ` · expuso ${r.discusion_expone}` : ''}{!r.acta_lista ? ' · programada' : ''}</div>
                    {r.material && (
                      <button className="material-chip" onClick={e => { e.stopPropagation(); r.material.archivo_path && abrir(r.material.archivo_path) }}>
                        📄 {r.material.titulo}{r.material.archivo_path ? ' ›' : ''}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
      )}

      {pestana === 'biblioteca' && (
        matFiltrados.length === 0
          ? <div className="vacio">La biblioteca está vacía. Sube los textos que estudian (PDF o Word) para tenerlos a la mano.</div>
          : matFiltrados.map(m => (
            <div key={m.id} className="fila-militante" onClick={() => setEditando(m)}>
              <div className="avatar" style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--muted)' }}>📄</div>
              <div className="fila-info">
                <div className="fila-nombre">{m.titulo} <span className="mini-etiqueta cond">{labelTipoMaterial(m.tipo)}</span></div>
                <div className="fila-meta">
                  {m.autor || 'Autor sin registrar'}
                  {usos(m.id).length > 0 && ` · discutido ${usos(m.id).length} vez/veces (último ${diaMes(usos(m.id)[0].fecha)})`}
                </div>
              </div>
              {m.archivo_path && <button className="btn-chico" onClick={e => { e.stopPropagation(); abrir(m.archivo_path) }}>Abrir</button>}
            </div>
          ))
      )}

      {editando && (
        <FormMaterial m={editando} onCerrar={() => setEditando(null)} onGuardado={async () => { setEditando(null); await cargar(); setPestana('biblioteca') }} />
      )}
    </div>
  )
}

function FormMaterial({ m, onCerrar, onGuardado }) {
  const esEdicion = !!m.id
  const [f, setF] = useState({ titulo: m.titulo || '', autor: m.autor || '', tipo: m.tipo || 'texto', notas: m.notas || '' })
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const set = (c, v) => setF(prev => ({ ...prev, [c]: v }))

  async function guardar() {
    if (!f.titulo.trim()) return
    setGuardando(true)
    try { await guardarMaterial(f, archivo, esEdicion ? m : null); onGuardado() }
    catch (e) { alert('No se pudo guardar: ' + e.message); setGuardando(false) }
  }

  async function borrar() {
    if (!confirm(`¿Eliminar "${m.titulo}" de la biblioteca? Las reuniones que lo usaron se quedan, solo sin el archivo.`)) return
    try { await eliminarMaterial(m); onGuardado() }
    catch (e) { alert('No se pudo eliminar: ' + e.message) }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-hoja" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div className="modal-titulo">{esEdicion ? 'Editar material' : 'Subir material'}</div>
          <button className="cerrar" onClick={onCerrar}>✕</button>
        </div>
        <div className="modal-cuerpo">
          <div className="campo"><label>Título *</label><input type="text" value={f.titulo} onChange={e => set('titulo', e.target.value)} /></div>
          <div className="campo-fila">
            <div className="campo"><label>Autor</label><input type="text" value={f.autor} onChange={e => set('autor', e.target.value)} /></div>
            <div className="campo"><label>Tipo</label>
              <select value={f.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS_MATERIAL.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="campo">
            <label>Archivo (PDF o Word){esEdicion && m.archivo_nombre ? ` — actual: ${m.archivo_nombre}` : ''}</label>
            <input type="file" accept=".pdf,.doc,.docx,.odt,.txt,.epub" onChange={e => setArchivo(e.target.files[0] || null)} />
            {esEdicion && m.archivo_path && <div className="nota-inline">Si eliges otro archivo, reemplaza al actual.</div>}
          </div>
          <div className="campo"><label>Notas</label><textarea rows={3} value={f.notas} placeholder="Capítulos a leer, preguntas guía…" onChange={e => set('notas', e.target.value)} /></div>
          <button className="btn-principal" disabled={guardando || !f.titulo.trim()} onClick={guardar}>{guardando ? 'Subiendo…' : 'Guardar'}</button>
          {esEdicion && <button className="btn-secundario peligro" onClick={borrar}>Eliminar de la biblioteca</button>}
        </div>
      </div>
    </div>
  )
}
