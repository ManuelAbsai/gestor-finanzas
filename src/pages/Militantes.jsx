/**
 * Militantes.jsx
 * ───────────────────────────────────────────────────────────────
 * Padrón conectado a Supabase: lista con filtros, alta/edición,
 * y perfil. Los datos vienen de la capa lib/.
 */

import { useState, useEffect } from 'react'
import {
  listarMilitantes, crearMilitante, actualizarMilitante,
  darDeBajaMilitante, reactivarMilitante, subirFotoPerfil, urlFotoPerfil,
  CONDICIONES, labelCondicion,
} from '../lib/militantes.js'
import { listarGruposBase, listarEtiquetas, listarActividades } from '../lib/catalogos.js'
import { listarPagos, periodoActual } from '../lib/pagos.js'
import { estadoCuota, ESTADO_META } from '../lib/remisiones.js'
import { PALETA, hexToRgba, iniciales } from '../lib/colores.js'
import FichaMilitante from '../components/FichaMilitante.jsx'
import FormMilitante from '../components/FormMilitante.jsx'

export default function Militantes() {
  const [militantes, setMilitantes] = useState([]) // solo activos
  const [inactivos, setInactivos]   = useState([])
  const [gruposBase, setGruposBase] = useState([])
  const [etiquetas, setEtiquetas]   = useState([])
  const [actividades, setActividades] = useState([])
  const [pagos, setPagos]           = useState([])
  const [fotos, setFotos]           = useState({}) // id -> url firmada
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)

  // Filtros
  const [busqueda, setBusqueda]         = useState('')
  const [fCondicion, setFCondicion]     = useState('')
  const [fEstado, setFEstado]           = useState('')
  const [fGrupoBase, setFGrupoBase]     = useState('')
  const [fEtiqueta, setFEtiqueta]       = useState('')
  const [fActividad, setFActividad]     = useState('')

  // Modales
  const [fichaId, setFichaId]     = useState(null)   // ver perfil
  const [editando, setEditando]   = useState(null)   // objeto militante o {} para nuevo
  const [toast, setToast]         = useState(null)
  const [bajasAbierto, setBajasAbierto] = useState(false)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [todos, gb, et, ac, pg] = await Promise.all([
        listarMilitantes({ incluirInactivos: true }),
        listarGruposBase(),
        listarEtiquetas(),
        listarActividades(),
        listarPagos(),
      ])
      const activos = todos.filter(m => m.activo !== false)
      const bajas    = todos.filter(m => m.activo === false)
      setMilitantes(activos)
      setInactivos(bajas)
      setGruposBase(gb)
      setEtiquetas(et)
      setActividades(ac)
      setPagos(pg)

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

  // ── Set de ids que pagaron el mes en curso (solo cuenta para activos) ──
  const periodo = periodoActual()
  const idsPagaronEsteMes = new Set(
    pagos.filter(p => (p.meses_cubre || []).includes(periodo)).map(p => p.militante_id)
  )

  function estadoDe(m) {
    return estadoCuota(m, idsPagaronEsteMes.has(m.id))
  }

  // ── Filtrado (solo sobre activos) ──
  const busq = busqueda.trim().toLowerCase()
  const filtrados = militantes.filter(m => {
    const coincide = !busq
      || m.nombre.toLowerCase().includes(busq)
      || (m.telefono || '').includes(busq)
    if (!coincide) return false
    if (fCondicion && m.condicion !== fCondicion) return false
    if (fEstado && estadoDe(m) !== fEstado) return false
    if (fGrupoBase && m.grupo_base_id !== fGrupoBase) return false
    if (fEtiqueta && !(m.etiquetas || []).includes(fEtiqueta)) return false
    if (fActividad && m.actividad_id !== fActividad) return false
    return true
  })

  // Conteos para badges (solo activos — los inactivos no afectan nada financiero)
  const conteos = { vencido: 0, por_vencer: 0, pendiente: 0, pagado: 0 }
  militantes.forEach(m => { conteos[estadoDe(m)]++ })

  function limpiarFiltros() {
    setBusqueda(''); setFCondicion(''); setFEstado(''); setFGrupoBase(''); setFEtiqueta(''); setFActividad('')
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
    const numPagos = (m._numPagos ?? pagos.filter(p => p.militante_id === m.id).length)
    const msg = numPagos > 0
      ? `¿Dar de baja a ${m.nombre}? Tiene ${numPagos} pago(s) registrado(s) — se conservan en su historial. Dejará de contar en el % de cobranza y en "requieren atención".`
      : `¿Dar de baja a ${m.nombre}? Dejará de aparecer en la lista activa (se puede reactivar).`
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
        <button className="btn-chico primario" onClick={() => setEditando({})}>
          + Nuevo alta
        </button>
      </div>

      {/* Resumen */}
      <div className="fila-badges">
        <span className="badge gris">{militantes.length} activos</span>
        {conteos.vencido    > 0 && <span className="badge rojo">{conteos.vencido} vencidas</span>}
        {conteos.por_vencer > 0 && <span className="badge ambar">{conteos.por_vencer} por vencer</span>}
        {conteos.pagado     > 0 && <span className="badge verde">{conteos.pagado} al corriente</span>}
      </div>

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
        <select value={fEstado} onChange={e => setFEstado(e.target.value)}>
          <option value="">Estado: todos</option>
          <option value="vencido">Vencido</option>
          <option value="por_vencer">Por vencer</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
        </select>
        <select value={fGrupoBase} onChange={e => setFGrupoBase(e.target.value)}>
          <option value="">Grupo base: todos</option>
          {gruposBase.map(gb => <option key={gb.id} value={gb.id}>{gb.nombre}</option>)}
        </select>
        <select value={fEtiqueta} onChange={e => setFEtiqueta(e.target.value)}>
          <option value="">Etiqueta: todas</option>
          {etiquetas.map(et => <option key={et.id} value={et.id}>{et.nombre}</option>)}
        </select>
        <select value={fActividad} onChange={e => setFActividad(e.target.value)}>
          <option value="">Actividad: todas</option>
          {actividades.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <button className="btn-chico" onClick={limpiarFiltros}>Limpiar</button>
      </div>

      {/* Lista */}
      {filtrados.length === 0
        ? <div className="vacio">Sin resultados. Ajusta los filtros o registra un alta.</div>
        : filtrados.map(m => {
            const estado = estadoDe(m)
            const em = ESTADO_META[estado]
            const colorInd = m.color_individual || '#5B8DD9'
            return (
              <div key={m.id} className="fila-militante" style={{ borderLeftColor: colorInd }}
                   onClick={() => setFichaId(m.id)}>
                {avatarDe(m, 34)}
                <div className="fila-info">
                  <div className="fila-nombre">
                    {m.nombre}
                    <span className="mini-etiqueta cond">{labelCondicion(m.condicion)}</span>
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
                  <div className="fila-meta">${m.cuota_monto} · Día {m.cuota_dia} de cada mes</div>
                </div>
                <div className="fila-estado">
                  <div className="fila-monto">${m.cuota_monto}</div>
                  <span className={`badge ${em.clase}`}>{em.label}</span>
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
                <div key={m.id} className="fila-militante inactivo" style={{ borderLeftColor: 'var(--border)' }}>
                  {avatarDe(m, 30)}
                  <div className="fila-info">
                    <div className="fila-nombre">{m.nombre}</div>
                  </div>
                  <button className="btn-chico" onClick={() => reactivar(m)}>Reactivar</button>
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
        />
      )}

      {/* Formulario alta/edición */}
      {editando !== null && (
        <FormMilitante
          militante={editando}
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
