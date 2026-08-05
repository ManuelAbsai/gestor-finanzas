/**
 * remisiones.js
 * ───────────────────────────────────────────────────────────────
 * Remisiones al partido, eventos del calendario, y las funciones
 * de cálculo que alimentan el dashboard (estado de cuota,
 * porcentaje de cobranza del mes).
 */

import { supabase } from './supabase.js'

// ═══ REMISIONES ══════════════════════════════════════════════

export async function listarRemisiones() {
  const { data, error } = await supabase()
    .from('remisiones')
    .select('*')
    .order('numero', { ascending: false })
  if (error) throw error
  return data
}

export async function crearRemision(datos) {
  const { data, error } = await supabase()
    .from('remisiones')
    .insert(datos)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function marcarRemisionEnviada(id) {
  const { error } = await supabase()
    .from('remisiones')
    .update({ estado: 'enviado' })
    .eq('id', id)
  if (error) throw error
}

// ═══ EVENTOS DEL CALENDARIO ══════════════════════════════════

export async function listarEventos() {
  const { data, error } = await supabase()
    .from('eventos')
    .select('*')
    .order('fecha')
  if (error) throw error
  return data
}

export async function crearEvento(datos) {
  const { data, error } = await supabase()
    .from('eventos')
    .insert(datos)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarEvento(id) {
  const { error } = await supabase().from('eventos').delete().eq('id', id)
  if (error) throw error
}

// ═══ CÁLCULOS PARA EL DASHBOARD ══════════════════════════════

/** Periodo actual en formato YYYY-MM. */
export function periodoActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const UMBRAL_POR_VENCER = 3 // días

/**
 * Determina el estado de cuota de un militante para el mes en curso.
 * Requiere saber si ya pagó el periodo actual (pagadoEsteMes).
 *   'pagado' | 'vencido' | 'por_vencer' | 'pendiente'
 */
export function estadoCuota(militante, pagadoEsteMes) {
  if (pagadoEsteMes) return 'pagado'
  const hoy = new Date().getDate()
  const dia = parseInt(militante.cuota_dia, 10)
  if (hoy > dia) return 'vencido'
  if (dia - hoy <= UMBRAL_POR_VENCER) return 'por_vencer'
  return 'pendiente'
}

export const ESTADO_META = {
  pagado:     { label: 'Pagado',     clase: 'verde'  },
  vencido:    { label: 'Vencida',    clase: 'rojo'   },
  por_vencer: { label: 'Por vencer', clase: 'ambar'  },
  pendiente:  { label: 'Pendiente',  clase: 'gris'   },
}

/**
 * Calcula los indicadores del dashboard para el mes en curso.
 * Recibe la lista de militantes y el conjunto de ids que ya
 * pagaron el periodo actual.
 */
export function calcularCobranza(militantes, idsPagaronEsteMes) {
  const totalEsperado = militantes.reduce((s, m) => s + Number(m.cuota_monto || 0), 0)
  const cobrado = militantes
    .filter(m => idsPagaronEsteMes.has(m.id))
    .reduce((s, m) => s + Number(m.cuota_monto || 0), 0)

  const porCobrar = totalEsperado - cobrado
  const pct = totalEsperado > 0 ? Math.round((cobrado / totalEsperado) * 100) : 0

  return { totalEsperado, cobrado, porCobrar, pct }
}

// ═══ HISTÓRICO DE COBRANZA (para la gráfica de Inicio) ══════

const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

/** 'YYYY-MM' → 'Junio 2026' */
export function periodoLegible(periodo) {
  const [y, m] = periodo.split('-')
  return `${MESES_LARGO[parseInt(m, 10) - 1]} ${y}`
}

/**
 * Genera los últimos `cantidad` periodos (YYYY-MM), terminando en
 * `hastaPeriodo` (o el actual si no se indica). Orden cronológico.
 */
export function generarPeriodos(cantidad, hastaPeriodo = null) {
  const [yFin, mFin] = (hastaPeriodo || periodoActual()).split('-').map(Number)
  const periodos = []
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(yFin, mFin - 1 - i, 1)
    periodos.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return periodos
}

/**
 * % de cobranza de un periodo específico, usando el padrón activo
 * actual como referencia de cuotas esperadas (no se guarda un
 * histórico de altas/bajas por mes, así que esto es una
 * aproximación razonable basada en quién está activo hoy).
 */
export function calcularCobranzaDelPeriodo(militantesActivos, pagos, periodo) {
  const idsPagaron = new Set(
    pagos.filter(p => (p.meses_cubre || []).includes(periodo)).map(p => p.militante_id)
  )
  return calcularCobranza(militantesActivos, idsPagaron)
}
