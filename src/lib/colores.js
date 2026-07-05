/**
 * colores.js
 * Utilidades de color usadas en varias pantallas.
 */

export const PALETA = [
  '#B22222', '#C17D2A', '#3DAF7D', '#5B8DD9', '#9B59B6',
  '#E67E22', '#1ABC9C', '#E91E8C', '#607D8B', '#795548', '#F5C518', '#2C3E50',
]

export function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function iniciales(nombre) {
  return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
