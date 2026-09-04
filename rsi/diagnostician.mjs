/**
 * Analyzes benchmark results, clusters violations, and generates actionable diagnosis.
 */
export function diagnoseReport(evalReport) {
  const violationCounts = new Map()

  for (const c of evalReport.cases) {
    for (const v of c.violations) {
      // Normalize violation prefix
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
  for (const { issue } of sortedIssues) {
    if (issue.includes('零分配热路径') || issue.includes('数组字面量')) {
      actionItems.push({
        area: 'src/preview/code-generator.ts',
        title: '消除 onUpdate 中的数组分配',
        fix: '将 dialNumbers 中的 [12,3,6,9] 改为循环算术展开 (val = (h == 0) ? 12 : (h * 3))'
      })
    } else if (issue.includes('微件保真度') || issue.includes('arc_progress') || issue.includes('bar_progress')) {
      actionItems.push({
        area: 'src/preview/code-generator.ts',
        title: '补全 Complication 真实图形渲染 (Visual Fidelity)',
        fix: '在 View.mc 中注入 drawArcRing 辅助函数，使 arc_progress 生成真实线段弧，bar_progress 生成 fillRectangle 进度条'
      })
    } else if (issue.includes('<iq:languages>')) {
      actionItems.push({
        area: 'src/tools/garmin-scaffold.ts',
        title: 'Manifest 增加默认语言标签',
        fix: '在 scaffoldGarminProject 生成 manifest.xml 时加入 <iq:languages><iq:language>eng</iq:language></iq:languages>'
      })
    } else if (issue.includes('SensorHistory')) {
      actionItems.push({
        area: 'src/tools/garmin-scaffold.ts',
        title: 'Manifest 智能权限控制',
        fix: '检测微件列表，若包含 altitude/barometer 自动声明 SensorHistory 权限，其他情况保持空'
      })
    }
  }

  return {
    topBottlenecks: sortedIssues,
    actionItems
  }
}
