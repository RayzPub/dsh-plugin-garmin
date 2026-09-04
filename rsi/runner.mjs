import fs from 'node:fs/promises'
import path from 'node:path'
import { generateGarminPreview } from '../dist/src/tools/garmin-preview.js'
import { scaffoldGarminProject } from '../dist/src/tools/garmin-scaffold.js'
import { analyzeCaseResult } from './analyzer.mjs'

/**
 * Runs the full benchmark test suite against the current plugin implementation.
 */
export async function runBenchmark(options = {}) {
  const casesFile = path.resolve('rsi/cases/archetypes.json')
  const casesData = JSON.parse(await fs.readFile(casesFile, 'utf8'))
  const baseOutputDir = path.resolve('rsi/history/runs')

  await fs.mkdir(baseOutputDir, { recursive: true })

  const results = []
  const startTime = Date.now()

  for (const c of casesData) {
    const caseDir = path.join(baseOutputDir, c.id)
    await fs.mkdir(caseDir, { recursive: true })

    const previewPath = path.join(caseDir, 'preview.svg')
    const projectDir = path.join(caseDir, 'code')

    // 1. Generate Preview
    const previewResult = generateGarminPreview(
      c.spec,
      undefined,
      previewPath,
      c.template
    )

    // 2. Generate Scaffold Project
    const scaffoldResult = await scaffoldGarminProject({
      projectDir,
      appName: c.spec.name,
      clockType: c.spec.clockType,
      theme: c.spec.theme,
      spec: c.spec,
      template: c.template
    })

    // 3. Analyze & Score
    const analysis = await analyzeCaseResult({
      caseDef: c,
      previewPath,
      projectDir
    })

    results.push({
      ...analysis,
      previewSuccess: previewResult.success,
      scaffoldSuccess: scaffoldResult.success,
      metrics: previewResult.metrics
    })
  }

  const durationMs = Date.now() - startTime
  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const averageScore = Math.round((totalScore / results.length) * 10) / 10
  const passedCount = results.filter(r => r.passed).length

  return {
    timestamp: new Date().toISOString(),
    durationMs,
    totalCases: results.length,
    passedCases: passedCount,
    averageScore,
    passRate: `${Math.round((passedCount / results.length) * 100)}%`,
    cases: results
  }
}
