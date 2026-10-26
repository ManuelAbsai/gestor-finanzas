/**
 * informe.js
 * ───────────────────────────────────────────────────────────────
 * Informe mensual de actividades. Se arma solo con lo que ya está
 * registrado: reuniones y actas, acuerdos y tareas, actividades
 * del GB, aspirantes y discusión política.
 */

import jsPDF from 'jspdf'
import { listarReuniones, listarAcuerdos } from './reuniones.js'
import { listarActividadesGB } from './actividadesGB.js'
import { listarAspirantes, resumenAspirantes, textoResumenAspirantes } from './aspirantes.js'
import { listarMilitantes } from './militantes.js'
import { mesLegible, diaMes } from './fechas.js'

const enMes = (iso, mes) => !!iso && iso.slice(0, 7) === mes

export async function datosDelMes(mes) {
  const [reuniones, acuerdos, actividades, aspirantes, militantes] = await Promise.all([
    listarReuniones(), listarAcuerdos(), listarActividadesGB(), listarAspirantes(), listarMilitantes(),
  ])

  const reunionesMes = reuniones.filter(r => enMes(r.fecha, mes)).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const realizadas = reunionesMes.filter(r => r.acta_lista)
  const idsReunion = new Set(reunionesMes.map(r => r.id))
  const acuerdosMes = acuerdos.filter(a => idsReunion.has(a.reunion_id))
  const cumplidasMes = acuerdos.filter(a => a.estado === 'cumplido' && enMes(a.cumplido_en, mes))
  const actividadesMes = actividades.filter(a => enMes(a.fecha, mes)).sort((a, b) => a.fecha.localeCompare(b.fecha))

  const porTipo = {}
  actividadesMes.forEach(a => {
    const clave = a.tipo?.nombre || 'Sin tipo'
    porTipo[clave] = porTipo[clave] || { nombre: clave, color: a.tipo?.color || '#7A7670', n: 0 }
    porTipo[clave].n++
  })

  const captacion = resumenAspirantes(aspirantes, mes)

  return {
    mes,
    reuniones: reunionesMes,
    realizadas,
    acuerdos: acuerdosMes.filter(a => a.tipo === 'acuerdo'),
    tareas: acuerdosMes.filter(a => a.tipo === 'tarea'),
    cumplidas: cumplidasMes,
    actividades: actividadesMes,
    porTipo: Object.values(porTipo).sort((a, b) => b.n - a.n),
    discusiones: realizadas.filter(r => r.discusion_tema),
    captacion,
    nuevosAspirantes: captacion.nuevos, contactados: captacion.contactados,
    llamadas: captacion.contactos, incorporados: captacion.incorporados,
    militantesActivos: militantes.length,
  }
}

/** Texto del informe (editable antes de copiarlo). */
export function textoInforme(d, encabezado = {}) {
  const L = []
  L.push(`*Informe mensual de actividades${encabezado.grupo ? ` — ${encabezado.grupo}` : ''}*`)
  L.push(mesLegible(d.mes))
  if (encabezado.responsable) L.push(`Encargado político: ${encabezado.responsable}`)

  L.push('', '*Resumen:*')
  L.push(`- Reuniones realizadas: ${d.realizadas.length}${d.reuniones.length > d.realizadas.length ? ` (de ${d.reuniones.length} programadas)` : ''}`)
  L.push(`- Acuerdos tomados: ${d.acuerdos.length} · Tareas asignadas: ${d.tareas.length} · Tareas cumplidas en el mes: ${d.cumplidas.length}`)
  L.push(`- Actividades realizadas: ${d.actividades.length}`)
  L.push(`- Aspirantes: ${d.nuevosAspirantes.length} nuevo(s), ${d.contactados.length} contactado(s), ${d.incorporados.length} incorporado(s), ${d.captacion.descartados.length} descartado(s)`)
  L.push(`- Militantes activos: ${d.militantesActivos}`)

  if (d.realizadas.length) {
    L.push('', '*Reuniones:*')
    d.realizadas.forEach(r => L.push(`- ${diaMes(r.fecha)}: ${r.ambito}, ${r.asistentes?.length || 0} asistente(s)`))
  }

  if (d.discusiones.length) {
    L.push('', '*Discusión política:*')
    d.discusiones.forEach(r => L.push(`- ${diaMes(r.fecha)}: ${r.discusion_tema}${r.discusion_continuacion ? ' (continuación)' : ''}${r.discusion_expone ? ` — ${r.discusion_expone}` : ''}`))
  }

  L.push('', '*Actividades:*')
  if (d.actividades.length === 0) L.push('- Sin actividades registradas.')
  d.actividades.forEach(a => {
    const extra = [a.lugar, a.cantidad != null ? `${a.cantidad} ${a.unidad || ''}`.trim() : ''].filter(Boolean).join(', ')
    L.push(`- ${diaMes(a.fecha)}: ${a.titulo}${extra ? ` (${extra})` : ''}`)
  })

  const c = d.captacion
  if (c.nuevos.length || c.contactados.length || c.incorporados.length || c.descartados.length) {
    L.push('', '*Captación de aspirantes:*')
    L.push(textoResumenAspirantes(c, { titulo: false }))
  }

  if (d.acuerdos.length || d.tareas.length) {
    L.push('', '*Acuerdos y tareas del mes:*')
    ;[...d.acuerdos, ...d.tareas].forEach(a => {
      const estado = a.estado === 'cumplido' ? '✓' : a.estado === 'descartado' ? '✗' : '…'
      L.push(`- [${estado}] ${a.texto}`)
    })
  }

  return L.join('\n')
}

/** Descarga el informe (texto ya editado) como PDF. */
export function descargarInformePDF(texto, mes) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()

  doc.setFillColor(139, 26, 26)
  doc.rect(0, 0, ancho, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('INFORME MENSUAL DE ACTIVIDADES', 12, 9.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(mesLegible(mes), ancho - 12, 9.5, { align: 'right' })

  doc.setTextColor(30, 30, 30)
  let y = 24
  // La fuente del PDF no trae algunos símbolos: se cambian por equivalentes
  const lineas = texto
    .replace(/\*/g, '')
    .replace(/✓/g, 'cumplida').replace(/✗/g, 'descartada').replace(/…/g, 'pendiente').replace(/↳/g, '>')
    .split('\n')
  for (const linea of lineas) {
    const esTitulo = /:$/.test(linea.trim()) && !linea.startsWith('-')
    doc.setFont('helvetica', esTitulo ? 'bold' : 'normal')
    doc.setFontSize(esTitulo ? 11 : 10)
    const partes = doc.splitTextToSize(linea || ' ', ancho - 24)
    for (const p of partes) {
      if (y > alto - 15) { doc.addPage(); y = 18 }
      doc.text(p, 12, y)
      y += esTitulo ? 6.5 : 5.2
    }
    if (esTitulo) y += 0.5
  }

  doc.save(`Informe-${mes}.pdf`)
}
