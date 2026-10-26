/**
 * actividadesGB.js
 * ───────────────────────────────────────────────────────────────
 * Registro del trabajo del grupo base (pegas, eventos, formación…)
 * y su catálogo de tipos. Alimenta el informe mensual.
 *
 * Ojo: no confundir con el catálogo "actividades" de catalogos.js,
 * que es el CARGO de cada militante.
 */

import { supabase } from './supabase.js'

// ═══ TIPOS ═══════════════════════════════════════════════════

export async function listarTiposActividad() {
  const { data, error } = await supabase().from('tipos_actividad').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function crearTipoActividad(nombre, color) {
  const { data, error } = await supabase()
    .from('tipos_actividad').insert({ nombre: nombre.trim(), color }).select().single()
  if (error) throw error
  return data
}

export async function actualizarTipoActividad(id, cambios) {
  const { error } = await supabase().from('tipos_actividad').update(cambios).eq('id', id)
  if (error) throw error
}

export async function eliminarTipoActividad(id) {
  const { error } = await supabase().from('tipos_actividad').delete().eq('id', id)
  if (error) throw error
}

// ═══ REGISTRO ════════════════════════════════════════════════

export async function listarActividadesGB() {
  const { data, error } = await supabase()
    .from('registro_actividades')
    .select('*, tipo:tipos_actividad(id, nombre, color), acuerdo:acuerdos(id, texto, tipo)')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data
}

export async function guardarActividadGB(datos, id = null) {
  const fila = {
    fecha: datos.fecha,
    tipo_id: datos.tipo_id || null,
    titulo: datos.titulo.trim(),
    lugar: (datos.lugar || '').trim(),
    participantes: (datos.participantes || '').trim(),
    cantidad: datos.cantidad === '' || datos.cantidad == null ? null : Number(datos.cantidad),
    unidad: (datos.unidad || '').trim(),
    acuerdo_id: datos.acuerdo_id || null,
    notas: datos.notas || '',
  }
  const res = id
    ? await supabase().from('registro_actividades').update(fila).eq('id', id).select().single()
    : await supabase().from('registro_actividades').insert(fila).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function eliminarActividadGB(id) {
  const { error } = await supabase().from('registro_actividades').delete().eq('id', id)
  if (error) throw error
}
