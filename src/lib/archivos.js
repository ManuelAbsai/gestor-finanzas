/**
 * archivos.js
 * ───────────────────────────────────────────────────────────────
 * Subir y abrir documentos (actas en Word/PDF, materiales de
 * estudio) en el bucket privado "documentos", reducir fotos antes
 * de subirlas, y copiar texto al portapapeles.
 */

import { supabase } from './supabase.js'

const BUCKET = 'documentos'

/** Limpia un nombre de archivo para usarlo en una ruta. */
function nombreSeguro(nombre) {
  return nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-80)
}

/**
 * Sube un archivo a documentos/<carpeta>/... y regresa
 * { path, nombre } para guardarlo en la tabla correspondiente.
 */
export async function subirDocumento(archivo, carpeta) {
  const path = `${carpeta}/${Date.now()}_${nombreSeguro(archivo.name)}`
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(path, archivo, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return { path, nombre: archivo.name }
}

/** Abre (descarga) un documento guardado, con un enlace temporal. */
export async function abrirDocumento(path) {
  if (!path) return
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(path, 600)
  if (error) throw error
  window.open(data.signedUrl, '_blank', 'noopener')
}

/** Borra un documento del almacenamiento (si falla, no truena la app). */
export async function borrarDocumento(path) {
  if (!path) return
  try { await supabase().storage.from(BUCKET).remove([path]) } catch { /* sin efecto */ }
}

/**
 * Reduce una foto a un cuadrado de `lado` px en JPEG.
 * Una foto de celular de 3–5 MB queda en ~40 KB.
 */
export function comprimirFoto(archivo, lado = 512) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la foto'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no parece una imagen'))
      img.onload = () => {
        const corte = Math.min(img.width, img.height)
        const lienzo = document.createElement('canvas')
        lienzo.width = lienzo.height = lado
        lienzo.getContext('2d').drawImage(
          img, (img.width - corte) / 2, (img.height - corte) / 2, corte, corte, 0, 0, lado, lado
        )
        lienzo.toBlob(blob => {
          if (!blob) return reject(new Error('No se pudo procesar la foto'))
          resolve(new File([blob], 'foto.jpg', { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.85)
      }
      img.src = lector.result
    }
    lector.readAsDataURL(archivo)
  })
}

/** Copia texto al portapapeles (con respaldo para navegadores viejos). */
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = texto
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}
