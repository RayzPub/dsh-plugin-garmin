/**
 * Garmin 64-Color MIP (Memory-in-Pixel) Hardware Palette Definitions
 * Specifically tuned for Garmin Fenix 7 (260x260 MIP Display)
 */

export interface MipColor {
  readonly name: string
  readonly hex: string
  readonly intVal: number
  readonly rgb: [number, number, number]
}

export const GARMIN_MIP_64_PALETTE: readonly MipColor[] = [
  // Primary / Monochrome
  { name: 'COLOR_BLACK', hex: '#000000', intVal: 0x000000, rgb: [0, 0, 0] },
  { name: 'COLOR_WHITE', hex: '#FFFFFF', intVal: 0xFFFFFF, rgb: [255, 255, 255] },
  { name: 'COLOR_LT_GRAY', hex: '#AAAAAA', intVal: 0xAAAAAA, rgb: [170, 170, 170] },
  { name: 'COLOR_DK_GRAY', hex: '#555555', intVal: 0x555555, rgb: [85, 85, 85] },

  // Reds / Oranges
  { name: 'COLOR_RED', hex: '#FF0000', intVal: 0xFF0000, rgb: [255, 0, 0] },
  { name: 'COLOR_DK_RED', hex: '#AA0000', intVal: 0xAA0000, rgb: [170, 0, 0] },
  { name: 'COLOR_ORANGE', hex: '#FF5500', intVal: 0xFF5500, rgb: [255, 85, 0] },
  { name: 'COLOR_DK_ORANGE', hex: '#AA5500', intVal: 0xAA5500, rgb: [170, 85, 0] },
  { name: 'COLOR_YELLOW', hex: '#FFAA00', intVal: 0xFFAA00, rgb: [255, 170, 0] },
  { name: 'COLOR_BRIGHT_YELLOW', hex: '#FFFF00', intVal: 0xFFFF00, rgb: [255, 255, 0] },

  // Greens
  { name: 'COLOR_GREEN', hex: '#00FF00', intVal: 0x00FF00, rgb: [0, 255, 0] },
  { name: 'COLOR_DK_GREEN', hex: '#00AA00', intVal: 0x00AA00, rgb: [0, 170, 0] },
  { name: 'COLOR_MINT', hex: '#00FFAA', intVal: 0x00FFAA, rgb: [0, 255, 170] },
  { name: 'COLOR_OLIVE', hex: '#55AA00', intVal: 0x55AA00, rgb: [85, 170, 0] },

  // Blues / Cyans
  { name: 'COLOR_BLUE', hex: '#00AAFF', intVal: 0x00AAFF, rgb: [0, 170, 255] },
  { name: 'COLOR_DK_BLUE', hex: '#0000FF', intVal: 0x0000FF, rgb: [0, 0, 255] },
  { name: 'COLOR_NAVY', hex: '#0000AA', intVal: 0x0000AA, rgb: [0, 0, 170] },
  { name: 'COLOR_CYAN', hex: '#00FFFF', intVal: 0x00FFFF, rgb: [0, 255, 255] },
  { name: 'COLOR_TEAL', hex: '#00AAAA', intVal: 0x00AAAA, rgb: [0, 170, 170] },

  // Purples / Pinks
  { name: 'COLOR_PURPLE', hex: '#AA00FF', intVal: 0xAA00FF, rgb: [170, 0, 255] },
  { name: 'COLOR_DK_PURPLE', hex: '#5500AA', intVal: 0x5500AA, rgb: [85, 0, 170] },
  { name: 'COLOR_PINK', hex: '#FF00AA', intVal: 0xFF00AA, rgb: [255, 0, 170] },
  { name: 'COLOR_HOT_PINK', hex: '#FF55AA', intVal: 0xFF55AA, rgb: [255, 85, 170] }
]

const COLOR_NAMES_MAP: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  lt_gray: '#AAAAAA',
  light_gray: '#AAAAAA',
  lightgray: '#AAAAAA',
  gray: '#AAAAAA',
  grey: '#AAAAAA',
  dk_gray: '#555555',
  dark_gray: '#555555',
  darkgray: '#555555',
  red: '#FF0000',
  dk_red: '#AA0000',
  dark_red: '#AA0000',
  orange: '#FF5500',
  dk_orange: '#AA5500',
  dark_orange: '#AA5500',
  yellow: '#FFFF00',
  bright_yellow: '#FFFF00',
  green: '#00FF00',
  dk_green: '#00AA00',
  dark_green: '#00AA00',
  mint: '#00FFAA',
  olive: '#55AA00',
  blue: '#00AAFF',
  dk_blue: '#0000FF',
  dark_blue: '#0000FF',
  navy: '#0000AA',
  cyan: '#00FFFF',
  teal: '#00AAAA',
  purple: '#AA00FF',
  dk_purple: '#5500AA',
  dark_purple: '#5500AA',
  pink: '#FF00AA',
  hot_pink: '#FF55AA'
}

/**
 * Validates whether a given hex color is a native Garmin MIP 64-color palette entry.
 */
export function isExactMipColor(hex?: string | null): boolean {
  if (!hex || typeof hex !== 'string' || !hex.trim()) {
    return false
  }
  const raw = hex.trim()
  let normalized = raw.toUpperCase().replace(/^0X/, '#')
  if (!normalized.startsWith('#')) {
    const key = raw.toLowerCase().replace(/^color_/, '')
    if (COLOR_NAMES_MAP[key]) {
      normalized = COLOR_NAMES_MAP[key]
    }
  }
  return GARMIN_MIP_64_PALETTE.some(c => c.hex.toUpperCase() === normalized)
}

/**
 * Snaps any arbitrary hex color to the closest Garmin Fenix 7 MIP hardware color.
 * Guaranteed to never throw TypeError even if passed undefined, null, or invalid strings.
 */
export function snapToClosestMipColor(hex?: string | null, fallback = '#FFFFFF'): MipColor {
  const defaultFallback = GARMIN_MIP_64_PALETTE[1] // COLOR_WHITE

  let input = hex
  if (!input || typeof input !== 'string' || !input.trim()) {
    if (fallback && typeof fallback === 'string' && fallback !== hex) {
      input = fallback
    } else {
      return defaultFallback
    }
  }

  let cleanHex = input.trim().replace(/^#|^0x/i, '')

  // Check named color maps
  const lowerClean = cleanHex.toLowerCase()
  if (COLOR_NAMES_MAP[lowerClean]) {
    cleanHex = COLOR_NAMES_MAP[lowerClean].replace('#', '')
  } else if (lowerClean.startsWith('color_')) {
    const stripped = lowerClean.slice(6)
    if (COLOR_NAMES_MAP[stripped]) {
      cleanHex = COLOR_NAMES_MAP[stripped].replace('#', '')
    }
  } else if (cleanHex.length === 3) {
    // Expand 3-digit hex #abc -> #aabbcc
    cleanHex = cleanHex.split('').map(ch => ch + ch).join('')
  }

  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    // If unparseable, return white or black fallback
    return defaultFallback
  }

  let minDistance = Infinity
  let closest = GARMIN_MIP_64_PALETTE[0]

  for (const c of GARMIN_MIP_64_PALETTE) {
    const dr = r - c.rgb[0]
    const dg = g - c.rgb[1]
    const db = b - c.rgb[2]
    // Euclidean distance in RGB space
    const dist = dr * dr + dg * dg + db * db
    if (dist < minDistance) {
      minDistance = dist
      closest = c
    }
  }

  return closest
}
