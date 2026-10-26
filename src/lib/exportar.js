/**
 * exportar.js
 * ───────────────────────────────────────────────────────────────
 * Exporta el padrón de militantes activos a Excel o PDF, como
 * respaldo. Solo militantes activos (los dados de baja no salen).
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { labelCondicion, labelCategoria, CATEGORIAS_SOCIALES } from './militantes.js'

function filasPadron(militantes) {
  return militantes.map(m => ({
    Nombre: m.nombre,
    Condición: labelCondicion(m.condicion),
    'Grupo base': m.grupo_base_nombre || '',
    Cargo: m.actividad_nombre || '',
    Categoría: labelCategoria(m.categoria),
    Folio: m.folio || '',
    'Responsable de seguimiento': m.responsable_nombre || '',
    Ciudad: m.ciudad || '',
    Estado: m.estado || '',
    Teléfono: m.telefono || '',
    'Fecha de alta': m.fecha_alta || '',
  }))
}

/** Descarga el padrón como archivo .xlsx (usa SheetJS, cargado dinámicamente). */
export async function exportarPadronExcel(militantes) {
  const XLSX = await import('xlsx')
  const filas = filasPadron(militantes)
  const hoja = XLSX.utils.json_to_sheet(filas)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Padrón')
  const regional = XLSX.utils.json_to_sheet(filasHojaRegional(militantes))
  XLSX.utils.book_append_sheet(libro, regional, 'Crecimiento regional')
  const fecha = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(libro, `Padron-${fecha}.xlsx`)
}

/** Descarga el padrón como PDF. */
export function exportarPadronPDF(militantes) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'landscape' })
  const ancho = doc.internal.pageSize.getWidth()

  doc.setFillColor(139, 26, 26)
  doc.rect(0, 0, ancho, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('PADRÓN DE MILITANTES', 10, 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(new Date().toLocaleDateString('es-MX'), ancho - 10, 8, { align: 'right' })

  const filas = filasPadron(militantes)
  autoTable(doc, {
    startY: 18,
    head: [Object.keys(filas[0] || {})],
    body: filas.map(f => Object.values(f)),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40], textColor: [230, 228, 220] },
    margin: { left: 10, right: 10 },
    theme: 'grid',
  })

  const fecha = new Date().toISOString().slice(0, 10)
  doc.save(`Padron-${fecha}.pdf`)
}

// ─── Hoja "Crecimiento Regional" ────────────────────────────────

/** dd/mm/aaaa, como lo usa la hoja de la región. */
function fechaHoja(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
const limpio = t => (t || '').replace(/[\t\r\n]+/g, ' ').trim()

/** Filas con las columnas EXACTAS de la hoja, en el mismo orden. */
export function filasHojaRegional(militantes) {
  return militantes.map(m => ({
    Camarada: m.nombre,
    'Fecha de Ingreso': fechaHoja(m.fecha_alta),
    'Responsable de Seguimiento': m.responsable_nombre || '',
    Categoria: labelCategoria(m.categoria),
    Estatus: m.activo === false ? 'Baja' : 'Activo',
    'Papel que juega en el GB': m.actividad_nombre || '',
    Lugar: m.ciudad || m.estado || '',
    Comentarios: limpio(m.notas),
    'FOLIO MILITANTE': m.folio || '',
    'Column 10': '',
  }))
}

/**
 * Texto separado por tabuladores: al pegarlo en Google Sheets cada
 * dato cae en su columna. Sin encabezados (la hoja ya los tiene).
 */
export function textoHojaRegional(militantes) {
  return filasHojaRegional(militantes)
    .map(f => Object.values(f).map(limpio).join('\t'))
    .join('\n')
}

/** Militancia total por categoría (neto y porcentaje). */
export function resumenCategorias(militantes) {
  const total = militantes.length
  const filas = [...CATEGORIAS_SOCIALES, { id: '', label: 'Sin categoría', color: '#B0ABA3' }].map(c => {
    const n = militantes.filter(m => (m.categoria || '') === c.id).length
    return { ...c, n, pct: total ? (n / total) * 100 : 0 }
  })
  return { total, filas }
}
