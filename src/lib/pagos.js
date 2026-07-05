/**
 * pagos.js
 * ───────────────────────────────────────────────────────────────
 * Registro de pagos, con subida de la captura de evidencia al
 * Storage de Supabase (bucket "evidencias").
 *
 * Un pago puede cubrir varios meses (meses_cubre: string[]),
 * con un texto ya formateado (periodo_texto) para mostrar y para
 * el mensaje de WhatsApp.
 */

import { supabase } from './supabase.js'
export { periodoActual } from './remisiones.js'

const BUCKET = 'evidencias'

// ═══ LECTURA ═════════════════════════════════════════════════

/** Todos los pagos, o los de un militante si se pasa su id. */
export async function listarPagos(militanteId = null) {
  let q = supabase().from('pagos').select('*').order('fecha_pago', { ascending: false })
  if (militanteId) q = q.eq('militante_id', militanteId)
  const { data, error } = await q
  if (error) throw error
  return data
}

/** Pagos cuyo arreglo meses_cubre incluye el periodo dado (YYYY-MM). */
export async function pagosDelPeriodo(periodo) {
  const { data, error } = await supabase()
    .from('pagos')
    .select('*')
    .contains('meses_cubre', [periodo])
  if (error) throw error
  return data
}

// ═══ ESCRITURA ═══════════════════════════════════════════════

/**
 * Registra un pago. Si viene `archivoEvidencia` (File), lo sube
 * primero a Storage y guarda su ruta en el pago.
 */
export async function registrarPago(datos, archivoEvidencia = null) {
  let evidencia_path = ''

  if (archivoEvidencia) {
    evidencia_path = await subirEvidencia(archivoEvidencia, datos.militante_id)
  }

  const { data, error } = await supabase()
    .from('pagos')
    .insert({ ...datos, evidencia_path })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Sube una imagen al bucket de evidencias.
 * Nombre único: militanteId/timestamp.extensión
 */
async function subirEvidencia(archivo, militanteId) {
  const ext = archivo.name.split('.').pop() || 'jpg'
  const ruta = `${militanteId}/${Date.now()}.${ext}`

  const { error } = await supabase()
    .storage
    .from(BUCKET)
    .upload(ruta, archivo, { cacheControl: '3600', upsert: false })

  if (error) throw error
  return ruta
}

/**
 * Genera una URL temporal para ver una evidencia guardada.
 * Válida por 1 hora. Las evidencias son privadas, así que no
 * hay URL pública permanente.
 */
export async function urlEvidencia(evidencia_path) {
  if (!evidencia_path) return null
  const { data, error } = await supabase()
    .storage
    .from(BUCKET)
    .createSignedUrl(evidencia_path, 3600)
  if (error) return null
  return data.signedUrl
}

// ═══ UTILIDADES DE FORMATO ═══════════════════════════════════

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

/**
 * Convierte ['2026-05','2026-06','2026-07'] en
 * "Mayo, Junio y Julio 2026".
 */
export function formatearMeses(periodos) {
  if (!periodos || periodos.length === 0) return ''

  const partes = periodos.map(p => {
    const [anio, mes] = p.split('-')
    return { anio, nombre: MESES[parseInt(mes, 10) - 1] }
  })

  const anios = [...new Set(partes.map(p => p.anio))]

  if (anios.length === 1) {
    const nombres = partes.map(p => p.nombre)
    if (nombres.length === 1) return `${nombres[0]} ${anios[0]}`
    const ultimo = nombres[nombres.length - 1]
    const resto = nombres.slice(0, -1).join(', ')
    return `${resto} y ${ultimo} ${anios[0]}`
  }

  // Años distintos: mes y año completos en cada uno
  const completos = partes.map(p => `${p.nombre} ${p.anio}`)
  if (completos.length === 1) return completos[0]
  const ultimo = completos[completos.length - 1]
  const resto = completos.slice(0, -1).join(', ')
  return `${resto} y ${ultimo}`
}

/**
 * Arma el texto para WhatsApp que acompaña la evidencia.
 * Encabezado: grupo base. Luego nombre, cantidad, meses y condición.
 */
export function textoWhatsApp(militante, monto, periodoTexto) {
  const lineas = []
  if (militante.grupo_base_nombre) lineas.push(militante.grupo_base_nombre)
  lineas.push(`Nombre: ${militante.nombre}`)
  lineas.push(`Cantidad: ${monto}`)
  lineas.push(`Mes de pago: ${periodoTexto}`)

  if (militante.condicion === 'militante_estudiante') {
    lineas.push('Estudiante', 'Militante')
  } else if (militante.condicion === 'militante_trabajador') {
    lineas.push('Trabajador', 'Militante')
  } else {
    lineas.push('Simpatizante')
  }

  return lineas.join(String.fromCharCode(10))
}
