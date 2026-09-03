import { WatchFaceSpec, ClockType, ThemeStyle, ComplicationItem, DialConfig } from './watchface-model.js'
import { snapToClosestMipColor } from './mip-palette.js'

/**
 * 1. Tactical Stealth Template:
 * Dark tactical dial, muted sub-ticks, vivid orange accents, HR arc and battery indicators.
 */
export const TACTICAL_TEMPLATE: WatchFaceSpec = {
  name: 'TacticalStealth',
  theme: 'tactical',
  targetDevice: 'fenix7',
  backgroundColor: '#000000',
  dial: {
    showTicks: true,
    tickColor: '#555555',
    subTicks: true,
    showNumbers: true,
    numberColor: '#FFAA00',
    radius: 120
  },
  clockType: 'hybrid',
  digitalClock: {
    x: 130,
    y: 90,
    font: 'NUMBER_HOT',
    color: '#FFFFFF',
    showSeconds: true,
    showAmPm: false
  },
  analogHands: {
    hourColor: '#FFFFFF',
    minuteColor: '#FFAA00',
    secondColor: '#FF0000',
    hourLength: 50,
    minuteLength: 80,
    secondLength: 95,
    hourWidth: 4,
    minuteWidth: 3,
    secondWidth: 1,
    accentTail: true,
    showHourHand: true,
    showMinuteHand: true,
    showSecondHand: true
  },
  complications: [
    { id: 'hr', type: 'heart_rate', position: { x: 80, y: 150 }, style: 'arc_progress', color: '#FF0000' },
    { id: 'bat', type: 'battery', position: { x: 180, y: 150 }, style: 'bar_progress', color: '#00AAFF' }
  ]
}

/**
 * 2. Sport Performance Template:
 * Digital-focused high-contrast layout, bright mint/cyan time, step progress and heart rate widgets.
 */
export const SPORT_TEMPLATE: WatchFaceSpec = {
  name: 'SportPerformance',
  theme: 'sport',
  targetDevice: 'fenix7',
  backgroundColor: '#000000',
  dial: {
    showTicks: true,
    tickColor: '#00AAFF',
    subTicks: false,
    showNumbers: false,
    numberColor: '#FFFFFF',
    radius: 122
  },
  clockType: 'digital',
  digitalClock: {
    x: 130,
    y: 105,
    font: 'NUMBER_HOT',
    color: '#00FFAA',
    showSeconds: true,
    showAmPm: false
  },
  complications: [
    { id: 'step', type: 'steps', position: { x: 130, y: 55 }, style: 'arc_progress', color: '#00AAFF' },
    { id: 'hr', type: 'heart_rate', position: { x: 80, y: 165 }, style: 'icon_value', color: '#FF00AA' },
    { id: 'bat', type: 'battery', position: { x: 180, y: 165 }, style: 'bar_progress', color: '#FFFF00' }
  ]
}

/**
 * 3. Aviator Classic Template:
 * Classic pilot chronograph dial with prominent 12/3/6/9 numbers, luminous hands, altitude and date.
 */
export const PILOT_TEMPLATE: WatchFaceSpec = {
  name: 'AviatorClassic',
  theme: 'pilot',
  targetDevice: 'fenix7',
  backgroundColor: '#000000',
  dial: {
    showTicks: true,
    tickColor: '#FFFFFF',
    subTicks: true,
    showNumbers: true,
    numberColor: '#FFAA00',
    radius: 120
  },
  clockType: 'analog',
  analogHands: {
    hourColor: '#FFFFFF',
    minuteColor: '#FFFFFF',
    secondColor: '#FFAA00',
    hourLength: 55,
    minuteLength: 85,
    secondLength: 100,
    hourWidth: 5,
    minuteWidth: 3,
    secondWidth: 1,
    accentTail: true,
    showHourHand: true,
    showMinuteHand: true,
    showSecondHand: true
  },
  complications: [
    { id: 'alt', type: 'altitude', position: { x: 130, y: 70 }, style: 'icon_value', color: '#00AAFF' },
    { id: 'date', type: 'date', position: { x: 130, y: 175 }, style: 'badge', color: '#FFFFFF' }
  ]
}

/**
 * 4. Minimal Clean Template:
 * Ultra-minimalist aesthetic, thin elegant hands, subtle dial ticks and discreet battery status.
 */
export const MINIMAL_TEMPLATE: WatchFaceSpec = {
  name: 'MinimalClean',
  theme: 'minimal',
  targetDevice: 'fenix7',
  backgroundColor: '#000000',
  dial: {
    showTicks: true,
    tickColor: '#555555',
    subTicks: false,
    showNumbers: false,
    numberColor: '#AAAAAA',
    radius: 120
  },
  clockType: 'analog',
  analogHands: {
    hourColor: '#FFFFFF',
    minuteColor: '#AAAAAA',
    secondColor: '#FF5500',
    hourLength: 50,
    minuteLength: 80,
    secondLength: 95,
    hourWidth: 3,
    minuteWidth: 2,
    secondWidth: 1,
    accentTail: false,
    showHourHand: true,
    showMinuteHand: true,
    showSecondHand: true
  },
  complications: [
    { id: 'bat', type: 'battery', position: { x: 130, y: 180 }, style: 'bar_progress', color: '#AAAAAA' }
  ]
}

/**
 * 5. Pro Hybrid Template:
 * Combines high-contrast digital time with sweeping analog hands and dual fitness rings.
 */
export const HYBRID_TEMPLATE: WatchFaceSpec = {
  name: 'ProHybrid',
  theme: 'custom',
  targetDevice: 'fenix7',
  backgroundColor: '#000000',
  dial: {
    showTicks: true,
    tickColor: '#555555',
    subTicks: true,
    showNumbers: true,
    numberColor: '#FFFFFF',
    radius: 120
  },
  clockType: 'hybrid',
  digitalClock: {
    x: 130,
    y: 85,
    font: 'NUMBER_MILD',
    color: '#00FFFF',
    showSeconds: false,
    showAmPm: false
  },
  analogHands: {
    hourColor: '#FFFFFF',
    minuteColor: '#00AAFF',
    secondColor: '#FF5500',
    hourLength: 50,
    minuteLength: 80,
    secondLength: 95,
    hourWidth: 4,
    minuteWidth: 3,
    secondWidth: 1,
    accentTail: true,
    showHourHand: true,
    showMinuteHand: true,
    showSecondHand: true
  },
  complications: [
    { id: 'hr', type: 'heart_rate', position: { x: 75, y: 155 }, style: 'arc_progress', color: '#FF0000' },
    { id: 'steps', type: 'steps', position: { x: 185, y: 155 }, style: 'arc_progress', color: '#00FF00' }
  ]
}

export const DEFAULT_WATCHFACE_SPEC = TACTICAL_TEMPLATE

export const WATCHFACE_TEMPLATES: Record<string, WatchFaceSpec> = {
  tactical: TACTICAL_TEMPLATE,
  sport: SPORT_TEMPLATE,
  pilot: PILOT_TEMPLATE,
  minimal: MINIMAL_TEMPLATE,
  hybrid: HYBRID_TEMPLATE
}

export interface TemplateMetadata {
  id: string
  name: string
  theme: ThemeStyle
  clockType: ClockType
  description: string
  spec: WatchFaceSpec
}

export function listWatchFaceTemplates(): TemplateMetadata[] {
  return [
    {
      id: 'tactical',
      name: 'Tactical Stealth',
      theme: 'tactical',
      clockType: 'hybrid',
      description: '战术暗黑风格表盘，橙红高亮指针，心率弧形环与电量进度条，适合全天候户外战术场景。',
      spec: TACTICAL_TEMPLATE
    },
    {
      id: 'sport',
      name: 'Sport Performance',
      theme: 'sport',
      clockType: 'digital',
      description: '运动竞技大字数字表盘，青翠高反差时钟，步数环、心率与电量直观监控。',
      spec: SPORT_TEMPLATE
    },
    {
      id: 'pilot',
      name: 'Aviator Classic',
      theme: 'pilot',
      clockType: 'analog',
      description: '经典飞行员仪表盘风格，大号 12/3/6/9 刻度，配高度计与日历视窗。',
      spec: PILOT_TEMPLATE
    },
    {
      id: 'minimal',
      name: 'Minimal Clean',
      theme: 'minimal',
      clockType: 'analog',
      description: '极简典雅指针表盘，极细指针与轻量刻度，超低功耗与内存消耗。',
      spec: MINIMAL_TEMPLATE
    },
    {
      id: 'hybrid',
      name: 'Pro Hybrid',
      theme: 'custom',
      clockType: 'hybrid',
      description: '数字与指针双显表盘，中等数字时间配双色指针与双重运动弧环。',
      spec: HYBRID_TEMPLATE
    }
  ]
}

export function getWatchFaceTemplate(name?: string): WatchFaceSpec {
  if (!name || typeof name !== 'string') {
    return JSON.parse(JSON.stringify(DEFAULT_WATCHFACE_SPEC))
  }
  const key = name.toLowerCase().trim()
  const found = WATCHFACE_TEMPLATES[key]
  if (found) {
    return JSON.parse(JSON.stringify(found))
  }
  return JSON.parse(JSON.stringify(DEFAULT_WATCHFACE_SPEC))
}

export interface NormalizationResult {
  spec: WatchFaceSpec
  wasNormalized: boolean
  fallbackTemplateUsed: boolean
  normalizationNotes: string[]
  errors: string[]
}

/**
 * Normalizes and validates any partial or potentially malformed WatchFaceSpec.
 * Automatically injects safe defaults from the chosen template so preview NEVER crashes.
 */
export function normalizeWatchFaceSpec(
  inputSpec?: Partial<WatchFaceSpec> | null,
  templateName?: string
): NormalizationResult {
  const notes: string[] = []
  const errors: string[] = []
  let wasNormalized = false
  let fallbackTemplateUsed = false

  // 1. If input is completely missing, return chosen template directly
  if (!inputSpec || typeof inputSpec !== 'object') {
    const chosenTemplate = getWatchFaceTemplate(templateName)
    const tName = templateName && WATCHFACE_TEMPLATES[templateName.toLowerCase()] ? templateName.toLowerCase() : 'tactical'
    return {
      spec: chosenTemplate,
      wasNormalized: true,
      fallbackTemplateUsed: true,
      normalizationNotes: [`未提供表盘规格参数 (spec)，已自动加载内置模板: "${tName}"。`],
      errors: ['参数 spec 为空或非对象类型。']
    }
  }

  // 2. Select base template
  let baseTemplateKey = 'tactical'
  if (templateName && WATCHFACE_TEMPLATES[templateName.toLowerCase()]) {
    baseTemplateKey = templateName.toLowerCase()
  } else if (inputSpec.theme && WATCHFACE_TEMPLATES[inputSpec.theme.toLowerCase()]) {
    baseTemplateKey = inputSpec.theme.toLowerCase()
  } else if (inputSpec.clockType && WATCHFACE_TEMPLATES[inputSpec.clockType.toLowerCase()]) {
    baseTemplateKey = inputSpec.clockType.toLowerCase()
  }

  const base = getWatchFaceTemplate(baseTemplateKey)

  // 3. Name
  let name = base.name
  if (typeof inputSpec.name === 'string' && inputSpec.name.trim().length > 0) {
    name = inputSpec.name.trim()
  } else {
    wasNormalized = true
    notes.push(`未指定表盘名称，默认使用 "${base.name}"。`)
  }

  // 4. Theme
  const validThemes: ThemeStyle[] = ['pilot', 'tactical', 'sport', 'minimal', 'custom']
  let theme = base.theme
  if (inputSpec.theme && validThemes.includes(inputSpec.theme)) {
    theme = inputSpec.theme
  } else if (inputSpec.theme) {
    wasNormalized = true
    notes.push(`未知主题类型 "${inputSpec.theme}"，已自动修正为 "${base.theme}"。`)
  }

  // 5. Background Color
  let backgroundColor = base.backgroundColor
  if (typeof inputSpec.backgroundColor === 'string' && inputSpec.backgroundColor.trim().length > 0) {
    backgroundColor = snapToClosestMipColor(inputSpec.backgroundColor, '#000000').hex
  } else {
    wasNormalized = true
    notes.push('未指定背景颜色 (backgroundColor)，默认使用黑底 "#000000"。')
  }

  // 6. Clock Type
  const validClockTypes: ClockType[] = ['analog', 'digital', 'hybrid']
  let clockType = base.clockType
  if (inputSpec.clockType && validClockTypes.includes(inputSpec.clockType)) {
    clockType = inputSpec.clockType
  } else if (inputSpec.clockType) {
    wasNormalized = true
    notes.push(`未知时钟类型 "${inputSpec.clockType}"，已自动修正为 "${base.clockType}"。`)
  }

  // 7. Dial
  let dial: DialConfig | undefined = undefined
  if (inputSpec.dial) {
    dial = {
      showTicks: inputSpec.dial.showTicks ?? base.dial?.showTicks ?? true,
      tickColor: snapToClosestMipColor(inputSpec.dial.tickColor || base.dial?.tickColor, '#555555').hex,
      subTicks: inputSpec.dial.subTicks ?? base.dial?.subTicks ?? true,
      showNumbers: inputSpec.dial.showNumbers ?? base.dial?.showNumbers ?? true,
      numberColor: snapToClosestMipColor(inputSpec.dial.numberColor || base.dial?.numberColor, '#FFAA00').hex,
      radius: typeof inputSpec.dial.radius === 'number' && !isNaN(inputSpec.dial.radius) ? inputSpec.dial.radius : (base.dial?.radius || 120)
    }
  } else if (inputSpec.dial === undefined && (templateName || !inputSpec.clockType)) {
    dial = base.dial ? JSON.parse(JSON.stringify(base.dial)) : undefined
  }

  // 8. Digital Clock
  let digitalClock = base.digitalClock
  if (clockType === 'digital' || clockType === 'hybrid') {
    const baseDc = base.digitalClock || {
      x: 130,
      y: 105,
      font: 'NUMBER_HOT',
      color: '#FFFFFF',
      showSeconds: true,
      showAmPm: false
    }
    const inputDc = inputSpec.digitalClock
    digitalClock = {
      x: typeof inputDc?.x === 'number' && !isNaN(inputDc.x) ? inputDc.x : baseDc.x,
      y: typeof inputDc?.y === 'number' && !isNaN(inputDc.y) ? inputDc.y : baseDc.y,
      font: (['NUMBER_HOT', 'NUMBER_MILD', 'LARGE', 'MEDIUM'] as const).includes(inputDc?.font as any)
        ? (inputDc?.font as any)
        : baseDc.font,
      color: snapToClosestMipColor(inputDc?.color || baseDc.color, '#FFFFFF').hex,
      showSeconds: inputDc?.showSeconds ?? baseDc.showSeconds ?? true,
      showAmPm: inputDc?.showAmPm ?? baseDc.showAmPm ?? false
    }
  } else {
    digitalClock = undefined
  }

  // 9. Analog Hands
  let analogHands = base.analogHands
  if (clockType === 'analog' || clockType === 'hybrid') {
    const baseHands = base.analogHands || {
      hourColor: '#FFFFFF',
      minuteColor: '#FFAA00',
      secondColor: '#FF0000',
      hourLength: 50,
      minuteLength: 80,
      secondLength: 95,
      hourWidth: 4,
      minuteWidth: 3,
      secondWidth: 1,
      accentTail: true,
      showHourHand: true,
      showMinuteHand: true,
      showSecondHand: true
    }
    const inputHands = inputSpec.analogHands
    analogHands = {
      hourColor: snapToClosestMipColor(inputHands?.hourColor || baseHands.hourColor, '#FFFFFF').hex,
      minuteColor: snapToClosestMipColor(inputHands?.minuteColor || baseHands.minuteColor, '#FFAA00').hex,
      secondColor: snapToClosestMipColor(inputHands?.secondColor || baseHands.secondColor, '#FF0000').hex,
      hourLength: typeof inputHands?.hourLength === 'number' && !isNaN(inputHands.hourLength) ? inputHands.hourLength : baseHands.hourLength,
      minuteLength: typeof inputHands?.minuteLength === 'number' && !isNaN(inputHands.minuteLength) ? inputHands.minuteLength : baseHands.minuteLength,
      secondLength: typeof inputHands?.secondLength === 'number' && !isNaN(inputHands.secondLength) ? inputHands.secondLength : baseHands.secondLength,
      hourWidth: typeof inputHands?.hourWidth === 'number' && !isNaN(inputHands.hourWidth) ? inputHands.hourWidth : baseHands.hourWidth,
      minuteWidth: typeof inputHands?.minuteWidth === 'number' && !isNaN(inputHands.minuteWidth) ? inputHands.minuteWidth : baseHands.minuteWidth,
      secondWidth: typeof inputHands?.secondWidth === 'number' && !isNaN(inputHands.secondWidth) ? inputHands.secondWidth : baseHands.secondWidth,
      accentTail: inputHands?.accentTail ?? baseHands.accentTail ?? true,
      showHourHand: inputHands?.showHourHand ?? baseHands.showHourHand ?? true,
      showMinuteHand: inputHands?.showMinuteHand ?? baseHands.showMinuteHand ?? true,
      showSecondHand: inputHands?.showSecondHand ?? baseHands.showSecondHand ?? true
    }
  } else {
    analogHands = undefined
  }

  // 10. Complications
  let complications: ComplicationItem[] = []
  if (Array.isArray(inputSpec.complications)) {
    complications = inputSpec.complications.map((comp, idx) => {
      const id = typeof comp.id === 'string' && comp.id.trim().length > 0 ? comp.id.trim() : `comp_${idx}`
      const type = (['heart_rate', 'battery', 'steps', 'calories', 'date', 'altitude', 'floors'] as const).includes(comp.type as any)
        ? comp.type
        : 'heart_rate'
      const style = (['arc_progress', 'icon_value', 'bar_progress', 'badge'] as const).includes(comp.style as any)
        ? comp.style
        : 'icon_value'
      const color = snapToClosestMipColor(comp.color, '#FFFFFF').hex
      const px = typeof comp.position?.x === 'number' && !isNaN(comp.position.x) ? comp.position.x : 130
      const py = typeof comp.position?.y === 'number' && !isNaN(comp.position.y) ? comp.position.y : 130
      return {
        id,
        type,
        style,
        color,
        position: { x: px, y: py },
        ...(comp.label ? { label: comp.label } : {}),
        ...(typeof comp.size === 'number' ? { size: comp.size } : {})
      }
    })
  } else if (inputSpec.complications !== undefined) {
    wasNormalized = true
    notes.push('complications 字段必须为数组，已从基准模板载入微件。')
    complications = JSON.parse(JSON.stringify(base.complications))
  } else {
    complications = JSON.parse(JSON.stringify(base.complications))
  }

  const finalSpec: WatchFaceSpec = {
    name,
    theme,
    targetDevice: 'fenix7',
    backgroundColor,
    clockType,
    complications,
    ...(dial !== undefined ? { dial } : {}),
    ...(digitalClock !== undefined ? { digitalClock } : {}),
    ...(analogHands !== undefined ? { analogHands } : {})
  }

  return {
    spec: finalSpec,
    wasNormalized,
    fallbackTemplateUsed,
    normalizationNotes: notes,
    errors
  }
}
