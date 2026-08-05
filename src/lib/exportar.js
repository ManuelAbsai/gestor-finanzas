/**
 * exportar.js
 * ───────────────────────────────────────────────────────────────
 * Exporta el padrón de militantes activos a Excel o PDF, como
 * respaldo. Solo militantes activos (los dados de baja no salen).
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { labelCondicion } from './militantes.js'

function filasPadron(militantes) {
  return militantes.map(m => ({
    Nombre: m.nombre,
    Condición: labelCondicion(m.condicion),
    'Grupo base': m.grupo_base_nombre || '',
    Actividad: m.actividad_nombre || '',
    Ciudad: m.ciudad || '',
    Estado: m.estado || '',
    Teléfono: m.telefono || '',
    'Cuota ($)': m.cuota_monto,
    'Día de pago': m.cuota_dia,
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
