/**
 * fechas.js
 * ───────────────────────────────────────────────────────────────
 * Utilidades de fecha. Todo se calcula con la hora LOCAL del
 * dispositivo (no UTC), para que en la noche no "salte" al día
 * siguiente.
 */

export const MESES = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre']
export const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
export const DIAS_SEMANA = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

const pad = n => String(n).padStart(2, '0')

/** Fecha local de hoy en formato YYYY-MM-DD. */
export function hoyISO() {
  return aISO(new Date())
}

/** Date → 'YYYY-MM-DD' (local). */
export function aISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' → Date local (sin desfase de zona horaria). */
export function deISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Suma días a una fecha ISO. */
export function sumarDias(iso, dias) {
  const d = deISO(iso)
  d.setDate(d.getDate() + dias)
  return aISO(d)
}

/** '2026-09-06' → '06 de septiembre de 2026' (como en tus documentos). */
export function fechaDocumento(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d} de ${MESES[parseInt(m, 10) - 1]} de ${y}`
}

/** '2026-09-06' → 'dom 6 sep' */
export function fechaCorta(iso) {
  if (!iso) return '—'
  const d = deISO(iso)
  return `${DIAS_SEMANA[d.getDay()].slice(0, 3)} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`
}

/** '2026-09-06' → '6 sep' */
export function diaMes(iso) {
  if (!iso) return '—'
  const d = deISO(iso)
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`
}

/** '2026-09-06' → 'domingo 6 de septiembre' */
export function fechaLarga(iso) {
  if (!iso) return ''
  const d = deISO(iso)
  return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** 'YYYY-MM' del mes actual. */
export function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** 'YYYY-MM' → 'Septiembre 2026' */
export function mesLegible(periodo) {
  const [y, m] = periodo.split('-')
  const nombre = MESES[parseInt(m, 10) - 1]
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${y}`
}

/** Últimos `n` meses ('YYYY-MM'), del más reciente al más antiguo. */
export function ultimosMeses(n) {
  const d = new Date()
  const lista = []
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    lista.push(`${x.getFullYear()}-${pad(x.getMonth() + 1)}`)
  }
  return lista
}

/** Días entre hoy y una fecha ISO (negativo = ya pasó). */
export function diasHasta(iso) {
  const hoy = deISO(hoyISO())
  return Math.round((deISO(iso) - hoy) / 86400000)
}

/** '21:00' → '21:00 hrs.' */
export function horaTexto(hora) {
  return hora ? `${hora} hrs.` : ''
}
