import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Evaluates a single watch face project against Garmin Fenix 7 hardware & visual rules.
 * Returns a 0-100 score, breakdown, and specific violation list.
 */
export async function analyzeCaseResult(options) {
  const { caseDef, previewPath, projectDir } = options
  const violations = []
  const successes = []

  let scoreCompleteness = 0   // Max 25
  let scoreHardware = 0       // Max 35
  let scoreFidelity = 0       // Max 25
  let scoreSafety = 0         // Max 15

  // ----------------------------------------------------
  // 1. Toolchain & Artifact Completeness (Max 25)
  // ----------------------------------------------------
  let svgContent = ''
  try {
    svgContent = await fs.readFile(previewPath, 'utf8')
    if (svgContent.includes('<svg') && svgContent.includes('</svg>') && svgContent.length >= 500) {
      scoreCompleteness += 10
      successes.push('矢量预览 SVG 结构合法且大小合理')
    } else {
      violations.push('矢量预览 SVG 内容过短或非合法 SVG 格式')
    }
  } catch (err) {
    violations.push(`缺失矢量预览文件: ${previewPath}`)
  }

  let manifestContent = ''
  let viewMcContent = ''
  let monkeyJungleContent = ''
  let iconExists = false

  try {
    manifestContent = await fs.readFile(path.join(projectDir, 'manifest.xml'), 'utf8')
    monkeyJungleContent = await fs.readFile(path.join(projectDir, 'monkey.jungle'), 'utf8')
    viewMcContent = await fs.readFile(path.join(projectDir, 'source', 'View.mc'), 'utf8')
    await fs.readFile(path.join(projectDir, 'resources', 'drawables', 'launcher_icon.png'))
    iconExists = true
    scoreCompleteness += 15
    successes.push('工程骨架完整 (manifest, monkey.jungle, View.mc, launcher_icon.png)')
  } catch (err) {
    violations.push(`工程文件残缺: ${err.message}`)
  }

  // ----------------------------------------------------
  // 2. Hardware & Manifest Rules (Max 35)
  // ----------------------------------------------------
  if (manifestContent) {
    // 2.1 Manifest XSD Languages
    if (/<iq:languages>\s*<iq:language>eng<\/iq:language>\s*<\/iq:languages>/.test(manifestContent)) {
      scoreHardware += 5
      successes.push('Manifest 包含标准 <iq:languages> 文本定义')
    } else {
      violations.push('Manifest 缺少 <iq:languages><iq:language>eng</iq:language></iq:languages>')
    }

    // 2.2 Permissions Minimalist check
    const requiresSensorHistory = Boolean(caseDef.expected?.requiresSensorHistory)
    const hasSensorHistory = manifestContent.includes('SensorHistory')
    if (requiresSensorHistory) {
      if (hasSensorHistory) {
        scoreHardware += 5
        successes.push('正确声明了高度计必需的 SensorHistory 权限')
      } else {
        violations.push('使用了气压高度计微件，但 manifest.xml 未声明 SensorHistory 权限')
      }
    } else {
      if (!hasSensorHistory) {
        scoreHardware += 5
        successes.push('遵循最小权限原则，未误声明显式 SensorHistory 权限')
      } else {
        violations.push('冗余声明了 SensorHistory 权限（步数/心率在 CIQ 4+ 无需权限）')
      }
    }
  }

  if (viewMcContent) {
    // 2.3 Zero Allocation in onUpdate()
    // Extract onUpdate method body
    const onUpdateMatch = viewMcContent.match(/function\s+onUpdate\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\s*\}\s*\n/m)
    const onUpdateBody = onUpdateMatch ? onUpdateMatch[1] : viewMcContent

    let zeroAllocViolations = 0

    // Check for array literal allocation [a, b, c]
    // Filter out comments first
    const cleanBody = onUpdateBody.replace(/\/\/[^\n]*/g, '')
    const arrayLiteralMatch = cleanBody.match(/var\s+\w+\s*=\s*\[[^\]]+\]/)
    if (arrayLiteralMatch) {
      zeroAllocViolations++
      violations.push(`onUpdate() 内存在数组字面量分配: "${arrayLiteralMatch[0]}"，违反零分配热路径门禁`)
    }

    // Check for "new " inside onUpdate
    const newAllocMatch = cleanBody.match(/new\s+[A-Z]\w+/)
    if (newAllocMatch) {
      zeroAllocViolations++
      violations.push(`onUpdate() 内存在 new 堆对象分配: "${newAllocMatch[0]}"`)
    }

    // Check for Lang.format array overload in onUpdate
    if (cleanBody.includes('Lang.format') && cleanBody.includes('[')) {
      zeroAllocViolations++
      violations.push('onUpdate() 内使用了 Lang.format([..]) 临时数组传参')
    }

    if (zeroAllocViolations === 0) {
      scoreHardware += 15
      successes.push('零分配热路径通过：onUpdate() 内无 new、无数组字面量')
    } else {
      scoreHardware += Math.max(0, 15 - zeroAllocViolations * 8)
    }

    // 2.4 MIP 64 Color compliance
    // Must use Graphics.COLOR_* or 0xRRGGBB, not invalid arbitrary names
    const colorCallMatches = viewMcContent.match(/setColor\([^,]+,\s*[^)]+\)/g) || []
    let invalidColors = 0
    for (const call of colorCallMatches) {
      if (call.includes('#')) {
        invalidColors++
        violations.push(`View.mc 中包含未转换的裸 Hex 颜色字符串: "${call}"`)
      }
    }
    if (invalidColors === 0) {
      scoreHardware += 10
      successes.push('色彩合规：100% 映射为 Toybox.Graphics.COLOR_* 或规范 0x 十六进制')
    }
  }

  // ----------------------------------------------------
  // 3. Visual Fidelity (Preview vs Code Alignment) (Max 25)
  // ----------------------------------------------------
  if (viewMcContent) {
    const exp = caseDef.expected || {}
    let fidelityScore = 0

    // 3.1 Clock Type Visual Fidelity (10 points)
    if (exp.mustHaveHands) {
      const hasHandsDrawing = viewMcContent.includes('hAngle') && viewMcContent.includes('mAngle') && viewMcContent.includes('drawLine')
      if (hasHandsDrawing) {
        fidelityScore += (exp.mustHaveDigital ? 5 : 10)
        successes.push('表盘指针保真度：正确生成了时分针 (hAngle/mAngle/drawLine) 动态旋转绘制逻辑')
      } else {
        violations.push('指针保真度缺失：Spec 要求模拟指针，但 View.mc 缺少指针三角函数或画线逻辑')
      }
    }

    if (exp.mustHaveDigital) {
      const hasDigitalDrawing = viewMcContent.includes('timeStr') || (viewMcContent.includes('clockTime.hour') && viewMcContent.includes('drawText'))
      if (hasDigitalDrawing) {
        fidelityScore += (exp.mustHaveHands ? 5 : 10)
        successes.push('数字时钟保真度：正确生成了数字时钟排版与渲染逻辑')
      } else {
        violations.push('数字时钟保真度缺失：Spec 要求数字时钟，但 View.mc 缺少格式化渲染')
      }
    }

    // 3.2 Complications Visual Fidelity (15 points)
    let compPointsAvailable = 15
    const compChecks = []
    if (exp.mustHaveArcProgress) compChecks.push('arc')
    if (exp.mustHaveBarProgress) compChecks.push('bar')
    if (exp.mustHaveBadge) compChecks.push('badge')

    if (compChecks.length > 0) {
      const perCheck = Math.floor(compPointsAvailable / compChecks.length)
      for (const chk of compChecks) {
        if (chk === 'arc') {
          const hasArcRing = viewMcContent.includes('drawArcRing') ||
                             (viewMcContent.includes('Math.sin') && viewMcContent.includes('drawLine') && viewMcContent.includes('setPenWidth'))
          if (hasArcRing) {
            fidelityScore += perCheck
            successes.push('微件保真度：正确生成了动态弧形环 (drawArcRing) 绘制逻辑')
          } else {
            violations.push('微件保真度缺失：Spec 要求弧形环 (arc_progress)，但 View.mc 缺少几何弧逻辑')
          }
        } else if (chk === 'bar') {
          const hasBarRect = viewMcContent.includes('fillRectangle')
          if (hasBarRect) {
            fidelityScore += perCheck
            successes.push('微件保真度：正确生成了进度条 (fillRectangle) 比例填充逻辑')
          } else {
            violations.push('微件保真度缺失：Spec 要求电量条 (bar_progress)，但 View.mc 缺少 fillRectangle 几何条绘制')
          }
        } else if (chk === 'badge') {
          const hasBadge = viewMcContent.includes('fillRectangle') || viewMcContent.includes('drawRectangle')
          if (hasBadge) {
            fidelityScore += (compPointsAvailable - perCheck * (compChecks.length - 1))
            successes.push('微件保真度：正确生成了视窗边框 (badge) 绘制逻辑')
          } else {
            violations.push('微件保真度缺失：Spec 要求视窗 (badge)，但 View.mc 缺少矩形视窗边框')
          }
        }
      }
    } else {
      fidelityScore += 15
    }

    scoreFidelity = Math.min(25, fidelityScore)
  }

  // ----------------------------------------------------
  // 4. Sensor & Safety Defense (Max 15)
  // ----------------------------------------------------
  if (viewMcContent) {
    let safetyPoints = 0
    // Heart rate safety check
    if (viewMcContent.includes('heartRate')) {
      if (viewMcContent.includes('INVALID_HR_SAMPLE') || viewMcContent.includes('!= null')) {
        safetyPoints += 5
        successes.push('传感器安全：包含 heartRate null / INVALID_HR_SAMPLE 校验')
      } else {
        violations.push('传感器隐患：直接访问 heartRate 缺少 null 或 INVALID_HR_SAMPLE 校验')
      }
    } else {
      safetyPoints += 5
    }

    // Steps safety check
    if (viewMcContent.includes('steps')) {
      if (viewMcContent.includes('actInfo != null') || viewMcContent.includes('steps != null')) {
        safetyPoints += 5
        successes.push('传感器安全：包含 steps null 安全校验')
      } else {
        violations.push('传感器隐患：直接访问 steps 缺少 null 校验')
      }
    } else {
      safetyPoints += 5
    }

    // Sleep mode awareness for analog hands
    if (caseDef.expected?.mustHaveHands) {
      if (viewMcContent.includes('_isSleep')) {
        safetyPoints += 5
        successes.push('功耗控制：包含 _isSleep 睡眠模式秒针/重绘管理')
      } else {
        violations.push('功耗隐患：模拟指针表盘缺少 _isSleep 低功耗模式秒针停更逻辑')
      }
    } else {
      safetyPoints += 5
    }

    scoreSafety = Math.min(15, safetyPoints)
  }

  const totalScore = Math.min(100, scoreCompleteness + scoreHardware + scoreFidelity + scoreSafety)

  return {
    id: caseDef.id,
    name: caseDef.name,
    score: totalScore,
    passed: totalScore >= 85 && violations.length === 0,
    breakdown: {
      completeness: scoreCompleteness,
      hardware: scoreHardware,
      fidelity: scoreFidelity,
      safety: scoreSafety
    },
    violations,
    successes
  }
}
