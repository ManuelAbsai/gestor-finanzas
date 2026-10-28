/**
 * lectorContacto.js
 * ───────────────────────────────────────────────────────────────
 * Lee el mensaje de WhatsApp con el que la comisión pasa un
 * contacto nuevo y lo convierte en los campos del aspirante.
 *
 * Formato típico (cada dato en su renglón, con viñetas o guiones):
 *   • 12/10/2026
 *   - 10:23 pm
 *   - Nombre Apellido
 *   - 8441234567
 *   - correo@gmail.com
 *   - 15 - 17
 *   - Coahuila
 *   - Saltillo
 *   - Estudiante
 *   - Universidad X
 *   - redes
 *   - Instagram
 *   - Por qué quiere participar…
 *
 * No depende del orden exacto: reconoce cada renglón por su forma
 * (fecha, teléfono, correo, estado, red social…) y lo que no
 * reconoce lo acomoda según lo que venía antes.
 */

const ESTADOS_MX = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'CDMX', 'Coahuila', 'Colima', 'Durango',
  'Estado de México', 'Edomex', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
  'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
  'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
]

export const OCUPACIONES = ['Estudiante', 'Trabajador', 'Estudiante y trabajador', 'Desempleado', 'Jubilado', 'Hogar', 'Otro']

const sinAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function esEstado(t) {
  const n = sinAcentos(t).replace(/\.$/, '')
  return ESTADOS_MX.find(e => {
    const en = sinAcentos(e)
    return n === en || n === `${en} de zaragoza` || n.startsWith(en + ',')
  }) || null
}

/** Red social o medio por el que llegó → id de canal. */
function canalDe(t) {
  const n = sinAcentos(t)
  if (/^(facebook|fb|face)\b/.test(n)) return 'facebook'
  if (/^(instagram|insta|ig)\b/.test(n)) return 'instagram'
  if (/^tik ?tok\b/.test(n)) return 'tiktok'
  if (/^(pagina web|web|sitio web|internet|google)\b/.test(n)) return 'web'
  if (/^(referid|amig|conocid|familiar|recomend)/.test(n)) return 'referido'
  return null
}

function ocupacionDe(t) {
  const n = sinAcentos(t)
  if (n.length > 40) return null
  if (/estudi/.test(n) && /trabaj/.test(n)) return 'Estudiante y trabajador'
  if (/^estudiant/.test(n)) return 'Estudiante'
  if (/^(trabajador|trabajo|empleado|obrero|profesionista|docente|maestr)/.test(n)) return 'Trabajador'
  if (/^desemplead/.test(n)) return 'Desempleado'
  if (/^(jubilad|pensionad|retirad)/.test(n)) return 'Jubilado'
  if (/^(ama de casa|hogar)/.test(n)) return 'Hogar'
  return null
}

const RE_FECHA = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/
const RE_HORA = /^\d{1,2}:\d{2}(:\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?|hrs?\.?)?$/i
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RE_EDAD = /^(\d{1,2}\s*(-|–|a|y)\s*\d{1,2}|\+?\s?\d{1,2}\s*\+?|\d{1,2}\s*(años)?|(mas|más) de \d{1,2}|\d{1,2} o (mas|más))(\s*años)?$/i
const GENERICOS = /^(redes|redes sociales|red social|por redes|internet)$/

function limpiarRenglon(r) {
  return r
    .replace(/\*([^*\n]+)\*/g, '$1')    // negritas de WhatsApp
    .replace(/^[\s•·●▪◦*\-–—>]+/, '')   // viñetas y guiones al inicio
    .trim()
}

/** Si el renglón viene como "Etiqueta: valor", reconoce la etiqueta. */
const ETIQUETAS = [
  [/^fecha/, 'fecha'], [/^hora/, 'hora'], [/^nombre/, 'nombre'],
  [/^(tel|cel|whats|numero|n[uú]m)/, 'telefono'], [/^(correo|e-?mail|mail)/, 'correo'],
  [/^edad/, 'edad'], [/^estado/, 'estado'], [/^(ciudad|municipio|localidad)/, 'ciudad'],
  [/^(ocupaci|a que se dedica|actividad)/, 'ocupacion'],
  [/^(escuela|lugar|instituci|trabajo|empresa|universidad|centro)/, 'escuela'],
  [/(entero|enter[oó]|medio|red|canal|llego|lleg[oó]|nos conoci|conoci)/, 'canal'],
  [/(motivo|por ?que|interes|comentario|mensaje|razon)/, 'motivo'],
]
function separarEtiqueta(r) {
  const m = r.match(/^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿?.\s]{2,30}):\s*(.*)$/)
  if (!m) return null
  const et = sinAcentos(m[1]).replace(/[¿?]/g, '')
  const campo = ETIQUETAS.find(([re]) => re.test(et))?.[1]
  return campo ? { campo, valor: m[2].trim() } : null
}

/**
 * Convierte el texto pegado en datos del aspirante.
 * Regresa { datos, reconocidos } — reconocidos lista los campos
 * que se llenaron, para mostrarlo en pantalla.
 */
export function leerMensajeContacto(texto) {
  const renglones = (texto || '').split(/\r?\n/).map(limpiarRenglon).filter(Boolean)
  const d = {
    fecha_registro: '', nombre: '', telefono: '', correo: '', edad: '',
    estado_rep: '', ciudad: '', ocupacion: '', escuela_trabajo: '',
    canal: '', referido_por: '', motivo: '',
  }
  let anterior = null
  let vioCanal = false
  const motivo = []

  for (let r of renglones) {
    // Formato con etiquetas ("Ciudad: Saltillo"): se respeta la etiqueta
    const et = separarEtiqueta(r)
    if (et) {
      const v = et.valor
      anterior = et.campo
      if (!v) continue
      if (et.campo === 'motivo') { motivo.push(v); continue }
      if (et.campo === 'fecha' && RE_FECHA.test(v)) {
        const [, dd, mm, aa] = v.match(RE_FECHA)
        d.fecha_registro = `${aa.length === 2 ? '20' + aa : aa}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
        continue
      }
      if (et.campo === 'hora' || et.campo === 'fecha') continue
      if (et.campo === 'canal') {
        const c = canalDe(v) || (/referid|amig|conocid|recomend/.test(sinAcentos(v)) ? 'referido' : null)
        if (c) {
          d.canal = c; vioCanal = true
          const quien = v.match(/(?:por|de)\s+(.+)$/i)
          if (c === 'referido' && quien) d.referido_por = quien[1].trim()
        }
        continue
      }
      const destino = { nombre: 'nombre', telefono: 'telefono', correo: 'correo', edad: 'edad', estado: 'estado_rep', ciudad: 'ciudad', ocupacion: 'ocupacion', escuela: 'escuela_trabajo' }[et.campo]
      if (destino === 'estado_rep') d.estado_rep = esEstado(v) || v
      else if (destino === 'ocupacion') d.ocupacion = ocupacionDe(v) || v
      else if (destino === 'edad') d.edad = v.replace(/\s*(-|–)\s*/, '-').replace(/\s*años$/i, '')
      else if (destino === 'correo') d.correo = v.toLowerCase()
      else d[destino] = v
      continue
    }

    const digitos = r.replace(/\D/g, '')
    let tipo = null

    if (!d.fecha_registro && RE_FECHA.test(r)) {
      const [, dd, mm, aa] = r.match(RE_FECHA)
      const anio = aa.length === 2 ? `20${aa}` : aa
      d.fecha_registro = `${anio}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
      tipo = 'fecha'
    } else if (RE_HORA.test(r)) {
      tipo = 'hora'
    } else if (!d.correo && RE_CORREO.test(r)) {
      d.correo = r.toLowerCase()
      tipo = 'correo'
    } else if (!d.telefono && digitos.length >= 10 && digitos.length <= 13 && /^[\d\s+()-.]+$/.test(r)) {
      d.telefono = r.replace(/\s+/g, ' ').trim()
      tipo = 'telefono'
    } else if (!d.edad && RE_EDAD.test(r) && digitos.length <= 4) {
      d.edad = r.replace(/\s*(-|–)\s*/, '-').replace(/\s*años$/i, '')
      tipo = 'edad'
    } else if (!d.estado_rep && esEstado(r)) {
      d.estado_rep = esEstado(r)
      tipo = 'estado'
    } else if (!d.canal && canalDe(r)) {
      d.canal = canalDe(r)
      tipo = 'canal'; vioCanal = true
      // "Referido por Juan" / "Amigo: Juan"
      const quien = r.match(/(?:por|de|:)\s+(.+)$/i)
      if (d.canal === 'referido' && quien) d.referido_por = quien[1].trim()
    } else if (GENERICOS.test(sinAcentos(r))) {
      tipo = 'generico'; vioCanal = true
    } else if (!d.ocupacion && ocupacionDe(r)) {
      d.ocupacion = ocupacionDe(r)
      tipo = 'ocupacion'
    } else {
      // Lo que no se reconoce por su forma se acomoda por contexto
      if (vioCanal || motivo.length) { motivo.push(r); tipo = 'motivo' }
      else if (!d.nombre) { d.nombre = r; tipo = 'nombre' }
      else if (anterior === 'estado' && !d.ciudad) { d.ciudad = r; tipo = 'ciudad' }
      else if (anterior === 'ocupacion' && !d.escuela_trabajo) { d.escuela_trabajo = r; tipo = 'escuela' }
      else if (!d.ciudad && r.length <= 30) { d.ciudad = r; tipo = 'ciudad' }
      else if (!d.escuela_trabajo && r.length <= 50) { d.escuela_trabajo = r; tipo = 'escuela' }
      else { motivo.push(r); tipo = 'motivo' }
    }
    anterior = tipo
  }
  d.motivo = motivo.join(' ').replace(/\s+/g, ' ').trim()

  const etiquetas = {
    fecha_registro: 'fecha', nombre: 'nombre', telefono: 'teléfono', correo: 'correo', edad: 'edad',
    estado_rep: 'estado', ciudad: 'ciudad', ocupacion: 'ocupación', escuela_trabajo: 'escuela/trabajo',
    canal: 'origen', motivo: 'motivo',
  }
  const reconocidos = Object.entries(etiquetas).filter(([k]) => d[k]).map(([, v]) => v)
  return { datos: d, reconocidos }
}

/** Solo dígitos, últimos 10 (para comparar teléfonos con o sin +52). */
export function telefonoClave(t) {
  const dg = (t || '').replace(/\D/g, '')
  return dg.length >= 10 ? dg.slice(-10) : ''
}

/**
 * Categoría de militante sugerida a partir de los datos del
 * aspirante (para cuando se da de alta).
 */
export function categoriaSugerida(a) {
  const oc = sinAcentos(a.ocupacion || '')
  const esc = sinAcentos(a.escuela_trabajo || '')
  if (oc.startsWith('estudiante')) {
    if (/(univ|facultad|tecnologico|instituto tec|itesm|tec de|uadec|uaaan|normal|licenciatura|ingenieria)/.test(esc)) return 'universitario'
    if (/(prepa|bachiller|cbtis|cetis|conalep|cecyt|cobac|colegio de bachilleres|secundaria)/.test(esc)) return 'media_superior'
    const edad = parseInt(a.edad, 10)
    if (edad && edad <= 17) return 'media_superior'
    return ''
  }
  if (oc.startsWith('trabajador')) return 'trabajador'
  if (oc.startsWith('desemplead')) return 'desempleado'
  if (oc.startsWith('jubilad')) return 'retirado'
  return ''
}
