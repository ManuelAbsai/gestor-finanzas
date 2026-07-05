/**
 * comprobante.js
 * ───────────────────────────────────────────────────────────────
 * Genera el PDF del comprobante de remisión con jsPDF.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ROJO = [139, 26, 26]
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function peso(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)
}

function periodoLegible(periodo) {
  const [y, m] = periodo.split('-')
  return `${MESES[parseInt(m, 10) - 1]} ${y}`
}

/**
 * Genera y descarga el PDF de una remisión.
 * remision: fila de la tabla remisiones
 * pagos: pagos incluidos en el periodo (para el detalle)
 */
export function descargarComprobante(remision, pagos = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const ancho = doc.internal.pageSize.getWidth()

  // Encabezado
  doc.setFillColor(...ROJO)
  doc.rect(0, 0, ancho, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('COMPROBANTE DE REMISIÓN', 14, 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`No. ${String(remision.numero).padStart(3, '0')}`, ancho - 14, 9, { align: 'right' })

  let y = 26
  doc.setTextColor(20, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(periodoLegible(remision.periodo), 14, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Fecha de emisión: ${new Date(remision.fecha_remision).toLocaleDateString('es-MX')}`, 14, y)

  y += 10
  doc.setDrawColor(...ROJO)
  doc.setLineWidth(0.5)
  doc.line(14, y, ancho - 14, y)
  y += 8

  // Resumen
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Monto']],
    body: [
      ['Cuotas de militantes', peso(remision.monto_cuotas)],
      ['Otros ingresos', peso(remision.monto_otros)],
    ],
    foot: [['TOTAL REMITIDO', peso(remision.total)]],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40], textColor: [230, 228, 220] },
    footStyles: { fillColor: ROJO, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 10

  // Detalle de pagos
  if (pagos.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(20, 20, 20)
    doc.text('DETALLE DE CUOTAS', 14, y)
    y += 3
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Meses', 'Monto', 'Forma']],
      body: pagos.map(p => [
        new Date(p.fecha_pago).toLocaleDateString('es-MX'),
        p.periodo_texto,
        peso(p.monto),
        p.forma_pago,
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [50, 50, 50], textColor: [230, 228, 220] },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
      theme: 'striped',
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (remision.notas) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`Notas: ${remision.notas}`, 14, y, { maxWidth: ancho - 28 })
  }

  // Pie
  const yPie = doc.internal.pageSize.getHeight() - 10
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('Generado por Gestor de Finanzas', 14, yPie)

  const nombre = `Remision-${String(remision.numero).padStart(3, '0')}-${periodoLegible(remision.periodo).replace(' ', '')}.pdf`
  doc.save(nombre)
}
