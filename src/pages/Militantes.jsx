/**
 * Militantes.jsx
 * ───────────────────────────────────────────────────────────────
 * Padrón conectado a Supabase: lista con filtros, alta/edición,
 * baja/reactivación y perfil. Las cuotas y pagos quedaron en el
 * archivo de finanzas (Ajustes), ya no se muestran aquí.
 */

import { useState, useEffect } from 'react'
import {
  listarMilitantes, crearMilitante, actualizarMilitante,
  darDeBajaMilitante, reactivarMilitante, subirFotoPerfil, urlFotoPerfil,
  CONDICIONES, CATEGORIAS_SOCIALES, labelCondicion, labelCategoria,
} from '../lib/militantes.js'
import { listarGruposBase, listarEtiquetas, listarActividades } from '../lib/catalogos.js'
import { exportarPadronExcel, exportarPadronPDF, textoHojaRegional, resumenCategorias } from '../lib/exportar.js'
import { copiarTexto } from '../lib/archivos.js'
import { hexToRgba, iniciales } from '../lib/colores.js'
import FichaMilitante from '../components/FichaMilitante.jsx'
import FormMilitante from '../components/FormMilitante.jsx'

export default function Militantes() {
  const [militantes, setMilitantes] = useState([]) // solo activos
  const [inactivos, setInactivos]   = useState([])
  const [gruposBase, setGruposBase] = useState([])
  const [etiquetas, setEtiquetas]   = useState([])
  const [actividades, setActividades] = useState([])
  const [fotos, setFotos]           = useState({}) // id -> url firmada
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)

  // Filtros
  const [busqueda, setBusqueda]         = useState('')
  const [fCondicion, setFCondicion]     = useState('')
  const [fGrupoBase, setFGrupoBase]     = useState('')
  const [fEtiqueta, setFEtiqueta]       = useState('')
  const [fActividad, setFActividad]     = useState('')
  const [fCategoria, setFCategoria]     = useState('')
  const [verRegional, setVerRegional]   = useState(false)
  const [conBajas, setConBajas]         = useState(false)

  // Modales
  const [fichaId, setFichaId]     = useState(null)   // ver perfil
  const [editando, setEditando]   = useState(null)   // objeto militante o {} para nuevo
  const [toast, setToast]         = useState(null)
  const [bajasAbierto, setBajasAbierto] = useState(false)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [todos, gb, et, ac] = await Promise.all([
        listarMilitantes({ incluirInactivos: true }),
        listarGruposBase(),
        listarEtiquetas(),
        listarActividades(),
      ])
      const activos = todos.filter(m => m.activo !== false)
      const bajas    = todos.filter(m => m.activo === false)
      setMilitantes(activos)
      setInactivos(bajas)
      setGruposBase(gb)
      setEtiquetas(et)
      setActividades(ac)

      // Resolver URLs firmadas de las fotos que tengan
      const conFoto = todos.filter(m => m.foto_path)
      const urls = {}
      await Promise.all(conFoto.map(async m => {
        urls[m.id] = await urlFotoPerfil(m.foto_path)
      }))
      setFotos(urls)
    } catch (e) {
      setError(e.message || 'No se pudieron cargar los datos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  function mostrarToast(msg, tipo = 'ok') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 2800)
  }

  // ── Filtrado (solo sobre activos) ──
  const busq = busqueda.trim().toLowerCase()
  const busqDigitos = busq.replace(/\D/g, '')
  const filtrados = militantes.filter(m => {
    const coincide = !busq
      || m.nombre.toLowerCase().includes(busq)
      || (busqDigitos.length >= 3 && (m.telefono || '').replace(/\D/g, '').includes(busqDigitos))
    if (!coincide) return false
    if (fCondicion && m.condicion !== fCondicion) return false
    if (fGrupoBase && m.grupo_base_id !== fGrupoBase) return false
    if (fEtiqueta && !(m.etiquetas || []).includes(fEtiqueta)) return false
    if (fActividad && m.actividad_id !== fActividad) return false
    if (fCategoria === '_sin' ? m.categoria : (fCategoria && m.categoria !== fCategoria)) return false
    return true
  })

  const porCondicion = CONDICIONES.map(c => ({ ...c, n: militantes.filter(m => m.condicion === c.id).length }))

  function limpiarFiltros() {
    setBusqueda(''); setFCondicion(''); setFGrupoBase(''); setFEtiqueta(''); setFActividad(''); setFCategoria('')
  }

  const hayFiltros = !!(busqueda || fCondicion || fGrupoBase || fEtiqueta || fActividad || fCategoria)
  const bajasFiltradas = inactivos.filter(m => !fGrupoBase || m.grupo_base_id === fGrupoBase)
  const paraHoja = conBajas ? [...filtrados, ...bajasFiltradas] : filtrados
  const resumenCat = resumenCategorias(filtrados)
  const faltan = {
    categoria: filtrados.filter(m => !m.categoria).length,
    folio: filtrados.filter(m => !m.folio).length,
    papel: filtrados.filter(m => !m.actividad_id).length,
  }

  async function copiarHoja() {
    if (paraHoja.length === 0) return
    const ok = await copiarTexto(textoHojaRegional(paraHoja))
    mostrarToast(ok ? `${paraHoja.length} fila(s) copiadas. Pégalas en la primera fila vacía de la hoja ✓` : 'No se pudo copiar', ok ? 'ok' : 'error')
  }

  async function exportar(formato) {
    try {
      if (militantes.length === 0) return
      if (formato === 'excel') await exportarPadronExcel(militantes)
      else exportarPadronPDF(militantes)
      mostrarToast(`${formato === 'excel' ? 'Excel' : 'PDF'} descargado ✓`)
    } catch (e) { mostrarToast('Error al exportar: ' + e.message, 'error') }
  }

  async function guardarMilitante(datos, id, archivoFotoNuevaAlta) {
    try {
      if (id) {
        await actualizarMilitante(id, datos)
        mostrarToast('Cambios guardados')
      } else {
        const creado = await crearMilitante(datos)
        // Si es alta nueva y venía foto, se sube ahora que ya existe el id
        if (archivoFotoNuevaAlta) {
          const ruta = await subirFotoPerfil(archivoFotoNuevaAlta, creado.id)
          await actualizarMilitante(creado.id, { foto_path: ruta })
        }
        mostrarToast('Alta registrada')
      }
      setEditando(null)
      await cargar()
    } catch (e) {
      mostrarToast('Error: ' + e.message, 'error')
    }
  }

  async function confirmarDarDeBaja(m) {
    const msg = `¿Dar de baja a ${m.nombre}? Dejará de aparecer en la lista activa; su historial se conserva y se puede reactivar.`
    if (!confirm(msg)) return
    try {
      await darDeBajaMilitante(m.id)
      mostrarToast(`${m.nombre} dado de baja`, 'ok')
      await cargar()
    } catch (e) {
      mostrarToast('Error: ' + e.message, 'error')
    }
  }

  async function reactivar(m) {
    try {
      await reactivarMilitante(m.id)
      mostrarToast(`${m.nombre} reactivado ✓`)
      await cargar()
    } catch (e) {
      mostrarToast('Error: ' + e.message, 'error')
    }
  }

  function onEliminado(id) {
    setEditando(null)
    setFichaId(null)
    mostrarToast('Militante eliminado')
    cargar()
  }

  function avatarDe(m, tam = 34) {
    const url = fotos[m.id]
    if (url) {
      return (
        <div style={{ width: tam, height: tam, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: `2px solid ${m.color_individual}` }}>
          <img src={url} alt={m.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )
    }
    const colorInd = m.color_individual || '#5B8DD9'
    return (
      <div className="avatar" style={{ width: tam, height: tam, background: hexToRgba(colorInd, 0.18), borderColor: colorInd, color: colorInd }}>
        {iniciales(m.nombre)}
      </div>
    )
  }

  if (cargando) return <div className="cargando">Cargando militantes…</div>

  if (error) {
    return (
      <div className="estado-error">
        <p>No se pudieron cargar los datos.</p>
        <p className="estado-error-detalle">{error}</p>
        <button className="btn-secundario" onClick={cargar}>Reintentar</button>
      </div>
    )
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-titulo">Militantes</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-chico" onClick={() => exportar('excel')} title="Descargar el padrón en Excel">⬇ Excel</button>
          <button className="btn-chico" onClick={() => exportar('pdf')} title="Descargar el padrón en PDF">⬇ PDF</button>
          <button className="btn-chico primario" onClick={() => setEditando({})}>+ Nuevo alta</button>
        </div>
      </div>

      {/* Resumen */}
      <div className="fila-badges">
        <span className="badge gris">{militantes.length} activos</span>
        {porCondicion.filter(c => c.n > 0).map(c => <span key={c.id} className="badge gris">{c.n} {c.label.toLowerCase()}</span>)}
        {inactivos.length > 0 && <span className="badge rojo">{inactivos.length} de baja</span>}
      </div>

      {/* Crecimiento regional: militancia por categoría + copiar a la hoja */}
      <button className="plegable panel-regional-toggle" onClick={() => setVerRegional(v => !v)}>
        <span>Crecimiento regional · militancia total {resumenCat.total}{hayFiltros ? ' (con tus filtros)' : ''}</span>
        <span>{verRegional ? '▲' : '▼'}</span>
      </button>
      {verRegional && (
        <div className="panel-regional">
          {/* Escritorio: igual que la hoja (categorías en columnas) */}
          <div className="tabla-scroll solo-escritorio">
            <table className="tabla-simple tabla-categorias">
              <thead>
                <tr><th></th>{resumenCat.filas.filter(c => c.id || c.n).map(c => <th key={c.id || 'sin'}>{c.label}</th>)}<th>Total</th></tr>
              </thead>
              <tbody>
                <tr><td>Neto</td>{resumenCat.filas.filter(c => c.id || c.n).map(c => <td key={c.id || 'sin'}>{c.n}</td>)}<td><b>{resumenCat.total}</b></td></tr>
                <tr><td>%</td>{resumenCat.filas.filter(c => c.id || c.n).map(c => <td key={c.id || 'sin'}>{c.pct.toFixed(2)}%</td>)}<td><b>{resumenCat.total ? '100.00%' : '0%'}</b></td></tr>
              </tbody>
            </table>
          </div>
          {/* Celular: categorías en filas */}
          <table className="tabla-simple tabla-categorias solo-movil">
            <thead><tr><th>Categoría</th><th>Neto</th><th>%</th></tr></thead>
            <tbody>
              {resumenCat.filas.filter(c => c.id || c.n).map(c => (
                <tr key={c.id || 'sin'}><td>{c.label}</td><td>{c.n}</td><td>{c.pct.toFixed(2)}%</td></tr>
              ))}
              <tr><td><b>Total</b></td><td><b>{resumenCat.total}</b></td><td><b>{resumenCat.total ? '100.00%' : '0%'}</b></td></tr>
            </tbody>
          </table>
          {(faltan.categoria > 0 || faltan.folio > 0 || faltan.papel > 0) && (
            <div className="aviso-suave">
              Te falta llenar:
              {faltan.categoria > 0 && <> <button className="enlace-chico" onClick={() => setFCategoria('_sin')}>{faltan.categoria} sin categoría</button></>}
              {faltan.folio > 0 && <> · {faltan.folio} sin folio</>}
              {faltan.papel > 0 && <> · {faltan.papel} sin papel en el GB</>}
            </div>
          )}
          <div className="acciones-fila">
            <button className="btn-copiar" onClick={copiarHoja} disabled={paraHoja.length === 0}>📋 Copiar para la hoja regional ({paraHoja.length})</button>
            {bajasFiltradas.length > 0 && (
              <label className="check-linea">
                <input type="checkbox" checked={conBajas} onChange={e => setConBajas(e.target.checked)} />
                Incluir {bajasFiltradas.length} de baja (salen con estatus "Baja")
              </label>
            )}
          </div>
          <p className="panel-desc">
            Copia una fila por camarada con las columnas en el orden de la hoja: Camarada, Fecha de ingreso,
            Responsable de seguimiento, Categoría, Estatus, Papel en el GB, Lugar, Comentarios (tus notas) y Folio.
            En Google Sheets da clic en la primera celda vacía de la columna “Camarada” y pega.
            Si quieres solo tu GB, filtra antes por grupo base.
          </p>
        </div>
      )}

      {/* Buscador */}
      <div className="barra-buscar">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Filtros */}
      <div className="barra-filtros">
        <span className="filtro-etiqueta">Filtrar:</span>
        <select value={fCondicion} onChange={e => setFCondicion(e.target.value)}>
          <option value="">Condición: todas</option>
          {CONDICIONES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={fGrupoBase} onChange={e => setFGrupoBase(e.target.value)}>
          <option value="">Grupo base: todos</option>
          {gruposBase.map(gb => <option key={gb.id} value={gb.id}>{gb.nombre}</option>)}
        </select>
        <select value={fEtiqueta} onChange={e => setFEtiqueta(e.target.value)}>
          <option value="">Etiqueta: todas</option>
          {etiquetas.map(et => <option key={et.id} value={et.id}>{et.nombre}</option>)}
        </select>
        <select value={fCategoria} onChange={e => setFCategoria(e.target.value)}>
          <option value="">Categoría: todas</option>
          {CATEGORIAS_SOCIALES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          <option value="_sin">Sin categoría</option>
        </select>
        <select value={fActividad} onChange={e => setFActividad(e.target.value)}>
          <option value="">Papel en el GB: todos</option>
          {actividades.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <button className="btn-chico" onClick={limpiarFiltros}>Limpiar</button>
      </div>

      {/* Lista */}
      {filtrados.length === 0
        ? <div className="vacio">Sin resultados. Ajusta los filtros o registra un alta.</div>
        : filtrados.map(m => {
            const colorInd = m.color_individual || '#5B8DD9'
            return (
              <div key={m.id} className="fila-militante" style={{ borderLeftColor: colorInd }}
                   onClick={() => setFichaId(m.id)}>
                {avatarDe(m, 34)}
                <div className="fila-info">
                  <div className="fila-nombre">
                    {m.nombre}
                    <span className="mini-etiqueta cond">{labelCondicion(m.condicion)}</span>
                    {m.categoria && labelCategoria(m.categoria) !== labelCondicion(m.condicion) && <span className="mini-etiqueta cond">{labelCategoria(m.categoria)}</span>}
                    {(m.etiquetas || []).map(eid => {
                      const et = etiquetas.find(x => x.id === eid)
                      if (!et) return null
                      return (
                        <span key={eid} className="mini-etiqueta" style={{
                          background: hexToRgba(et.color, 0.18),
                          color: et.color,
                          borderColor: hexToRgba(et.color, 0.35),
                        }}>{et.nombre}</span>
                      )
                    })}
                  </div>
                  <div className="fila-meta">
                    {[m.folio && `#${m.folio}`, m.grupo_base_nombre, m.actividad_nombre, m.ciudad, m.telefono].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <button
                  title="Dar de baja"
                  onClick={e => { e.stopPropagation(); confirmarDarDeBaja(m) }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, flexShrink: 0, padding: 4 }}
                >⏸</button>
              </div>
            )
          })
      }

      {/* Sección plegada: dados de baja */}
      {inactivos.length > 0 && (
        <>
          <div className="bajas-toggle" onClick={() => setBajasAbierto(v => !v)}>
            <span>▾ {inactivos.length} dado(s) de baja</span>
            <span>{bajasAbierto ? '▲ ocultar' : '▼ mostrar'}</span>
          </div>
          {bajasAbierto && (
            <div>
              {inactivos.map(m => (
                <div key={m.id} className="fila-militante inactivo" style={{ borderLeftColor: 'var(--border)' }} onClick={() => setFichaId(m.id)}>
                  {avatarDe(m, 30)}
                  <div className="fila-info">
                    <div className="fila-nombre">{m.nombre}</div>
                  </div>
                  <button className="btn-chico" onClick={e => { e.stopPropagation(); reactivar(m) }}>Reactivar</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Ficha (perfil) */}
      {fichaId && (
        <FichaMilitante
          militanteId={fichaId}
          etiquetas={etiquetas}
          fotoUrl={fotos[fichaId]}
          onCerrar={() => setFichaId(null)}
          onEditar={(m) => { setFichaId(null); setEditando(m) }}
          onCambio={cargar}
          onBaja={(m) => { setFichaId(null); confirmarDarDeBaja(m) }}
        />
      )}

      {/* Formulario alta/edición */}
      {editando !== null && (
        <FormMilitante
          militante={editando}
          padron={militantes}
          gruposBase={gruposBase}
          etiquetas={etiquetas}
          actividades={actividades}
          fotoUrlInicial={editando.id ? fotos[editando.id] : null}
          onGuardar={guardarMilitante}
          onCerrar={() => setEditando(null)}
          onCatalogosCambio={cargar}
          onEliminado={onEliminado}
        />
      )}

      {toast && <div className={`toast ${toast.tipo}`}>{toast.msg}</div>}
    </div>
  )
}
