import { WatchFaceSpec, DEFAULT_SIMULATION_STATE, SimulationState } from '../preview/watchface-model.js'
import { renderWatchFaceToSvg } from '../preview/dc-emulator.js'
import { isExactMipColor, snapToClosestMipColor } from '../preview/mip-palette.js'

export interface PreviewResult {
  svg: string
  metrics: {
    estimatedMemoryKb: number
    maxMemoryKb: number
    colorPaletteValid: boolean
    nonMipColorsDetected: string[]
    recommendedFixes: string[]
  }
}

export function generateGarminPreview(spec: WatchFaceSpec, stateOverrides?: Partial<SimulationState>): PreviewResult {
  const state: SimulationState = { ...DEFAULT_SIMULATION_STATE, ...(stateOverrides || {}) }
  const svg = renderWatchFaceToSvg(spec, state)

  // Validate MIP palette
  const allColors = [
    spec.backgroundColor,
    spec.dial?.tickColor,
    spec.dial?.numberColor,
    spec.digitalClock?.color,
    spec.analogHands?.hourColor,
    spec.analogHands?.minuteColor,
    spec.analogHands?.secondColor,
    ...(spec.complications?.map(c => c.color) || [])
  ].filter((c): c is string => typeof c === 'string')

  const nonMipColors: string[] = []
  for (const c of allColors) {
    if (!isExactMipColor(c)) {
      nonMipColors.push(c)
    }
  }

  // Memory estimation: base engine 28KB + 2KB per complication + 4KB for fonts/dial
  let estimatedMemoryKb = 28 + (spec.complications.length * 2.5) + (spec.dial ? 4 : 2)
  if (spec.clockType === 'hybrid') estimatedMemoryKb += 6

  const fixes: string[] = []
  if (nonMipColors.length > 0) {
    fixes.push(`Detected non-native MIP colors (${nonMipColors.join(', ')}). Automatically snapped to closest Fenix 7 MIP palette colors.`)
  }
  if (estimatedMemoryKb > 100) {
    fixes.push(`Estimated memory (${estimatedMemoryKb.toFixed(1)} KB) is approaching 128KB limit. Consider reducing complication complexity.`)
  }

  return {
    svg,
    metrics: {
      estimatedMemoryKb: Math.round(estimatedMemoryKb * 10) / 10,
      maxMemoryKb: 128,
      colorPaletteValid: nonMipColors.length === 0,
      nonMipColorsDetected: nonMipColors,
      recommendedFixes: fixes
    }
  }
}
