/**
 * materiales.js
 * ───────────────────────────────────────────────────────────────
 * Biblioteca de materiales de estudio para la discusión política
 * (libros, capítulos, artículos), con su archivo PDF/Word.
 */

import { supabase } from './supabase.js'
import { subirDocumento, borrarDocumento } from './archivos.js'

export const TIPOS_MATERIAL = [
  { id: 'libro',     label: 'Libro' },
  { id: 'capitulo',  label: 'Capítulo' },
  { id: 'articulo',  label: 'Artículo' },
  { id: 'texto',     label: 'Texto / documento' },
  { id: 'otro',      label: 'Otro' },
]

export function labelTipoMaterial(id) {
  return TIPOS_MATERIAL.find(t => t.id === id)?.label || id
}

export async function listarMateriales() {
  const { data, error } = await supabase().from('materiales').select('*').order('titulo')
  if (error) throw error
  return data
}

/** Crea o actualiza un material. `archivo` (File) es opcional. */
export async function guardarMaterial(datos, archivo = null, anterior = null) {
  const fila = {
    titulo: datos.titulo.trim(),
    autor: (datos.autor || '').trim(),
    tipo: datos.tipo || 'texto',
    notas: datos.notas || '',
  }
  if (archivo) {
    const sub = await subirDocumento(archivo, 'materiales')
    fila.archivo_path = sub.path
    fila.archivo_nombre = sub.nombre
    if (anterior?.archivo_path) await borrarDocumento(anterior.archivo_path)
  }
  const res = anterior?.id
    ? await supabase().from('materiales').update(fila).eq('id', anterior.id).select().single()
    : await supabase().from('materiales').insert(fila).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function eliminarMaterial(m) {
  const { error } = await supabase().from('materiales').delete().eq('id', m.id)
  if (error) throw error
  await borrarDocumento(m.archivo_path)
}
