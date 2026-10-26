/**
 * reuniones.js
 * ───────────────────────────────────────────────────────────────
 * Reuniones del grupo base. Cada reunión guarda en un solo lugar:
 *   · su ORDEN DEL DÍA (antes): discusión política + puntos
 *     Organizativo / Varios.
 *   · su ACTA (después): asistencia, notas por punto, acuerdos y
 *     tareas, y opcionalmente el Word/PDF original.
 *
 * El ciclo: los acuerdos y tareas de un acta que siguen pendientes
 * se ofrecen como puntos de la siguiente orden del día.
 */

import { supabase } from './supabase.js'
import { hoyISO, sumarDias, fechaDocumento, horaTexto } from './fechas.js'

export const AMBITOS = [
  { id: 'GB',   label: 'GB — Grupo base' },
  { id: 'CG',   label: 'CG — Comité' },
  { id: 'otro', label: 'Otra' },
]

export const CATEGORIAS = [
  { id: 'organizativo', label: 'Organizativo' },
  { id: 'varios',       label: 'Varios' },
]

export const ORIGEN_META = {
  fijo:    { label: 'Punto fijo de la plantilla',    color: 'var(--muted)' },
  acuerdo: { label: 'Viene de un acuerdo anterior',  color: 'var(--green)' },
  tarea:   { label: 'Viene de una tarea anterior',   color: 'var(--amber)' },
  manual:  { label: 'Agregado a mano',               color: 'var(--blue)' },
}

const SELECT_REUNION = '*, material:materiales(id, titulo, autor, archivo_path, archivo_nombre)'

// ═══ LECTURA ═════════════════════════════════════════════════

export async function listarReuniones() {
  const { data, error } = await supabase()
    .from('reuniones')
    .select(SELECT_REUNION)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data
}

/** Reunión completa: datos + puntos + acuerdos/tareas. */
export async function obtenerReunion(id) {
  const [r, p, a] = await Promise.all([
    supabase().from('reuniones').select(SELECT_REUNION).eq('id', id).single(),
    supabase().from('puntos_reunion').select('*').eq('reunion_id', id).order('orden'),
    supabase().from('acuerdos').select('*').eq('reunion_id', id).order('orden'),
  ])
  if (r.error) throw r.error
  if (p.error) throw p.error
  if (a.error) throw a.error
  return { reunion: r.data, puntos: p.data, acuerdos: a.data }
}

/** Todos los acuerdos/tareas con la reunión de donde salieron. */
export async function listarAcuerdos({ soloPendientes = false } = {}) {
  let q = supabase()
    .from('acuerdos')
    .select('*, reunion:reuniones!acuerdos_reunion_id_fkey(id, fecha, ambito), llevado:reuniones!acuerdos_llevado_a_reunion_id_fkey(id, fecha)')
    .order('creado_en', { ascending: false })
  if (soloPendientes) q = q.eq('estado', 'pendiente')
  const { data, error } = await q
  if (error) throw error
  return data
}

/**
 * Acuerdos/tareas pendientes que pueden ir en una orden del día.
 * `yaLlevado` indica que ya estuvieron en una orden anterior y
 * siguen sin cumplirse (se sugieren, pero no se agregan solos).
 */
export async function pendientesParaOrden(reunionId = null) {
  const lista = await listarAcuerdos({ soloPendientes: true })
  return lista
    .filter(a => !reunionId || (a.reunion_id !== reunionId && a.llevado_a_reunion_id !== reunionId))
    .map(a => ({ ...a, yaLlevado: !!a.llevado_a_reunion_id }))
    .sort((a, b) => (a.reunion?.fecha || '').localeCompare(b.reunion?.fecha || '') || a.orden - b.orden)
}

// ═══ PLANTILLA DE LA ORDEN DEL DÍA ═══════════════════════════

export async function listarPlantilla() {
  const { data, error } = await supabase()
    .from('plantilla_puntos').select('*').eq('activo', true).order('orden')
  if (error) throw error
  return data
}

/** Reemplaza la plantilla completa por la lista dada. */
export async function guardarPlantilla(puntos) {
  const { error: e1 } = await supabase().from('plantilla_puntos').delete().not('id', 'is', null)
  if (e1) throw e1
  if (puntos.length === 0) return
  const filas = puntos.map((p, i) => ({
    categoria: p.categoria, texto: p.texto.trim(), responsable: (p.responsable || '').trim(), orden: i + 1,
  }))
  const { error } = await supabase().from('plantilla_puntos').insert(filas)
  if (error) throw error
}

// ═══ BORRADOR DE NUEVA REUNIÓN ═══════════════════════════════

/**
 * Prepara todo lo necesario para programar una reunión nueva:
 * fecha sugerida, puntos de la plantilla, pendientes del acta
 * anterior y la discusión anterior (para "continuar el tema").
 */
export async function prepararNuevaReunion(fecha = null) {
  const [reuniones, plantilla, pendientes] = await Promise.all([
    listarReuniones(), listarPlantilla(), pendientesParaOrden(),
  ])
  const ultima = reuniones.find(r => r.ambito === 'GB') || reuniones[0] || null

  let fechaSugerida = fecha
  if (!fechaSugerida) {
    fechaSugerida = hoyISO()
    if (ultima) {
      let f = sumarDias(ultima.fecha, 7)
      while (f < hoyISO()) f = sumarDias(f, 7)
      fechaSugerida = f
    }
  }

  const ultimaConTema = reuniones.find(r => r.discusion_tema)

  return {
    datos: {
      fecha: fechaSugerida,
      hora: ultima?.hora || '21:00',
      zona_horaria: ultima?.zona_horaria || 'Hora del Pacífico',
      ambito: 'GB',
      sesion: 'ordinaria',
      lugar: '',
      mesa: '',
      actas_responsable: '',
      discusion_tema: '',
      discusion_expone: '',
      discusion_continuacion: false,
      material_id: null,
    },
    puntos: plantilla.map(p => ({
      categoria: p.categoria, texto: p.texto, responsable: p.responsable || '',
      origen: 'fijo', origen_id: null, resultado: '',
    })),
    // Entran solos los que nunca han estado en una orden del día
    nuevos: pendientes.filter(a => !a.yaLlevado),
    pendientes,
    temaAnterior: ultimaConTema ? {
      discusion_tema: ultimaConTema.discusion_tema,
      discusion_expone: ultimaConTema.discusion_expone || '',
      material_id: ultimaConTema.material_id || null,
      fecha: ultimaConTema.fecha,
    } : null,
  }
}

/** Convierte un acuerdo/tarea pendiente en punto de orden del día. */
export function puntoDesdeAcuerdo(a) {
  return {
    categoria: 'varios',
    texto: a.texto.replace(/\.$/, ''),
    responsable: a.responsable || '',
    origen: a.tipo === 'tarea' ? 'tarea' : 'acuerdo',
    origen_id: a.id,
    resultado: '',
  }
}

// ═══ ESCRITURA: ORDEN DEL DÍA ════════════════════════════════

function limpiarDatos(datos) {
  const campos = ['fecha','hora','zona_horaria','ambito','sesion','lugar','mesa','actas_responsable',
                  'discusion_tema','discusion_expone','discusion_continuacion','material_id']
  const out = {}
  campos.forEach(c => { if (datos[c] !== undefined) out[c] = datos[c] })
  if (out.material_id === '') out.material_id = null
  return out
}

async function reemplazarPuntos(reunionId, puntos) {
  const { error: e1 } = await supabase().from('puntos_reunion').delete().eq('reunion_id', reunionId)
  if (e1) throw e1
  const filas = puntos
    .filter(p => p.texto.trim())
    .map((p, i) => ({
      reunion_id: reunionId,
      categoria: p.categoria,
      texto: p.texto.trim(),
      responsable: (p.responsable || '').trim(),
      orden: i + 1,
      origen: p.origen || 'manual',
      origen_id: p.origen_id || null,
      resultado: p.resultado || '',
    }))
  if (filas.length === 0) return
  const { error } = await supabase().from('puntos_reunion').insert(filas)
  if (error) throw error
}

/** Marca qué acuerdos quedaron llevados a esta reunión (y libera los que se quitaron). */
async function sincronizarLlevados(reunionId, puntos) {
  const ids = puntos.filter(p => p.origen_id && p.texto.trim()).map(p => p.origen_id)
  const { error: e1 } = await supabase().from('acuerdos')
    .update({ llevado_a_reunion_id: null }).eq('llevado_a_reunion_id', reunionId)
  if (e1) throw e1
  if (ids.length > 0) {
    const { error } = await supabase().from('acuerdos')
      .update({ llevado_a_reunion_id: reunionId }).in('id', ids)
    if (error) throw error
  }
}

export async function crearReunion(datos, puntos) {
  const { data, error } = await supabase().from('reuniones').insert(limpiarDatos(datos)).select().single()
  if (error) throw error
  await reemplazarPuntos(data.id, puntos)
  await sincronizarLlevados(data.id, puntos)
  return data
}

export async function guardarOrden(reunionId, datos, puntos) {
  const { error } = await supabase().from('reuniones').update(limpiarDatos(datos)).eq('id', reunionId)
  if (error) throw error
  await reemplazarPuntos(reunionId, puntos)
  await sincronizarLlevados(reunionId, puntos)
}

export async function eliminarReunion(reunion) {
  const { error } = await supabase().from('reuniones').delete().eq('id', reunion.id)
  if (error) throw error
}

// ═══ ESCRITURA: ACTA ═════════════════════════════════════════

/**
 * Guarda el acta de una reunión.
 *  datosActa: asistentes[], hora, mesa, actas_responsable, discusion_*,
 *             acta_notas, acta_archivo_path/nombre
 *  puntos:    lista completa de puntos (con su resultado)
 *  acuerdos:  lista de acuerdos/tareas (los que traen id se actualizan,
 *             los nuevos se insertan, los que ya no vienen se borran)
 */
export async function guardarActa(reunionId, datosActa, puntos, acuerdos) {
  const cambios = {
    ...limpiarDatos(datosActa),
    asistentes: datosActa.asistentes || [],
    acta_notas: datosActa.acta_notas || '',
    acta_archivo_path: datosActa.acta_archivo_path || '',
    acta_archivo_nombre: datosActa.acta_archivo_nombre || '',
    acta_lista: true,
  }
  const { error } = await supabase().from('reuniones').update(cambios).eq('id', reunionId)
  if (error) throw error

  await reemplazarPuntos(reunionId, puntos)

  // Acuerdos: diferencia contra lo guardado
  const { data: actuales, error: e2 } = await supabase().from('acuerdos').select('id').eq('reunion_id', reunionId)
  if (e2) throw e2
  const validos = acuerdos.filter(a => a.texto.trim())
  const idsQueQuedan = new Set(validos.filter(a => a.id).map(a => a.id))
  const aBorrar = actuales.filter(a => !idsQueQuedan.has(a.id)).map(a => a.id)
  if (aBorrar.length) {
    const { error: e3 } = await supabase().from('acuerdos').delete().in('id', aBorrar)
    if (e3) throw e3
  }
  for (const [i, a] of validos.entries()) {
    const fila = {
      reunion_id: reunionId, tipo: a.tipo, texto: a.texto.trim(),
      responsable: (a.responsable || '').trim(), fecha_limite: a.fecha_limite || null, orden: i + 1,
    }
    const res = a.id
      ? await supabase().from('acuerdos').update(fila).eq('id', a.id)
      : await supabase().from('acuerdos').insert({ ...fila, estado: 'pendiente' })
    if (res.error) throw res.error
  }
}

/** Cambia el estado de un acuerdo/tarea (pendiente ↔ cumplido / descartado). */
export async function cambiarEstadoAcuerdo(id, estado) {
  const { error } = await supabase().from('acuerdos').update({
    estado, cumplido_en: estado === 'cumplido' ? hoyISO() : null,
  }).eq('id', id)
  if (error) throw error
}

// ═══ ESTADO DE UNA REUNIÓN ═══════════════════════════════════

/** 'proxima' | 'hoy' | 'falta_acta' | 'con_acta' */
export function estadoReunion(r) {
  if (r.acta_lista) return 'con_acta'
  const hoy = hoyISO()
  if (r.fecha === hoy) return 'hoy'
  if (r.fecha > hoy) return 'proxima'
  return 'falta_acta'
}

export const ESTADO_REUNION_META = {
  proxima:    { label: 'Orden del día',  clase: 'gris'  },
  hoy:        { label: 'Hoy',            clase: 'rojo'  },
  falta_acta: { label: 'Falta acta',     clase: 'ambar' },
  con_acta:   { label: 'Acta ✓',         clase: 'verde' },
}

// ═══ TEXTOS PARA WHATSAPP ════════════════════════════════════

const NL = '\n'

function lineaPunto(p) {
  return `- ${p.texto}${p.responsable ? ` | ${p.responsable}` : ''}`
}

function lineaDiscusion(r) {
  if (!r.discusion_tema) return null
  const tema = r.discusion_tema + (r.discusion_continuacion ? ' - Continuación' : '')
  return `${tema}${r.discusion_expone ? ` | ${r.discusion_expone}` : ''}`
}

function encabezado(titulo, r) {
  const sesion = r.sesion === 'extraordinaria' ? 'Sesión extraordinaria' : 'Sesión ordinaria'
  const L = [
    `*${titulo} ${r.ambito === 'otro' ? '' : r.ambito}*`.replace(' *', '*'),
    fechaDocumento(r.fecha),
    `${horaTexto(r.hora)}${r.zona_horaria ? ` — ${r.zona_horaria}` : ''}`,
    sesion,
  ]
  if (r.lugar) L.push(`Lugar: ${r.lugar}`)
  return L
}

function bloquesAgenda(r, puntos, conResultado) {
  const L = []
  L.push('', '*Orden del día:*')
  const mesa = [r.mesa && `Mesa: ${r.mesa}`, r.actas_responsable && `Actas: ${r.actas_responsable}`].filter(Boolean)
  if (mesa.length) L.push(mesa.join('  |  '))
  const disc = lineaDiscusion(r)
  if (disc) {
    L.push('', '*Discusión política:*', disc)
    if (r.material?.titulo) L.push(`Material: ${r.material.titulo}${r.material.autor ? ` (${r.material.autor})` : ''}`)
  }
  for (const cat of CATEGORIAS) {
    const lista = puntos.filter(p => p.categoria === cat.id)
    if (!lista.length) continue
    L.push('', `*${cat.label}:*`)
    lista.forEach(p => {
      L.push(lineaPunto(p))
      if (conResultado && p.resultado?.trim()) L.push(`   ↳ ${p.resultado.trim()}`)
    })
  }
  return L
}

/** Texto de la orden del día, con el formato de tus documentos. */
export function textoOrdenDelDia(r, puntos) {
  return [...encabezado('Orden del día', r), ...bloquesAgenda(r, puntos, false)].join(NL)
}

/** Texto del acta, con el formato de tus documentos. */
export function textoActa(r, puntos, acuerdos) {
  const L = [...encabezado('Actas', r)]
  if (r.asistentes?.length) L.push('', '*Asistencia:*', r.asistentes.join(', '))
  L.push(...bloquesAgenda(r, puntos, true))
  const acs = acuerdos.filter(a => a.tipo === 'acuerdo')
  const tar = acuerdos.filter(a => a.tipo === 'tarea')
  if (acs.length) {
    L.push('', '*Acuerdos:*')
    acs.forEach(a => L.push(`- ${a.texto}${a.responsable ? ` | ${a.responsable}` : ''}`))
  }
  if (tar.length) {
    L.push('', '*Tareas:*')
    tar.forEach(a => L.push(`- ${a.texto}${a.responsable ? ` | ${a.responsable}` : ''}${a.fecha_limite ? ` (para el ${fechaDocumento(a.fecha_limite)})` : ''}`))
  }
  if (r.acta_notas?.trim()) L.push('', '*Notas:*', r.acta_notas.trim())
  return L.join(NL)
}
