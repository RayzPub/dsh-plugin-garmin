import { WatchFaceSpec, SimulationState, DEFAULT_SIMULATION_STATE } from './watchface-model.js'
import { snapToClosestMipColor } from './mip-palette.js'

/**
 * Renders a WatchFaceSpec into an accurate 260x260 Garmin Fenix 7 SVG.
 * All coordinates adhere to (130, 130) center on 260x260 viewport.
 */
export function renderWatchFaceToSvg(
  spec: WatchFaceSpec,
  state: SimulationState = DEFAULT_SIMULATION_STATE
): string {
  const width = 260
  const height = 260
  const cx = 130
  const cy = 130
  const r = 130

  const elements: string[] = []

  // 1. Clip path for circular round watch face
  elements.push(`
    <defs>
      <clipPath id="fenix7-round-clip">
        <circle cx="${cx}" cy="${cy}" r="${r}" />
      </clipPath>
      <filter id="mip-subtle-contrast">
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.05"/>
          <feFuncG type="linear" slope="1.05"/>
          <feFuncB type="linear" slope="1.05"/>
        </feComponentTransfer>
      </filter>
    </defs>
  `)

  // 2. Background
  const bgColor = snapToClosestMipColor(spec.backgroundColor).hex
  elements.push(`<g clip-path="url(#fenix7-round-clip)" filter="url(#mip-subtle-contrast)">`)
  elements.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${bgColor}" />`)

  // 3. Dial Ticks & Numbers
  if (spec.dial && spec.dial.showTicks) {
    const tickColor = snapToClosestMipColor(spec.dial.tickColor).hex
    const radius = spec.dial.radius || 120

    // Draw 60 minute / 12 hour ticks
    for (let i = 0; i < 60; i++) {
      const isMajor = i % 5 === 0
      if (!isMajor && !spec.dial.subTicks) continue

      const angleRad = (i * 6 * Math.PI) / 180
      const tickLen = isMajor ? 8 : 4
      const strokeW = isMajor ? 2.5 : 1

      const x1 = cx + (radius - tickLen) * Math.sin(angleRad)
      const y1 = cy - (radius - tickLen) * Math.cos(angleRad)
      const x2 = cx + radius * Math.sin(angleRad)
      const y2 = cy - radius * Math.cos(angleRad)

      elements.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${tickColor}" stroke-width="${strokeW}" stroke-linecap="square" />`)
    }

    if (spec.dial.showNumbers) {
      const numColor = snapToClosestMipColor(spec.dial.numberColor).hex
      const numRadius = radius - 18
      const hours = [12, 3, 6, 9]
      for (const h of hours) {
        const angleRad = (h * 30 * Math.PI) / 180
        const nx = cx + numRadius * Math.sin(angleRad)
        const ny = cy - numRadius * Math.cos(angleRad) + 5 // baseline adjust
        elements.push(`<text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" fill="${numColor}" font-family="'Roboto Condensed', -apple-system, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">${h}</text>`)
      }
    }
  }

  // 4. Complications (Heart rate, Battery, Steps, Date, Calories, etc.)
  for (const comp of spec.complications) {
    const compColor = snapToClosestMipColor(comp.color).hex
    const px = comp.position.x
    const py = comp.position.y

    switch (comp.type) {
      case 'heart_rate': {
        const val = state.heartRate
        if (comp.style === 'arc_progress') {
          // Arc around position
          const startAngle = 135
          const endAngle = 405
          const pct = Math.min(Math.max((val - 40) / 140, 0), 1)
          const currentEnd = startAngle + pct * (endAngle - startAngle)
          elements.push(`<path d="${describeArc(px, py, 24, startAngle, endAngle)}" fill="none" stroke="#555555" stroke-width="4" stroke-linecap="round"/>`)
          elements.push(`<path d="${describeArc(px, py, 24, startAngle, currentEnd)}" fill="none" stroke="${compColor}" stroke-width="4" stroke-linecap="round"/>`)
          elements.push(`<text x="${px}" y="${py + 4}" fill="${compColor}" font-family="'Roboto Condensed', sans-serif" font-size="12" font-weight="bold" text-anchor="middle">${val}</text>`)
          elements.push(`<text x="${px}" y="${py - 10}" fill="#AAAAAA" font-family="'Roboto Condensed', sans-serif" font-size="8" text-anchor="middle">HR</text>`)
        } else {
          elements.push(`<text x="${px}" y="${py}" fill="${compColor}" font-family="'Roboto Condensed', sans-serif" font-size="13" font-weight="bold" text-anchor="middle">❤️ ${val} bpm</text>`)
        }
        break
      }
      case 'battery': {
        const pct = state.batteryPercent
        const batColor = pct <= 20 ? '#FF0000' : compColor
        if (comp.style === 'bar_progress') {
          const w = 36
          const h = 6
          elements.push(`<rect x="${px - w/2}" y="${py}" width="${w}" height="${h}" rx="2" fill="#555555" />`)
          elements.push(`<rect x="${px - w/2}" y="${py}" width="${(w * pct) / 100}" height="${h}" rx="2" fill="${batColor}" />`)
          elements.push(`<text x="${px}" y="${py - 4}" fill="${batColor}" font-family="'Roboto Condensed', sans-serif" font-size="10" font-weight="bold" text-anchor="middle">${pct}%</text>`)
        } else {
          elements.push(`<text x="${px}" y="${py}" fill="${batColor}" font-family="'Roboto Condensed', sans-serif" font-size="12" font-weight="bold" text-anchor="middle">🔋 ${pct}%</text>`)
        }
        break
      }
      case 'steps': {
        const steps = state.steps
        const goal = state.stepGoal || 10000
        const pct = Math.min(steps / goal, 1)
        if (comp.style === 'arc_progress') {
          elements.push(`<path d="${describeArc(px, py, 24, 135, 405)}" fill="none" stroke="#555555" stroke-width="4" stroke-linecap="round"/>`)
          elements.push(`<path d="${describeArc(px, py, 24, 135, 135 + pct * 270)}" fill="none" stroke="${compColor}" stroke-width="4" stroke-linecap="round"/>`)
          elements.push(`<text x="${px}" y="${py + 4}" fill="${compColor}" font-family="'Roboto Condensed', sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${steps}</text>`)
          elements.push(`<text x="${px}" y="${py - 10}" fill="#AAAAAA" font-family="'Roboto Condensed', sans-serif" font-size="8" text-anchor="middle">STEP</text>`)
        } else {
          elements.push(`<text x="${px}" y="${py}" fill="${compColor}" font-family="'Roboto Condensed', sans-serif" font-size="12" font-weight="bold" text-anchor="middle">👣 ${steps}</text>`)
        }
        break
      }
      case 'date': {
        elements.push(`<rect x="${px - 28}" y="${py - 10}" width="56" height="18" rx="3" fill="#222222" stroke="#555555" stroke-width="1" />`)
        elements.push(`<text x="${px}" y="${py + 3}" fill="${compColor}" font-family="'Roboto Condensed', sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${state.dayOfWeek} ${state.dateString}</text>`)
        break
      }
      case 'calories': {
        elements.push(`<text x="${px}" y="${py}" fill="${compColor}" font-family="'Roboto Condensed', sans-serif" font-size="12" font-weight="bold" text-anchor="middle">🔥 ${state.calories} kcal</text>`)
        break
      }
      case 'altitude': {
        elements.push(`<text x="${px}" y="${py}" fill="${compColor}" font-family="'Roboto Condensed', sans-serif" font-size="11" font-weight="bold" text-anchor="middle">⛰️ ${state.altitudeMeters}m</text>`)
        break
      }
    }
  }

  // 5. Digital Clock (if digital or hybrid)
  if ((spec.clockType === 'digital' || spec.clockType === 'hybrid') && spec.digitalClock) {
    const dc = spec.digitalClock
    const dColor = snapToClosestMipColor(dc.color).hex
    const hh = String(state.hours).padStart(2, '0')
    const mm = String(state.minutes).padStart(2, '0')
    const ss = String(state.seconds).padStart(2, '0')

    const timeStr = `${hh}:${mm}`
    const fontSize = dc.font === 'NUMBER_HOT' ? 44 : dc.font === 'NUMBER_MILD' ? 36 : 28

    elements.push(`<text x="${dc.x}" y="${dc.y}" fill="${dColor}" font-family="'Roboto Condensed', 'Helvetica Neue', sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="1" text-anchor="middle">${timeStr}</text>`)

    if (dc.showSeconds && !state.isSleepMode) {
      elements.push(`<text x="${dc.x + 62}" y="${dc.y - 12}" fill="${dColor}" font-family="'Roboto Condensed', sans-serif" font-size="14" font-weight="bold">${ss}</text>`)
    }
  }

  // 6. Analog Hands (if analog or hybrid)
  if ((spec.clockType === 'analog' || spec.clockType === 'hybrid') && spec.analogHands) {
    const hands = spec.analogHands
    const hColor = snapToClosestMipColor(hands.hourColor).hex
    const mColor = snapToClosestMipColor(hands.minuteColor).hex
    const sColor = snapToClosestMipColor(hands.secondColor).hex

    const hAngle = ((state.hours % 12 + state.minutes / 60) * 30 * Math.PI) / 180
    const mAngle = ((state.minutes + state.seconds / 60) * 6 * Math.PI) / 180
    const sAngle = (state.seconds * 6 * Math.PI) / 180

    // Hour Hand
    const hx2 = cx + hands.hourLength * Math.sin(hAngle)
    const hy2 = cy - hands.hourLength * Math.cos(hAngle)
    const hTailX = hands.accentTail ? cx - 12 * Math.sin(hAngle) : cx
    const hTailY = hands.accentTail ? cy + 12 * Math.cos(hAngle) : cy
    elements.push(`<line x1="${hTailX.toFixed(1)}" y1="${hTailY.toFixed(1)}" x2="${hx2.toFixed(1)}" y2="${hy2.toFixed(1)}" stroke="${hColor}" stroke-width="${hands.hourWidth}" stroke-linecap="round"/>`)

    // Minute Hand
    const mx2 = cx + hands.minuteLength * Math.sin(mAngle)
    const my2 = cy - hands.minuteLength * Math.cos(mAngle)
    const mTailX = hands.accentTail ? cx - 16 * Math.sin(mAngle) : cx
    const mTailY = hands.accentTail ? cy + 16 * Math.cos(mAngle) : cy
    elements.push(`<line x1="${mTailX.toFixed(1)}" y1="${mTailY.toFixed(1)}" x2="${mx2.toFixed(1)}" y2="${my2.toFixed(1)}" stroke="${mColor}" stroke-width="${hands.minuteWidth}" stroke-linecap="round"/>`)

    // Second Hand (Only in high-power mode or 1Hz partial update)
    if (!state.isSleepMode) {
      const sx2 = cx + hands.secondLength * Math.sin(sAngle)
      const sy2 = cy - hands.secondLength * Math.cos(sAngle)
      const sTailX = cx - 22 * Math.sin(sAngle)
      const sTailY = cy + 22 * Math.cos(sAngle)
      elements.push(`<line x1="${sTailX.toFixed(1)}" y1="${sTailY.toFixed(1)}" x2="${sx2.toFixed(1)}" y2="${sy2.toFixed(1)}" stroke="${sColor}" stroke-width="${hands.secondWidth}" stroke-linecap="round"/>`)
      elements.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${sColor}" />`)
    } else {
      elements.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${mColor}" />`)
    }
  }

  // Outer Bezel Rim simulation
  elements.push(`</g>`)
  elements.push(`<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="#333333" stroke-width="2"/>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${elements.join('\n')}</svg>`
}

/** Helper to generate SVG Arc command */
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  }
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    'M', start.x.toFixed(1), start.y.toFixed(1),
    'A', radius, radius, 0, largeArcFlag, 0, end.x.toFixed(1), end.y.toFixed(1)
  ].join(' ')
}
