/**
 * PuntosEditor.jsx
 * ───────────────────────────────────────────────────────────────
 * Editor de los puntos Organizativo / Varios de una orden del día
 * (también se usa para la plantilla en Ajustes). Cada punto lleva
 * un punto de color según de dónde salió (plantilla, acuerdo,
 * tarea o agregado a mano).
 */

import { useState } from 'react'
import { CATEGORIAS, ORIGEN_META } from '../lib/reuniones.js'

let contador = 0
export const nuevaClave = () => `k${Date.now()}_${contador++}`

/** Asegura que cada punto tenga una clave local para React. */
export function conClaves(puntos) {
  return puntos.map(p => (p._k ? p : { ...p, _k: nuevaClave() }))
}

export default function PuntosEditor({ puntos, onChange, mostrarOrigen = true, conResultado = false }) {
  const [notasAbiertas, setNotasAbiertas] = useState({})

  function actualizar(k, campo, valor) {
    onChange(puntos.map(p => (p._k === k ? { ...p, [campo]: valor } : p)))
  }

  function quitar(k) {
    onChange(puntos.filter(p => p._k !== k))
  }

  function mover(k, delta) {
    const p = puntos.find(x => x._k === k)
    const mismos = puntos.filter(x => x.categoria === p.categoria)
    const i = mismos.findIndex(x => x._k === k)
    const vecino = mismos[i + delta]
    if (!vecino) return
    const a = puntos.findIndex(x => x._k === k)
    const b = puntos.findIndex(x => x._k === vecino._k)
    const copia = [...puntos]
    ;[copia[a], copia[b]] = [copia[b], copia[a]]
    onChange(copia)
  }

  function agregar(categoria) {
    onChange([...puntos, { _k: nuevaClave(), categoria, texto: '', responsable: '', origen: 'manual', origen_id: null, resultado: '' }])
  }

  return (
    <div className="puntos-editor">
      {CATEGORIAS.map(cat => {
        const lista = puntos.filter(p => p.categoria === cat.id)
        return (
          <div key={cat.id} className="puntos-cat">
            <div className="puntos-cat-titulo">{cat.label}</div>
            {lista.length === 0 && <div className="vacio-chico">Sin puntos.</div>}
            {lista.map((p, i) => (
              <div key={p._k} className="punto-fila">
                <div className="punto-fila-principal">
                  {mostrarOrigen && (
                    <span className="punto-origen" title={ORIGEN_META[p.origen]?.label}
                          style={{ background: ORIGEN_META[p.origen]?.color }} />
                  )}
                  <input className="punto-texto" type="text" value={p.texto} placeholder="Punto…"
                         onChange={e => actualizar(p._k, 'texto', e.target.value)} />
                </div>
                <div className="punto-fila-extra">
                  <input className="punto-resp" type="text" value={p.responsable || ''} placeholder="Responsable"
                         onChange={e => actualizar(p._k, 'responsable', e.target.value)} />
                  <select className="punto-cat" value={p.categoria} onChange={e => actualizar(p._k, 'categoria', e.target.value)}>
                    {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <button type="button" className="punto-btn" disabled={i === 0} onClick={() => mover(p._k, -1)} title="Subir">↑</button>
                  <button type="button" className="punto-btn" disabled={i === lista.length - 1} onClick={() => mover(p._k, 1)} title="Bajar">↓</button>
                  <button type="button" className="punto-btn peligro" onClick={() => quitar(p._k)} title="Quitar">✕</button>
                </div>
                {conResultado && !p.resultado && !notasAbiertas[p._k] && (
                  <button type="button" className="enlace-chico punto-nota-btn" onClick={() => setNotasAbiertas(n => ({ ...n, [p._k]: true }))}>
                    + Anotar qué se informó
                  </button>
                )}
                {conResultado && (p.resultado || notasAbiertas[p._k]) && (
                  <textarea className="punto-resultado" rows={2} value={p.resultado || ''}
                            placeholder="Notas de este punto (opcional): qué se informó o discutió"
                            onChange={e => actualizar(p._k, 'resultado', e.target.value)} />
                )}
              </div>
            ))}
            <button type="button" className="btn-chico punto-agregar" onClick={() => agregar(cat.id)}>
              + Agregar punto en {cat.label}
            </button>
          </div>
        )
      })}
      {mostrarOrigen && (
        <div className="leyenda-origen">
          {Object.entries(ORIGEN_META).map(([id, m]) => (
            <span key={id}><i style={{ background: m.color }} />{m.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}
