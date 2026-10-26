/**
 * aspirantes.js
 * ───────────────────────────────────────────────────────────────
 * Seguimiento de nuevo ingreso: aspirantes, su historial de
 * contactos (normalmente llamadas) y la conversión a militante.
 */

import { supabase } from './supabase.js'
import { hoyISO, mesLegible } from './fechas.js'
import { crearMilitante } from './militantes.js'

export const ESTADOS_ASPIRANTE = [
  { id: 'contactado',     label: 'Contactado',     clase: 'gris'  },
  { id: 'en_seguimiento', label: 'En seguimiento', clase: 'ambar' },
  { id: 'incorporado',    label: 'Incorporado',    clase: 'verde' },
  { id: 'descartado',     label: 'Descartado',     clase: 'rojo'  },
]

export const MEDIOS_CONTACTO = [
  { id: 'llamada',    label: 'Llamada' },
  { id: 'whatsapp',   label: 'WhatsApp' },
  { id: 'en_persona', label: 'En persona' },
  { id: 'otro',       label: 'Otro' },
]

/** Etiqueta de dónde llegó el contacto. */
export const CANALES = [
  { id: 'facebook',  label: 'Facebook',  color: '#1877F2' },
  { id: 'instagram', label: 'Instagram', color: '#C13584' },
  { id: 'tiktok',    label: 'TikTok',    color: '#25A3A8' },
  { id: 'web',       label: 'Web',       color: '#5B8DD9' },
  { id: 'referido',  label: 'Referido',  color: '#2E9E5B' },
  { id: 'otro',      label: 'Otro',      color: '#7A7670' },
]

export const MOTIVOS_DESCARTE = [
  'No contestó',
  'No le interesó',
  'No tiene tiempo',
  'Fuera de la zona',
  'Diferencias políticas',
  'Otro',
]

export function metaCanal(id) {
  return CANALES.find(c => c.id === id) || null
}
/** "Referido (Juan)", "Facebook", o el texto viejo de "cómo llegó". */
export function textoCanal(a) {
  const c = metaCanal(a.canal)
  if (!c) return a.como_llego || ''
  if (c.id === 'referido' && a.referido_por) return `Referido por ${a.referido_por}`
  return c.label
}

/**
 * Fecha en que entró el contacto: la más antigua entre el registro
 * y el primer contacto anotado (por si se registra con días de atraso).
 */
export function fechaIngreso(a) {
  const fechas = [a.creado_en?.slice(0, 10), ...(a.contactos || []).map(c => c.fecha)].filter(Boolean).sort()
  return fechas[0] || null
}

export function metaEstadoAspirante(id) {
  return ESTADOS_ASPIRANTE.find(e => e.id === id) || ESTADOS_ASPIRANTE[0]
}
export function labelMedio(id) {
  return MEDIOS_CONTACTO.find(m => m.id === id)?.label || id
}

export async function listarAspirantes() {
  const { data, error } = await supabase()
    .from('aspirantes')
    .select('*, contactos:contactos_aspirante(*)')
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data.map(a => ({
    ...a,
    contactos: (a.contactos || []).sort((x, y) => (y.fecha + y.creado_en).localeCompare(x.fecha + x.creado_en)),
  }))
}

export async function guardarAspirante(datos, id = null) {
  const fila = {
    nombre: datos.nombre.trim(),
    telefono: (datos.telefono || '').trim(),
    canal: datos.canal || '',
    referido_por: datos.canal === 'referido' ? (datos.referido_por || '').trim() : '',
    estado: datos.estado || 'contactado',
    motivo_descarte: datos.estado === 'descartado' ? (datos.motivo_descarte || '') : '',
    notas: datos.notas || '',
    proxima_accion: datos.proxima_accion || null,
  }
  if (datos.estado === 'descartado') {
    fila.descartado_en = datos.descartado_en || hoyISO()
    fila.proxima_accion = null
  } else {
    fila.descartado_en = null
  }
  const res = id
    ? await supabase().from('aspirantes').update(fila).eq('id', id).select().single()
    : await supabase().from('aspirantes').insert(fila).select().single()
  if (res.error) throw res.error
  return res.data
}

/** Cambia el estado. Al descartar guarda el motivo y la fecha. */
export async function cambiarEstadoAspirante(id, estado, motivo = '') {
  const cambios = estado === 'descartado'
    ? { estado, motivo_descarte: motivo, descartado_en: hoyISO(), proxima_accion: null }
    : { estado, motivo_descarte: '', descartado_en: null }
  const { error } = await supabase().from('aspirantes').update(cambios).eq('id', id)
  if (error) throw error
}

export async function eliminarAspirante(id) {
  const { error } = await supabase().from('aspirantes').delete().eq('id', id)
  if (error) throw error
}

/**
 * Registra un contacto (llamada, etc.). Si el aspirante estaba como
 * "contactado", pasa a "en seguimiento". Guarda la próxima acción.
 */
export async function registrarContacto(aspirante, { fecha, medio, notas, proxima_accion }) {
  const { error } = await supabase().from('contactos_aspirante').insert({
    aspirante_id: aspirante.id, fecha: fecha || hoyISO(), medio: medio || 'llamada', notas: notas || '',
  })
  if (error) throw error
  const cambios = { proxima_accion: proxima_accion || null }
  if (aspirante.estado === 'contactado') cambios.estado = 'en_seguimiento'
  const { error: e2 } = await supabase().from('aspirantes').update(cambios).eq('id', aspirante.id)
  if (e2) throw e2
}

export async function eliminarContacto(id) {
  const { error } = await supabase().from('contactos_aspirante').delete().eq('id', id)
  if (error) throw error
}

/**
 * Da de alta al aspirante como militante (con su nombre y teléfono)
 * y lo marca como incorporado. Regresa el militante creado.
 */
export async function convertirEnMilitante(aspirante, grupoBaseId = null) {
  const militante = await crearMilitante({
    nombre: aspirante.nombre,
    telefono: aspirante.telefono || '',
    condicion: 'simpatizante',
    grupo_base_id: grupoBaseId,
    referencia: textoCanal(aspirante) ? `Aspirante · ${textoCanal(aspirante)}` : 'Aspirante',
    notas: aspirante.notas || '',
    fecha_alta: hoyISO(),
  })
  const { error } = await supabase().from('aspirantes').update({
    estado: 'incorporado', militante_id: militante.id, incorporado_en: hoyISO(), proxima_accion: null,
  }).eq('id', aspirante.id)
  if (error) throw error
  return militante
}

// ─── Resumen mensual ─────────────────────────────────────────────

const enMes = (iso, mes) => !!iso && iso.slice(0, 7) === mes

function contarPor(lista, clave) {
  const m = {}
  lista.forEach(x => { const k = clave(x); m[k] = (m[k] || 0) + 1 })
  return Object.entries(m).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n)
}

/** Cómo le fue a la captación en un mes (YYYY-MM). */
export function resumenAspirantes(lista, mes) {
  const nuevos = lista.filter(a => enMes(fechaIngreso(a), mes))
  const contactados = lista.filter(a => a.contactos.some(c => enMes(c.fecha, mes)))
  const contactos = lista.reduce((s, a) => s + a.contactos.filter(c => enMes(c.fecha, mes)).length, 0)
  const incorporados = lista.filter(a => enMes(a.incorporado_en, mes))
  const descartados = lista.filter(a => a.estado === 'descartado' && enMes(a.descartado_en, mes))
  const enProceso = lista.filter(a => a.estado === 'contactado' || a.estado === 'en_seguimiento')

  const nombreCanal = a => metaCanal(a.canal)?.label || 'Sin etiqueta'
  return {
    mes, nuevos, contactados, contactos, incorporados, descartados, enProceso,
    porCanal: contarPor(nuevos, nombreCanal),
    incorporadosPorCanal: contarPor(incorporados, nombreCanal),
    motivos: contarPor(descartados, a => a.motivo_descarte || 'Sin motivo'),
    referidores: contarPor(nuevos.filter(a => a.canal === 'referido' && a.referido_por), a => a.referido_por),
  }
}

/** Efectividad de cada canal desde que hay registro. */
export function efectividadPorCanal(lista) {
  const filas = [...CANALES.map(c => ({ ...c })), { id: '', label: 'Sin etiqueta', color: '#B0ABA3' }].map(c => {
    const delCanal = lista.filter(a => (metaCanal(a.canal)?.id || '') === c.id)
    return {
      ...c,
      total: delCanal.length,
      incorporados: delCanal.filter(a => a.estado === 'incorporado').length,
      descartados: delCanal.filter(a => a.estado === 'descartado').length,
      enProceso: delCanal.filter(a => a.estado === 'contactado' || a.estado === 'en_seguimiento').length,
    }
  })
  return filas.filter(f => f.total > 0)
}

const listaConteo = arr => arr.map(x => `${x.k} ${x.n}`).join(', ')

/** Texto para WhatsApp / informe. */
export function textoResumenAspirantes(r, { titulo = true } = {}) {
  const L = []
  if (titulo) L.push(`*Captación de aspirantes — ${mesLegible(r.mes)}*`)
  L.push(`- Contactos nuevos: ${r.nuevos.length}${r.porCanal.length ? ` (${listaConteo(r.porCanal)})` : ''}`)
  L.push(`- Personas contactadas en el mes: ${r.contactados.length} (${r.contactos} llamada(s)/mensaje(s))`)
  L.push(`- Incorporados: ${r.incorporados.length}${r.incorporados.length ? ` — ${r.incorporados.map(a => a.nombre).join(', ')}` : ''}`)
  L.push(`- Descartados: ${r.descartados.length}${r.motivos.length ? ` (${listaConteo(r.motivos)})` : ''}`)
  L.push(`- Siguen en proceso: ${r.enProceso.length}`)
  if (r.referidores.length) L.push(`- Referidos por: ${listaConteo(r.referidores)}`)
  return L.join('\n')
}

// ─── Exportar ────────────────────────────────────────────────────

/** Descarga Excel con dos hojas: aspirantes e historial de contactos. */
export async function exportarAspirantesExcel(lista) {
  const XLSX = await import('xlsx')
  const filas = lista.map(a => ({
    Nombre: a.nombre,
    Teléfono: a.telefono || '',
    Origen: metaCanal(a.canal)?.label || a.como_llego || '',
    'Referido por': a.referido_por || '',
    Estado: metaEstadoAspirante(a.estado).label,
    'Fecha de ingreso': fechaIngreso(a) || '',
    'Contactos registrados': a.contactos.length,
    'Último contacto': a.contactos[0]?.fecha || '',
    'Próxima llamada': a.proxima_accion || '',
    'Incorporado el': a.incorporado_en || '',
    'Descartado el': a.descartado_en || '',
    'Motivo de descarte': a.motivo_descarte || '',
    Notas: a.notas || '',
  }))
  const historial = []
  lista.forEach(a => [...a.contactos].reverse().forEach(c => historial.push({
    Aspirante: a.nombre, Fecha: c.fecha, Medio: labelMedio(c.medio), 'Qué se habló': c.notas || '',
  })))
  const libro = XLSX.utils.book_new()
  const h1 = XLSX.utils.json_to_sheet(filas)
  h1['!cols'] = [28, 14, 12, 18, 15, 14, 10, 14, 14, 14, 14, 20, 40].map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(libro, h1, 'Aspirantes')
  const h2 = XLSX.utils.json_to_sheet(historial.length ? historial : [{ Aspirante: '', Fecha: '', Medio: '', 'Qué se habló': '' }])
  h2['!cols'] = [28, 12, 12, 60].map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(libro, h2, 'Historial de contactos')
  XLSX.writeFile(libro, `Aspirantes-${hoyISO()}.xlsx`)
}
