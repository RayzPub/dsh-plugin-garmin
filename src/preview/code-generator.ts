import { WatchFaceSpec, ComplicationItem } from '../preview/watchface-model.js'
import { snapToClosestMipColor } from '../preview/mip-palette.js'
import { normalizeWatchFaceSpec } from '../preview/templates.js'

/**
 * Maps a hex color or named color to a Monkey C Toybox.Graphics constant or hex integer literal
 */
export function toMonkeyCColor(hexOrName?: string | null): string {
  if (!hexOrName || typeof hexOrName !== 'string') {
    return 'Graphics.COLOR_WHITE'
  }
  const snapped = snapToClosestMipColor(hexOrName)
  switch (snapped.name) {
    case 'COLOR_BLACK': return 'Graphics.COLOR_BLACK'
    case 'COLOR_WHITE': return 'Graphics.COLOR_WHITE'
    case 'COLOR_LT_GRAY': return 'Graphics.COLOR_LT_GRAY'
    case 'COLOR_DK_GRAY': return 'Graphics.COLOR_DK_GRAY'
    case 'COLOR_RED': return 'Graphics.COLOR_RED'
    case 'COLOR_DK_RED': return 'Graphics.COLOR_DK_RED'
    case 'COLOR_ORANGE': return 'Graphics.COLOR_ORANGE'
    case 'COLOR_YELLOW': return 'Graphics.COLOR_YELLOW'
    case 'COLOR_GREEN': return 'Graphics.COLOR_GREEN'
    case 'COLOR_DK_GREEN': return 'Graphics.COLOR_DK_GREEN'
    case 'COLOR_BLUE': return 'Graphics.COLOR_BLUE'
    case 'COLOR_DK_BLUE': return 'Graphics.COLOR_DK_BLUE'
    case 'COLOR_PURPLE': return 'Graphics.COLOR_PURPLE'
    case 'COLOR_PINK': return 'Graphics.COLOR_PINK'
    default:
      // Return 0xRRGGBB integer literal compatible with Monkey C
      return `0x${(snapped?.hex || '#FFFFFF').replace('#', '')}`
  }
}

/**
 * Generates production-ready View.mc Monkey C code directly from a declarative WatchFaceSpec
 */
export function generateMonkeyCView(rawSpec: WatchFaceSpec): string {
  const { spec } = normalizeWatchFaceSpec(rawSpec)
  const bgColor = toMonkeyCColor(spec.backgroundColor)
  const drawCodeBlocks: string[] = []

  // 1. Dial ticks and numbers
  if (spec.dial && spec.dial.showTicks) {
    const tickColor = toMonkeyCColor(spec.dial.tickColor)
    const radius = spec.dial.radius || 120
    const subTicks = spec.dial.subTicks

    drawCodeBlocks.push(`
        // --- Dial Ticks ---
        dc.setColor(${tickColor}, Graphics.COLOR_TRANSPARENT);
        for (var i = 0; i < 60; i += ${subTicks ? '1' : '5'}) {
            var isMajor = (i % 5 == 0);
            var angleRad = (i * 6 * Math.PI) / 180.0;
            var tickLen = isMajor ? 8 : 4;
            var r1 = ${radius} - tickLen;
            var r2 = ${radius};
            var x1 = cx + r1 * Math.sin(angleRad);
            var y1 = cy - r1 * Math.cos(angleRad);
            var x2 = cx + r2 * Math.sin(angleRad);
            var y2 = cy - r2 * Math.cos(angleRad);
            dc.setPenWidth(isMajor ? 2 : 1);
            dc.drawLine(x1, y1, x2, y2);
        }`)

    if (spec.dial.showNumbers) {
      const numColor = toMonkeyCColor(spec.dial.numberColor)
      const numRadius = radius - 18
      drawCodeBlocks.push(`
        // --- Dial Numbers (12, 3, 6, 9) ---
        dc.setColor(${numColor}, Graphics.COLOR_TRANSPARENT);
        var hours = [12, 3, 6, 9];
        for (var h = 0; h < hours.size(); h++) {
            var val = hours[h];
            var angle = (val * 30 * Math.PI) / 180.0;
            var nx = cx + ${numRadius} * Math.sin(angle);
            var ny = cy - ${numRadius} * Math.cos(angle);
            dc.drawText(nx, ny, Graphics.FONT_TINY, val.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }`)
    }
  }

  // 2. Digital Clock
  if ((spec.clockType === 'digital' || spec.clockType === 'hybrid') && spec.digitalClock) {
    const dc = spec.digitalClock
    const dColor = toMonkeyCColor(dc.color)
    const font = dc.font === 'NUMBER_HOT' ? 'Graphics.FONT_NUMBER_HOT' :
                 dc.font === 'NUMBER_MILD' ? 'Graphics.FONT_NUMBER_MILD' :
                 dc.font === 'LARGE' ? 'Graphics.FONT_LARGE' : 'Graphics.FONT_MEDIUM'

    drawCodeBlocks.push(`
        // --- Digital Clock ---
        var timeStr = Lang.format("$1$:$2$", [clockTime.hour.format("%02d"), clockTime.min.format("%02d")]);
        dc.setColor(${dColor}, Graphics.COLOR_TRANSPARENT);
        dc.drawText(${dc.x}, ${dc.y}, ${font}, timeStr, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        if (${dc.showSeconds} && !_isSleep) {
            var secStr = clockTime.sec.format("%02d");
            dc.drawText(${dc.x + 60}, ${dc.y - 10}, Graphics.FONT_XTINY, secStr, Graphics.TEXT_JUSTIFY_LEFT);
        }`)
  }

  // 3. Complications (with deduplicated variable names per index)
  for (let i = 0; i < spec.complications.length; i++) {
    drawCodeBlocks.push(generateComplicationCode(spec.complications[i], i))
  }

  // 4. Analog Hands
  if ((spec.clockType === 'analog' || spec.clockType === 'hybrid') && spec.analogHands) {
    const hands = spec.analogHands
    const hColor = toMonkeyCColor(hands.hourColor)
    const mColor = toMonkeyCColor(hands.minuteColor)
    const sColor = toMonkeyCColor(hands.secondColor)
    const showHour = hands.showHourHand !== false
    const showMinute = hands.showMinuteHand !== false
    const showSecond = hands.showSecondHand !== false

    const handsCode: string[] = [
      `        // --- Analog Hands ---`,
      `        var hAngle = ((clockTime.hour % 12 + clockTime.min / 60.0) * 30.0 * Math.PI) / 180.0;`,
      `        var mAngle = ((clockTime.min + clockTime.sec / 60.0) * 6.0 * Math.PI) / 180.0;`
    ]

    if (showHour) {
      handsCode.push(`
        // Hour Hand
        var hx = cx + ${hands.hourLength} * Math.sin(hAngle);
        var hy = cy - ${hands.hourLength} * Math.cos(hAngle);
        dc.setColor(${hColor}, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(${hands.hourWidth});
        dc.drawLine(cx, cy, hx, hy);`)
    }

    if (showMinute) {
      handsCode.push(`
        // Minute Hand
        var mx = cx + ${hands.minuteLength} * Math.sin(mAngle);
        var my = cy - ${hands.minuteLength} * Math.cos(mAngle);
        dc.setColor(${mColor}, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(${hands.minuteWidth});
        dc.drawLine(cx, cy, mx, my);`)
    }

    if (showSecond) {
      handsCode.push(`
        // Second Hand (active only in high power / awake mode)
        if (!_isSleep) {
            var sAngle = (clockTime.sec * 6.0 * Math.PI) / 180.0;
            var sx = cx + ${hands.secondLength} * Math.sin(sAngle);
            var sy = cy - ${hands.secondLength} * Math.cos(sAngle);
            var stx = cx - 18 * Math.sin(sAngle);
            var sty = cy + 18 * Math.cos(sAngle);
            dc.setColor(${sColor}, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(${hands.secondWidth});
            dc.drawLine(stx, sty, sx, sy);
            dc.fillCircle(cx, cy, 3);
        } else {
            dc.setColor(${mColor}, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(cx, cy, 4);
        }`)
    } else if (showHour || showMinute) {
      handsCode.push(`
        // Pin Center
        dc.setColor(${mColor}, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(cx, cy, 4);`)
    }

    drawCodeBlocks.push(handsCode.join('\n'))
  }

  return `import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;
import Toybox.ActivityMonitor;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Math;

class GarminWatchFaceView extends WatchUi.WatchFace {

    private var _isSleep as Boolean = false;
    private var _screenCenter as Number = 130;

    function initialize() {
        WatchFace.initialize();
    }

    function onLayout(dc as Graphics.Dc) as Void {
        _screenCenter = dc.getWidth() / 2;
    }

    function onShow() as Void {
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        // 1. Clear background
        dc.setColor(${bgColor}, ${bgColor});
        dc.clear();

        var cx = _screenCenter;
        var cy = _screenCenter;
        var clockTime = System.getClockTime();
        var sysStats = System.getSystemStats();
        var actInfo = ActivityMonitor.getInfo();
${drawCodeBlocks.join('\n')}
    }

    function onHide() as Void {
    }

    function onExitSleep() as Void {
        _isSleep = false;
        WatchUi.requestUpdate();
    }

    function onEnterSleep() as Void {
        _isSleep = true;
        WatchUi.requestUpdate();
    }
}
`
}

function generateComplicationCode(comp: ComplicationItem, index: number): string {
  const color = toMonkeyCColor(comp.color)
  const px = comp.position.x
  const py = comp.position.y

  switch (comp.type) {
    case 'heart_rate':
      return `
        // Complication: Heart Rate (#${index + 1})
        var hrStr_${index} = "--";
        if (actInfo has :heartRate && actInfo.heartRate != null && actInfo.heartRate != ActivityMonitor.INVALID_HR_SAMPLE) {
            hrStr_${index} = actInfo.heartRate.toString();
        }
        dc.setColor(${color}, Graphics.COLOR_TRANSPARENT);
        dc.drawText(${px}, ${py}, Graphics.FONT_XTINY, "HR " + hrStr_${index}, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);`

    case 'battery':
      return `
        // Complication: Battery (#${index + 1})
        var bat_${index} = (sysStats != null && sysStats.battery != null) ? sysStats.battery.toNumber() : 0;
        var batCol_${index} = (bat_${index} <= 20) ? Graphics.COLOR_RED : ${color};
        dc.setColor(batCol_${index}, Graphics.COLOR_TRANSPARENT);
        dc.drawText(${px}, ${py}, Graphics.FONT_XTINY, bat_${index}.toString() + "%", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);`

    case 'steps':
      return `
        // Complication: Steps (#${index + 1})
        var stepCount_${index} = 0;
        if (actInfo != null && actInfo.steps != null) {
            stepCount_${index} = actInfo.steps;
        }
        dc.setColor(${color}, Graphics.COLOR_TRANSPARENT);
        dc.drawText(${px}, ${py}, Graphics.FONT_XTINY, "STP " + stepCount_${index}.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);`

    case 'date':
      return `
        // Complication: Date (#${index + 1})
        var now_${index} = Time.now();
        var dateInfo_${index} = Gregorian.info(now_${index}, Time.FORMAT_SHORT);
        var dateStr_${index} = Lang.format("$1$/$2$", [dateInfo_${index}.month.format("%02d"), dateInfo_${index}.day.format("%02d")]);
        dc.setColor(${color}, Graphics.COLOR_TRANSPARENT);
        dc.drawText(${px}, ${py}, Graphics.FONT_XTINY, dateStr_${index}, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);`

    case 'calories':
      return `
        // Complication: Calories (#${index + 1})
        var cal_${index} = 0;
        if (actInfo != null && actInfo.calories != null) {
            cal_${index} = actInfo.calories;
        }
        dc.setColor(${color}, Graphics.COLOR_TRANSPARENT);
        dc.drawText(${px}, ${py}, Graphics.FONT_XTINY, "CAL " + cal_${index}.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);`

    default:
      return `
        // Complication: generic (#${index + 1})
        dc.setColor(${color}, Graphics.COLOR_TRANSPARENT);
        dc.drawText(${px}, ${py}, Graphics.FONT_XTINY, "${comp.id}", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);`
  }
}
