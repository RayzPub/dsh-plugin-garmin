#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { runBenchmark } from './runner.mjs'
import { diagnoseReport } from './diagnostician.mjs'

async function main() {
  const args = process.argv.slice(2)
  const isCompare = args.includes('--compare')
  const baselinePath = isCompare ? args[args.indexOf('--compare') + 1] : null
  const isDiagnose = args.includes('--diagnose')
  const isJson = args.includes('--json')
  const isOffline = args.includes('--offline') || args.includes('--fast')
  const caseIdx = args.indexOf('--case')
  const caseId = caseIdx !== -1 ? args[caseIdx + 1] : null

  if (!isJson) {
    console.log('\n======================================================')
    console.log('🔄  Garmin Watch Face Generator — RSI 自演进评估系统')
    console.log('======================================================\n')
    console.log(`🚀 正在执行 RSI 评测 [模式: ${isOffline ? '离线内循环 (offline)' : '真实 dsh 端到端外循环 (real-agent)'}]...`)
    if (caseId) {
      console.log(`🎯 指定目标单用例: ${caseId}`)
    }
  }

  const report = await runBenchmark({
    caseId,
    offline: isOffline
  })

  // Save report to history
  const filename = `run-${Date.now()}.json`
  const historyDir = path.resolve('rsi/history')
  await fs.mkdir(historyDir, { recursive: true })
  const reportPath = path.join(historyDir, filename)
  const latestPath = path.join(historyDir, 'latest.json')
  const reportJson = JSON.stringify(report, null, 2)
  await fs.writeFile(reportPath, reportJson, 'utf8')
  await fs.writeFile(latestPath, reportJson, 'utf8')

  if (isJson) {
    const diagnosis = diagnoseReport(report)
    console.log(JSON.stringify({
      ...report,
      diagnosis,
      snapshotPath: reportPath,
      latestPath
    }, null, 2))
    return
  }

  console.log(`\n⏱️  评估完成，用时: ${report.durationMs}ms | 评估快照已保存: rsi/history/${filename}\n`)

  // Print Case Results Table
  console.log('┌───────────────────────┬────────┬──────────┬──────────┬──────────┬──────────┐')
  console.log('│ 用例 ID               │ 得分   │ 完整度   │ 硬件门禁 │ 视觉保真 │ 空安全   │')
  console.log('├───────────────────────┼────────┼──────────┼──────────┼──────────┼──────────┤')
  for (const c of report.cases) {
    const id = c.id.padEnd(21)
    const score = `${c.score}/100`.padStart(6)
    const comp = `${c.breakdown.completeness}/25`.padStart(8)
    const hw = `${c.breakdown.hardware}/35`.padStart(8)
    const fid = `${c.breakdown.fidelity}/25`.padStart(8)
    const safe = `${c.breakdown.safety}/15`.padStart(8)
    const passTag = c.passed ? '🟢' : '🔴'
    console.log(`│ ${passTag} ${id} │ ${score} │ ${comp} │ ${hw} │ ${fid} │ ${safe} │`)
  }
  console.log('└───────────────────────┴────────┴──────────┴──────────┴──────────┴──────────┘')

  console.log(`\n📊 总体评分: ${report.averageScore} / 100 | 全绿通过率: ${report.passRate} (${report.passedCases}/${report.totalCases})`)

  // Diagnosis
  const diagnosis = diagnoseReport(report)
  if (diagnosis.topBottlenecks.length > 0) {
    console.log('\n🔍 当前 Top 瓶颈扣分项:')
    diagnosis.topBottlenecks.slice(0, 5).forEach((b, i) => {
      console.log(`  ${i + 1}. [${b.occurrences} 次 / ${b.impact}] ${b.issue}`)
    })

    console.log('\n💡 推荐优化方向 (Action Items):')
    diagnosis.actionItems.forEach((a, i) => {
      console.log(`  ${i + 1}. [${a.area}] ${a.title}`)
      console.log(`     └─ 建议措施: ${a.fix}`)
    })
  } else {
    console.log('\n🎉 所有基准用例 100% 满分通过，无任何扣分项！')
  }

  // Compare if requested
  if (isCompare && baselinePath) {
    try {
      const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'))
      console.log('\n======================== RSI 演进对比 (Delta) ========================')
      const avgDiff = Math.round((report.averageScore - baseline.averageScore) * 10) / 10
      const passDiff = report.passedCases - baseline.passedCases

      console.log(`基线文件: ${baselinePath}`)
      console.log(`基线时间: ${baseline.timestamp} ➔ 当前时间: ${report.timestamp}`)
      console.log(`平均得分: ${baseline.averageScore} ➔ ${report.averageScore} (变化: ${avgDiff >= 0 ? '+' + avgDiff : avgDiff} 分)`)
      console.log(`达标用例: ${baseline.passedCases}/${baseline.totalCases} ➔ ${report.passedCases}/${report.totalCases} (变化: ${passDiff >= 0 ? '+' + passDiff : passDiff})`)

      if (avgDiff < 0 || passDiff < 0) {
        console.log('❌ 演进评估未通过：本次改动导致评分或达标数发生退化 (Exit Code: 1)。')
        console.log('======================================================================')
        process.exitCode = 1
      } else {
        console.log('✅ 演进评估通过：本次改动维持或提升了基准质量 (Exit Code: 0)。')
        console.log('======================================================================')
        process.exitCode = 0
      }
    } catch (err) {
      console.error(`无法读取基线对比文件: ${err.message}`)
      process.exitCode = 1
    }
  }
}

main().catch(err => {
  console.error('RSI Loop 执行异常:', err)
  process.exit(1)
})
