import * as fs from 'node:fs'
import * as path from 'node:path'
import { WatchFaceSpec, DEFAULT_SIMULATION_STATE, SimulationState } from '../preview/watchface-model.js'
import { renderWatchFaceToSvg } from '../preview/dc-emulator.js'
import { isExactMipColor } from '../preview/mip-palette.js'
import { normalizeWatchFaceSpec, getWatchFaceTemplate } from '../preview/templates.js'

export interface PreviewResult {
  success: boolean
  svg: string
  outputPath?: string
  templateUsed?: string
  normalizedSpec: WatchFaceSpec
  metrics: {
    estimatedMemoryKb: number
    maxMemoryKb: number
    colorPaletteValid: boolean
    nonMipColorsDetected: string[]
    recommendedFixes: string[]
  }
  diagnosticInfo: {
    warnings: string[]
    errors: string[]
    autoRepaired: boolean
  }
}

export function generateGarminPreview(
  spec?: Partial<WatchFaceSpec> | null,
  stateOverrides?: Partial<SimulationState>,
  outputPath?: string,
  templateName?: string
): PreviewResult {
  // 1. Normalize and repair spec using template system (guaranteed safe)
  const {
    spec: normalizedSpec,
    wasNormalized,
    fallbackTemplateUsed,
    normalizationNotes,
    errors
  } = normalizeWatchFaceSpec(spec, templateName)

  const state: SimulationState = { ...DEFAULT_SIMULATION_STATE, ...(stateOverrides || {}) }

  // 2. Render SVG (wrapped in try-catch fallback)
  let svg = ''
  try {
    svg = renderWatchFaceToSvg(normalizedSpec, state)
  } catch (renderErr: any) {
    const errMsg = renderErr?.message || String(renderErr)
    errors.push(`矢量渲染引擎发生异常: ${errMsg}。已自动切换至安全基准模板渲染。`)
    const fallbackTemplate = getWatchFaceTemplate('tactical')
    svg = renderWatchFaceToSvg(fallbackTemplate, state)
  }

  // 3. Write to outputPath if requested
  if (outputPath) {
    try {
      const resolvedPath = path.resolve(outputPath)
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
      fs.writeFileSync(resolvedPath, svg, 'utf8')
    } catch (fsErr: any) {
      errors.push(`预览 SVG 保存至磁盘失败 (${outputPath}): ${fsErr?.message || String(fsErr)}`)
    }
  }

  // 4. Validate MIP palette
  const allColors = [
    normalizedSpec.backgroundColor,
    normalizedSpec.dial?.tickColor,
    normalizedSpec.dial?.numberColor,
    normalizedSpec.digitalClock?.color,
    normalizedSpec.analogHands?.hourColor,
    normalizedSpec.analogHands?.minuteColor,
    normalizedSpec.analogHands?.secondColor,
    ...(normalizedSpec.complications?.map(c => c.color) || [])
  ].filter((c): c is string => typeof c === 'string' && c.trim().length > 0)

  const nonMipColors: string[] = []
  for (const c of allColors) {
    if (!isExactMipColor(c)) {
      nonMipColors.push(c)
    }
  }

  // 5. Memory estimation: base engine 28KB + 2.5KB per complication + 4KB for fonts/dial
  const complicationCount = Array.isArray(normalizedSpec.complications) ? normalizedSpec.complications.length : 0
  let estimatedMemoryKb = 28 + (complicationCount * 2.5) + (normalizedSpec.dial ? 4 : 2)
  if (normalizedSpec.clockType === 'hybrid') estimatedMemoryKb += 6

  const fixes: string[] = []
  if (nonMipColors.length > 0) {
    fixes.push(`检测到非原生 MIP 色彩 (${nonMipColors.join(', ')})，已自动吸附至 Garmin 64 色硬件调色板。`)
  }
  if (estimatedMemoryKb > 100) {
    fixes.push(`预估内存消耗 (${estimatedMemoryKb.toFixed(1)} KB) 接近 128KB 硬件上限，建议精简微件数量。`)
  }

  const resolvedTemplate = templateName || (fallbackTemplateUsed ? 'tactical' : (normalizedSpec.theme || 'custom'))

  return {
    success: errors.length === 0,
    svg,
    outputPath: outputPath ? path.resolve(outputPath) : undefined,
    templateUsed: resolvedTemplate,
    normalizedSpec,
    metrics: {
      estimatedMemoryKb: Math.round(estimatedMemoryKb * 10) / 10,
      maxMemoryKb: 128,
      colorPaletteValid: nonMipColors.length === 0,
      nonMipColorsDetected: nonMipColors,
      recommendedFixes: fixes
    },
    diagnosticInfo: {
      warnings: normalizationNotes,
      errors,
      autoRepaired: wasNormalized || fallbackTemplateUsed
    }
  }
}
