/**
 * Informe.jsx
 * ───────────────────────────────────────────────────────────────
 * Informe mensual de actividades: se arma solo con lo registrado
 * en el mes. El texto se puede editar antes de copiarlo o bajarlo
 * en PDF.
 */

import { useState, useEffect } from 'react'
import { datosDelMes, textoInforme, descargarInformePDF } from '../lib/informe.js'
import { listarGruposBase } from '../lib/catalogos.js'
import { copiarTexto } from '../lib/archivos.js'
import { mesActual, mesLegible, ultimosMeses, diaMes } from '../lib/fechas.js'

const CLAVE_ENCABEZADO = 'pcr_informe_encabezado'

function leerEncabezado() {
  try { return JSON.parse(localStorage.getItem(CLAVE_ENCABEZADO)) || null } catch { return null }
}

export default function Informe({ ir }) {
  // Por defecto el mes anterior (el que normalmente se reporta)
  const [mes, setMes] = useState(ultimosMeses(2)[1])
  const [d, setD] = useState(null)
  const [texto, setTexto] = useState('')
  const [editado, setEditado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [enc, setEnc] = useState(leerEncabezado() || { grupo: '', responsable: '' })
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (leerEncabezado()) return
    listarGruposBase().then(gb => {
      const e = { grupo: gb[0]?.nombre || '', responsable: '' }
      setEnc(e)
    }).catch(() => {})
  }, [])

  async function cargar() {
    setCargando(true); setError(null)
    try {
      const datos = await datosDelMes(mes)
      setD(datos)
      setTexto(textoInforme(datos, enc))
      setEditado(false)
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [mes])

  function cambiarEnc(campo, valor) {
    const nuevo = { ...enc, [campo]: valor }
    setEnc(nuevo)
    try { localStorage.setItem(CLAVE_ENCABEZADO, JSON.stringify(nuevo)) } catch { /* sin efecto */ }
    if (d && !editado) setTexto(textoInforme(d, nuevo))
  }

  async function copiar() {
    const ok = await copiarTexto(texto)
    setCopiado(ok); setTimeout(() => setCopiado(false), 1800)
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-titulo">Informe mensual</div>
        <select className="selector-mes" value={mes} onChange={e => setMes(e.target.value)}>
          {ultimosMeses(12).map(m => <option key={m} value={m}>{mesLegible(m)}{m === mesActual() ? ' (en curso)' : ''}</option>)}
        </select>
      </div>

      {cargando ? <div className="cargando">Armando el informe…</div>
        : error ? <div className="estado-error"><p>No se pudo armar el informe.</p><p className="estado-error-detalle">{error}</p><button className="btn-secundario" onClick={cargar}>Reintentar</button></div>
        : (
          <>
            <div className="kpi-grid">
              <div className="kpi clic" onClick={() => ir('reuniones')}>
                <div className="kpi-label">Reuniones</div>
                <div className="kpi-valor">{d.realizadas.length}</div>
                <div className="kpi-sub">{d.acuerdos.length} acuerdos · {d.tareas.length} tareas</div>
              </div>
              <div className="kpi clic" onClick={() => ir('actividades')}>
                <div className="kpi-label">Actividades</div>
                <div className="kpi-valor verde">{d.actividades.length}</div>
                <div className="kpi-sub">{d.cumplidas.length} tarea(s) cumplida(s)</div>
              </div>
              <div className="kpi clic" onClick={() => ir('aspirantes')}>
                <div className="kpi-label">Aspirantes</div>
                <div className="kpi-valor ambar">{d.contactados.length}</div>
                <div className="kpi-sub">contactados · {d.incorporados.length} incorporado(s)</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Militantes activos</div>
                <div className="kpi-valor">{d.militantesActivos}</div>
                <div className="kpi-sub">en el padrón</div>
              </div>
            </div>

            <div className="informe-grid">
              <section className="panel">
                <div className="panel-cabecera"><div className="panel-titulo">Actividades por tipo</div></div>
                <div className="panel-cuerpo">
                  {d.porTipo.length === 0 ? <div className="vacio-chico">Sin actividades este mes.</div>
                    : d.porTipo.map(t => (
                      <div key={t.nombre} className="barra-tipo">
                        <span className="barra-tipo-nombre"><i style={{ background: t.color }} />{t.nombre}</span>
                        <span className="barra-tipo-barra"><span style={{ width: `${(t.n / d.porTipo[0].n) * 100}%`, background: t.color }} /></span>
                        <span className="barra-tipo-n">{t.n}</span>
                      </div>
                    ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-cabecera"><div className="panel-titulo">Discusión política</div></div>
                <div className="panel-cuerpo">
                  {d.discusiones.length === 0 ? <div className="vacio-chico">Sin discusiones registradas.</div>
                    : d.discusiones.map(r => (
                      <div key={r.id} className="inicio-punto"><b>{diaMes(r.fecha)}</b> · {r.discusion_tema}{r.discusion_expone ? ` — ${r.discusion_expone}` : ''}</div>
                    ))}
                </div>
              </section>
            </div>

            <section className="panel dash-panel">
              <div className="panel-cabecera">
                <div className="panel-titulo">Texto del informe</div>
                {editado && <button className="panel-accion" onClick={() => { setTexto(textoInforme(d, enc)); setEditado(false) }}>↺ Regenerar</button>}
              </div>
              <div className="panel-cuerpo">
                <div className="campo-fila">
                  <div className="campo"><label>Grupo base</label><input type="text" value={enc.grupo} onChange={e => cambiarEnc('grupo', e.target.value)} /></div>
                  <div className="campo"><label>Encargado político</label><input type="text" value={enc.responsable} placeholder="Tu nombre" onChange={e => cambiarEnc('responsable', e.target.value)} /></div>
                </div>
                <p className="panel-desc">Puedes editar el texto aquí mismo antes de copiarlo. Lo que está entre *asteriscos* sale en negritas en WhatsApp.</p>
                <textarea className="informe-texto" value={texto} onChange={e => { setTexto(e.target.value); setEditado(true) }} />
                <div className="acciones-fila">
                  <button className="btn-copiar" onClick={copiar}>{copiado ? '✓ Copiado' : '📋 Copiar informe'}</button>
                  <button className="btn-chico" onClick={() => descargarInformePDF(texto, mes)}>📄 Descargar PDF</button>
                </div>
              </div>
            </section>
          </>
        )}
    </div>
  )
}
