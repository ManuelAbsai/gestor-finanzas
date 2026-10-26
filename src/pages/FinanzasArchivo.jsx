/**
 * FinanzasArchivo.jsx
 * ───────────────────────────────────────────────────────────────
 * Archivo de la etapa de finanzas: el resumen de cobranza y las
 * remisiones/concentrado, tal como estaban. Solo se entra desde
 * Ajustes; ya no forma parte del menú diario.
 */

import { useState } from 'react'
import Dashboard from './Dashboard.jsx'
import Remisiones from './Remisiones.jsx'

export default function FinanzasArchivo({ ir }) {
  const [pestana, setPestana] = useState('resumen')
  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-titulo">Finanzas (archivo)</div>
          <div className="topbar-sub">Consulta histórica de tu gestión de finanzas</div>
        </div>
        <button className="btn-chico" onClick={() => ir('ajustes')}>← Ajustes</button>
      </div>
      <div className="pestanas pagina">
        <button className={pestana === 'resumen' ? 'activo' : ''} onClick={() => setPestana('resumen')}>Resumen de cobranza</button>
        <button className={pestana === 'remisiones' ? 'activo' : ''} onClick={() => setPestana('remisiones')}>Remisiones y concentrado</button>
      </div>
      {pestana === 'resumen'
        ? <Dashboard embebido onIrAMilitantes={() => ir('militantes')} />
        : <Remisiones embebido />}
    </div>
  )
}
