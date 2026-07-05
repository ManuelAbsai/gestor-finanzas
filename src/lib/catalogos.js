/**
 * catalogos.js
 * ───────────────────────────────────────────────────────────────
 * Operaciones sobre grupos base y etiquetas: los catálogos que
 * el usuario administra y luego asigna a cada militante.
 */

import { supabase } from './supabase.js'

// ═══ GRUPOS BASE ═════════════════════════════════════════════

export async function listarGruposBase() {
  const { data, error } = await supabase()
    .from('grupos_base')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data
}

export async function crearGrupoBase(nombre) {
  const { data, error } = await supabase()
    .from('grupos_base')
    .insert({ nombre: nombre.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarGrupoBase(id) {
  const { error } = await supabase()
    .from('grupos_base')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ═══ ETIQUETAS ═══════════════════════════════════════════════

export async function listarEtiquetas() {
  const { data, error } = await supabase()
    .from('etiquetas')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data
}

export async function crearEtiqueta(nombre, color) {
  const { data, error } = await supabase()
    .from('etiquetas')
    .insert({ nombre: nombre.trim(), color })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarEtiqueta(id, cambios) {
  const { data, error } = await supabase()
    .from('etiquetas')
    .update(cambios)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarEtiqueta(id) {
  const { error } = await supabase()
    .from('etiquetas')
    .delete()
    .eq('id', id)
  if (error) throw error
}
