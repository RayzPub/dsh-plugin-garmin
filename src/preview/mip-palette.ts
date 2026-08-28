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

/**
 * Validates whether a given hex color is a native Garmin MIP 64-color palette entry.
 */
export function isExactMipColor(hex: string): boolean {
  const normalized = hex.toUpperCase().replace(/^0X/, '#')
  return GARMIN_MIP_64_PALETTE.some(c => c.hex.toUpperCase() === normalized)
}

/**
 * Snaps any arbitrary hex color to the closest Garmin Fenix 7 MIP hardware color.
 */
export function snapToClosestMipColor(hex: string): MipColor {
  const cleanHex = hex.replace(/^#|^0x/i, '')
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0

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
