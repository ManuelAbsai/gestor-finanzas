/**
 * Inicio.jsx
 * ───────────────────────────────────────────────────────────────
 * Lo que hay que atender: la próxima reunión y su orden del día,
 * reuniones sin acta, acuerdos/tareas pendientes y aspirantes a
 * los que toca llamar.
 */

import { useState, useEffect } from 'react'
import {
  listarReuniones, obtenerReunion, listarAcuerdos, cambiarEstadoAcuerdo,
  estadoReunion, textoOrdenDelDia, CATEGORIAS,
} from '../lib/reuniones.js'
import { listarAspirantes, metaEstadoAspirante } from '../lib/aspirantes.js'
import { listarMilitantes } from '../lib/militantes.js'
import { copiarTexto } from '../lib/archivos.js'
import { hoyISO, sumarDias, fechaLarga, horaTexto, diaMes, diasHasta } from '../lib/fechas.js'

export default function Inicio({ ir }) {
  const [d, setD] = useState(null)
  const [error, setError] = useState(null)
  const [copiado, setCopiado] = useState(false)

  async function cargar() {
    setError(null)
    try {
      const [reuniones, pendientes, aspirantes, militantes] = await Promise.all([
        listarReuniones(), listarAcuerdos({ soloPendientes: true }), listarAspirantes(), listarMilitantes(),
      ])
      const hoy = hoyISO()
      const proxima = reuniones.filter(r => r.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null
      const detalleProxima = proxima ? await obtenerReunion(proxima.id) : null
      const sinActa = reuniones.filter(r => estadoReunion(r) === 'falta_acta')
      const limite = sumarDias(hoy, 3)
      const porLlamar = aspirantes
        .filter(a => a.estado === 'contactado' || a.estado === 'en_seguimiento')
        .filter(a => !a.proxima_accion || a.proxima_accion <= limite)
        .sort((a, b) => (a.proxima_accion || '0').localeCompare(b.proxima_accion || '0'))
      setD({ proxima: detalleProxima, sinActa, pendientes, porLlamar, aspirantesActivos: aspirantes.filter(a => ['contactado','en_seguimiento'].includes(a.estado)).length, militantes: militantes.length })
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { cargar() }, [])

  async function marcar(a) {
    try { await cambiarEstadoAcuerdo(a.id, 'cumplido'); await cargar() }
    catch (e) { alert('Error: ' + e.message) }
  }

  async function copiarOrden() {
    const ok = await copiarTexto(textoOrdenDelDia(d.proxima.reunion, d.proxima.puntos))
    setCopiado(ok); setTimeout(() => setCopiado(false), 1800)
  }

  if (error) return (
    <div className="estado-error">
      <p>No se pudo cargar el inicio.</p>
      <p className="estado-error-detalle">{error}</p>
      <button className="btn-secundario" onClick={cargar}>Reintentar</button>
    </div>
  )
  if (!d) return <div className="cargando">Cargando…</div>

  const px = d.proxima?.reunion
  const dias = px ? diasHasta(px.fecha) : null

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-titulo">Inicio</div>
          <div className="topbar-sub">{fechaLarga(hoyISO())}</div>
        </div>
        <button className="btn-chico primario" onClick={() => ir('reuniones', { nueva: true })}>+ Programar reunión</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi clic" onClick={() => px ? ir('reuniones', { id: px.id }) : ir('reuniones', { nueva: true })}>
          <div className="kpi-label">Próxima reunión</div>
          <div className="kpi-valor chico">{px ? (dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : diaMes(px.fecha)) : '—'}</div>
          <div className="kpi-sub">{px ? `${px.ambito} · ${horaTexto(px.hora)}` : 'Sin programar'}</div>
        </div>
        <div className="kpi clic" onClick={() => ir('reuniones')}>
          <div className="kpi-label">Actas pendientes</div>
          <div className={`kpi-valor ${d.sinActa.length ? 'ambar' : 'verde'}`}>{d.sinActa.length}</div>
          <div className="kpi-sub">reuniones sin acta</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Acuerdos y tareas</div>
          <div className={`kpi-valor ${d.pendientes.length ? 'ambar' : 'verde'}`}>{d.pendientes.length}</div>
          <div className="kpi-sub">pendientes</div>
        </div>
        <div className="kpi clic" onClick={() => ir('aspirantes')}>
          <div className="kpi-label">Aspirantes</div>
          <div className="kpi-valor">{d.aspirantesActivos}</div>
          <div className="kpi-sub">{d.porLlamar.length ? `${d.porLlamar.length} por llamar` : 'en seguimiento'}</div>
        </div>
      </div>

      {/* Próxima reunión */}
      <section className="panel dash-panel">
        <div className="panel-cabecera">
          <div className="panel-titulo">
            {px ? `Orden del día — ${fechaLarga(px.fecha)}` : 'Próxima reunión'}
          </div>
          {px && <button className="panel-accion" onClick={() => ir('reuniones', { id: px.id })}>Abrir →</button>}
        </div>
        {!px ? (
          <div className="dash-todo-ok">
            No hay reunión programada.
            <div style={{ marginTop: 10 }}>
              <button className="btn-chico primario" onClick={() => ir('reuniones', { nueva: true })}>Programar con la plantilla</button>
            </div>
          </div>
        ) : (
          <div className="panel-cuerpo">
            {px.discusion_tema && (
              <div className="inicio-discusion">
                <span className="filtro-etiqueta">Discusión política</span>
                <div>{px.discusion_tema}{px.discusion_continuacion ? ' — continuación' : ''}{px.discusion_expone ? ` · ${px.discusion_expone}` : ''}</div>
              </div>
            )}
            {CATEGORIAS.map(cat => {
              const lista = d.proxima.puntos.filter(p => p.categoria === cat.id)
              if (!lista.length) return null
              return (
                <div key={cat.id} className="inicio-cat">
                  <span className="filtro-etiqueta">{cat.label}</span>
                  {lista.map(p => <div key={p.id} className="inicio-punto">· {p.texto}{p.responsable ? <span> — {p.responsable}</span> : ''}</div>)}
                </div>
              )
            })}
            <button className="btn-copiar" style={{ marginTop: 12 }} onClick={copiarOrden}>
              {copiado ? '✓ Copiado' : '📋 Copiar orden del día para WhatsApp'}
            </button>
          </div>
        )}
      </section>

      {/* Reuniones sin acta */}
      {d.sinActa.length > 0 && (
        <section className="panel dash-panel">
          <div className="panel-cabecera"><div className="panel-titulo">Falta levantar acta</div></div>
          {d.sinActa.map(r => (
            <div key={r.id} className="dash-item">
              <div className="dash-item-info">
                <div className="dash-item-nombre">{r.ambito} · {fechaLarga(r.fecha)}</div>
                <div className="dash-item-meta">{r.discusion_tema || 'Sin tema'}</div>
              </div>
              <button className="btn-chico primario" onClick={() => ir('reuniones', { id: r.id, pestana: 'acta', acta: true })}>Levantar acta</button>
            </div>
          ))}
        </section>
      )}

      {/* Pendientes */}
      <section className="panel dash-panel">
        <div className="panel-cabecera"><div className="panel-titulo">Acuerdos y tareas pendientes</div></div>
        {d.pendientes.length === 0
          ? <div className="dash-todo-ok">Todo al corriente.</div>
          : d.pendientes.map(a => (
            <div key={a.id} className="dash-item">
              <button className="check" title="Marcar como cumplido" onClick={() => marcar(a)} />
              <div className="dash-item-info">
                <div className="dash-item-nombre normal">{a.texto}</div>
                <div className="dash-item-meta">
                  <span className={`badge ${a.tipo === 'tarea' ? 'ambar' : 'verde'}`}>{a.tipo === 'tarea' ? 'Tarea' : 'Acuerdo'}</span>
                  {' '}Acta {a.reunion?.ambito} del {diaMes(a.reunion?.fecha)}
                  {a.responsable ? ` · ${a.responsable}` : ''}
                  {a.fecha_limite ? ` · para el ${diaMes(a.fecha_limite)}` : ''}
                </div>
              </div>
            </div>
          ))}
      </section>

      {/* Aspirantes por llamar */}
      <section className="panel dash-panel">
        <div className="panel-cabecera">
          <div className="panel-titulo">Aspirantes por contactar</div>
          <button className="panel-accion" onClick={() => ir('aspirantes')}>Ver todos →</button>
        </div>
        {d.porLlamar.length === 0
          ? <div className="dash-todo-ok">Nadie pendiente de llamada en los próximos días.</div>
          : d.porLlamar.map(a => {
            const meta = metaEstadoAspirante(a.estado)
            const vencida = a.proxima_accion && a.proxima_accion < hoyISO()
            return (
              <div key={a.id} className="dash-item clic" onClick={() => ir('aspirantes', a.id)}>
                <div className="dash-item-info">
                  <div className="dash-item-nombre">{a.nombre}</div>
                  <div className="dash-item-meta">
                    {a.telefono || 'sin teléfono'} · {a.proxima_accion ? <span className={vencida ? 'texto-ambar' : ''}>llamar el {diaMes(a.proxima_accion)}</span> : 'sin fecha de seguimiento'}
                  </div>
                </div>
                <span className={`badge ${meta.clase}`}>{meta.label}</span>
              </div>
            )
          })}
      </section>
    </div>
  )
}
