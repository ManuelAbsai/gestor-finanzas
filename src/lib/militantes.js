/**
 * militantes.js
 * ───────────────────────────────────────────────────────────────
 * Operaciones sobre militantes: altas, ediciones, consultas con
 * sus etiquetas y grupo base resueltos.
 *
 * La relación con etiquetas es muchos-a-muchos (tabla
 * militante_etiquetas), así que al leer resolvemos las etiquetas
 * en un arreglo de ids para comodidad de la interfaz.
 */

import { supabase } from './supabase.js'

// ── Constantes de condición (fijas, no configurables) ────────
export const CONDICIONES = [
  { id: 'simpatizante',         label: 'Simpatizante' },
  { id: 'militante_estudiante', label: 'Estudiante' },
  { id: 'militante_trabajador', label: 'Trabajador' },
]

export function labelCondicion(id) {
  return CONDICIONES.find(c => c.id === id)?.label || id
}

// ═══ LECTURA ═════════════════════════════════════════════════

/**
 * Lista todos los militantes activos con su grupo base y las
 * ids de sus etiquetas resueltas en un arreglo `etiquetas`.
 */
export async function listarMilitantes({ incluirInactivos = false } = {}) {
  let q = supabase()
    .from('militantes')
    .select(`
      *,
      grupo_base:grupos_base(id, nombre),
      actividad:actividades(id, nombre),
      militante_etiquetas(etiqueta_id)
    `)
    .order('nombre')

  if (!incluirInactivos) q = q.eq('activo', true)

  const { data, error } = await q
  if (error) throw error

  // Aplanar: etiquetas como arreglo de ids
  return data.map(m => ({
    ...m,
    grupo_base_nombre: m.grupo_base?.nombre || '',
    actividad_nombre: m.actividad?.nombre || '',
    etiquetas: (m.militante_etiquetas || []).map(r => r.etiqueta_id),
  }))
}

export async function obtenerMilitante(id) {
  const { data, error } = await supabase()
    .from('militantes')
    .select(`
      *,
      grupo_base:grupos_base(id, nombre),
      actividad:actividades(id, nombre),
      militante_etiquetas(etiqueta_id)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return {
    ...data,
    grupo_base_nombre: data.grupo_base?.nombre || '',
    actividad_nombre: data.actividad?.nombre || '',
    etiquetas: (data.militante_etiquetas || []).map(r => r.etiqueta_id),
  }
}

// ═══ ESCRITURA ═══════════════════════════════════════════════

/**
 * Crea un militante y enlaza sus etiquetas.
 * `datos` incluye: nombre, telefono, correo, condicion,
 * grupo_base_id, color_individual, cuota_monto, cuota_dia,
 * fecha_alta, referencia, actividad, notas, y etiquetas[] (ids).
 */
export async function crearMilitante(datos) {
  const { etiquetas = [], ...campos } = datos

  const { data, error } = await supabase()
    .from('militantes')
    .insert(campos)
    .select()
    .single()

  if (error) throw error

  if (etiquetas.length > 0) {
    await enlazarEtiquetas(data.id, etiquetas)
  }

  return data
}

/**
 * Actualiza un militante y reemplaza el conjunto de etiquetas.
 */
export async function actualizarMilitante(id, datos) {
  const { etiquetas, ...campos } = datos

  const { error } = await supabase()
    .from('militantes')
    .update(campos)
    .eq('id', id)

  if (error) throw error

  // Si vienen etiquetas, reemplazar el conjunto completo
  if (etiquetas !== undefined) {
    await supabase().from('militante_etiquetas').delete().eq('militante_id', id)
    if (etiquetas.length > 0) {
      await enlazarEtiquetas(id, etiquetas)
    }
  }
}

/**
 * Baja lógica: no se borra, se marca inactivo para conservar
 * su historial de pagos.
 */
export async function darDeBajaMilitante(id) {
  const { error } = await supabase()
    .from('militantes')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}

/** Reactiva a alguien que estaba dado de baja. */
export async function reactivarMilitante(id) {
  const { error } = await supabase()
    .from('militantes')
    .update({ activo: true })
    .eq('id', id)
  if (error) throw error
}

/**
 * Elimina un militante de forma PERMANENTE, junto con sus pagos
 * y etiquetas (por "on delete cascade" en la base de datos).
 * No se puede deshacer — úsala solo desde el menú de edición,
 * con confirmación explícita del usuario.
 */
export async function eliminarMilitante(id) {
  const { error } = await supabase()
    .from('militantes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Sube la foto de perfil de un militante al bucket "avatares" y
 * devuelve la ruta guardada (para el campo foto_path).
 */
export async function subirFotoPerfil(archivo, militanteId) {
  const ext = archivo.name.split('.').pop() || 'jpg'
  const ruta = `${militanteId}/${Date.now()}.${ext}`
  const { error } = await supabase()
    .storage
    .from('avatares')
    .upload(ruta, archivo, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return ruta
}

/** URL temporal (1h) para mostrar una foto de perfil guardada. */
export async function urlFotoPerfil(foto_path) {
  if (!foto_path) return null
  const { data, error } = await supabase()
    .storage
    .from('avatares')
    .createSignedUrl(foto_path, 3600)
  if (error) return null
  return data.signedUrl
}

// ── Helper interno ───────────────────────────────────────────
async function enlazarEtiquetas(militanteId, etiquetaIds) {
  const filas = etiquetaIds.map(eid => ({
    militante_id: militanteId,
    etiqueta_id: eid,
  }))
  const { error } = await supabase().from('militante_etiquetas').insert(filas)
  if (error) throw error
}
