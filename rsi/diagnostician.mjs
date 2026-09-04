/**
 * Analyzes benchmark results, clusters violations, and generates actionable diagnosis.
 */
export function diagnoseReport(evalReport) {
  const violationCounts = new Map()

  for (const c of evalReport.cases) {
    for (const v of c.violations) {
      // Normalize violation prefix by removing specific quoted values
      const key = v.replace(/: "[^"]+"/, '')
      violationCounts.set(key, (violationCounts.get(key) || 0) + 1)
    }
  }

  const sortedIssues = [...violationCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([issue, count]) => ({
      issue,
      occurrences: count,
      impact: `${Math.round((count / evalReport.totalCases) * 100)}% 用例受影响`
    }))

  const actionItems = []
  const seenTitles = new Set()

  function addAction(area, title, fix) {
    const key = `${area}:${title}`
    if (!seenTitles.has(key)) {
      seenTitles.add(key)
      actionItems.push({ area, title, fix })
    }
  }

  for (const { issue } of sortedIssues) {
    if (issue.includes('零分配') || issue.includes('数组字面量') || issue.includes('Lang.format') || issue.includes('new ')) {
      addAction(
        'src/preview/code-generator.ts',
        '消除 onUpdate 中的内存分配 (Zero-Allocation)',
        '将 dialNumbers 数组改为算术循环推导，避免使用 new 及 Lang.format([..]) 临时数组传参'
      )
    } else if (issue.includes('微件保真度') || issue.includes('arc_progress') || issue.includes('bar_progress') || issue.includes('badge')) {
      addAction(
        'src/preview/code-generator.ts',
        '补全 Complication 真实图形渲染 (Visual Fidelity)',
        '在 View.mc 中注入 drawArcRing 辅助方法绘制弧形环，用 fillRectangle 绘制进度条，并生成视窗矩形边框'
      )
    } else if (issue.includes('<iq:languages>')) {
      addAction(
        'src/tools/garmin-scaffold.ts',
        'Manifest 增加默认语言标签',
        '在 scaffoldGarminProject 生成 manifest.xml 时必须包含 <iq:languages><iq:language>eng</iq:language></iq:languages>'
      )
    } else if (issue.includes('SensorHistory') || issue.includes('权限')) {
      addAction(
        'src/tools/garmin-scaffold.ts',
        'Manifest 权限精准控制',
        '依据微件类型按需注入权限：仅当包含 altitude/气压计微件时声明 SensorHistory，其他常规传感器不冗余声明'
      )
    } else if (issue.includes('裸 Hex') || issue.includes('色彩') || issue.includes('MIP')) {
      addAction(
        'src/preview/code-generator.ts',
        'MIP 64 色硬件调色板映射合规',
        '确保 toMonkeyCColor() 完整映射 Toybox.Graphics.COLOR_* 常量或合法 0xRRGGBB，不输出未转换的裸 Hex'
      )
    } else if (issue.includes('指针保真度')) {
      addAction(
        'src/preview/code-generator.ts',
        '模拟表盘指针几何渲染补全',
        '补齐 analogHands 时分秒针 Math.sin/cos 角度运算与 drawLine 绘制逻辑'
      )
    } else if (issue.includes('数字时钟保真度')) {
      addAction(
        'src/preview/code-generator.ts',
        '数字时钟排版渲染补全',
        '补齐 digitalClock 时间格式化与 drawText 居中渲染逻辑'
      )
    } else if (issue.includes('传感器隐患') || issue.includes('heartRate') || issue.includes('steps')) {
      addAction(
        'src/preview/code-generator.ts',
        '强化传感器空值防御 (Null-Safety)',
        '访问 ActivityMonitor 与 SystemStats 时增加 has :field、null 及 INVALID_HR_SAMPLE 完整守卫'
      )
    } else if (issue.includes('功耗隐患') || issue.includes('_isSleep')) {
      addAction(
        'src/preview/code-generator.ts',
        '低功耗休眠模式控制',
        '在 View.mc 中声明 _isSleep 并在 onEnterSleep/onExitSleep 中管理，休眠态停更秒针'
      )
    } else if (issue.includes('矢量预览') || issue.includes('SVG')) {
      addAction(
        'src/preview/dc-emulator.ts',
        '矢量渲染引擎修复',
        '检查 renderWatchFaceToSvg 逻辑，确保输出结构合法、尺寸匹配 260x260 的标准 SVG'
      )
    } else if (issue.includes('工程文件残缺')) {
      addAction(
        'src/tools/garmin-scaffold.ts',
        '补齐脚手架必须文件',
        '检查 scaffoldGarminProject 确保 manifest.xml, monkey.jungle, resources 及 View.mc 正常写入'
      )
    } else {
      // Intelligent fallback for unrecognized violations
      addAction(
        'src/preview/code-generator.ts',
        `通用修复: ${issue.slice(0, 30)}...`,
        `排查该违规项的对应生成代码，核对 Fenix 7 规范要求: ${issue}`
      )
    }
  }

  return {
    topBottlenecks: sortedIssues,
    actionItems
  }
}
