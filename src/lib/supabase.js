/**
 * supabase.js
 * ───────────────────────────────────────────────────────────────
 * Conexión a Supabase de cada usuario.
 *
 * Las credenciales (URL + anon key) se guardan SOLO en el
 * dispositivo del usuario (localStorage). Nunca viajan a ningún
 * servidor ajeno ni se incluyen en el código del repositorio.
 */

import { createClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'gf_conexion'

let _cliente = null

// ── Credenciales locales ─────────────────────────────────────

export function getCredenciales() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function guardarCredenciales(url, anonKey) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, anonKey }))
  _cliente = null // forzar recreación con las nuevas credenciales
}

export function borrarCredenciales() {
  localStorage.removeItem(STORAGE_KEY)
  _cliente = null
}

export function hayConexion() {
  return getCredenciales() !== null
}

// ── Cliente ──────────────────────────────────────────────────

export function supabase() {
  if (_cliente) return _cliente
  const creds = getCredenciales()
  if (!creds) throw new Error('Sin conexión configurada.')
  _cliente = createClient(creds.url, creds.anonKey)
  return _cliente
}

// ── Verificación de instalación ──────────────────────────────

/**
 * Prueba las credenciales y verifica que las tablas existan.
 * Retorna { ok, error } con mensajes en lenguaje claro.
 */
export async function verificarConexion(url, anonKey) {
  // 1. Validar formato de la URL
  if (!url?.startsWith('https://') || !url.includes('.supabase.co')) {
    return {
      ok: false,
      error: 'La URL no parece de Supabase. Debe verse así: https://xxxxx.supabase.co',
    }
  }
  if (!anonKey || anonKey.length < 30) {
    return {
      ok: false,
      error: 'La clave parece incompleta. Copia la clave "anon public" completa desde tu panel.',
    }
  }

  // 2. Probar la conexión consultando una tabla clave
  let clientePrueba
  try {
    clientePrueba = createClient(url, anonKey)
  } catch {
    return { ok: false, error: 'No se pudo crear la conexión. Revisa la URL y la clave.' }
  }

  const { error } = await clientePrueba.from('militantes').select('id').limit(1)

  if (error) {
    // Tabla no existe → falta correr setup.sql
    if (error.code === '42P01' || /does not exist|relation/i.test(error.message)) {
      return {
        ok: false,
        error: 'FALTA_SETUP',
      }
    }
    // Clave inválida u otro problema de acceso
    if (/JWT|api key|unauthorized|invalid/i.test(error.message)) {
      return {
        ok: false,
        error: 'La clave no fue aceptada. Verifica que copiaste la clave "anon public" correcta.',
      }
    }
    return { ok: false, error: `No se pudo conectar: ${error.message}` }
  }

  return { ok: true }
}

/**
 * Verifica que TODAS las tablas necesarias existan.
 * Se usa después de conectar, para detectar instalaciones incompletas.
 */
export async function verificarTablas() {
  const tablas = ['grupos_base', 'etiquetas', 'militantes', 'pagos', 'remisiones', 'eventos']
  const faltantes = []

  for (const tabla of tablas) {
    const { error } = await supabase().from(tabla).select('id').limit(1)
    if (error && (error.code === '42P01' || /does not exist/i.test(error.message))) {
      faltantes.push(tabla)
    }
  }

  return { completo: faltantes.length === 0, faltantes }
}
