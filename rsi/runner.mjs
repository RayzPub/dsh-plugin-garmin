import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { generateGarminPreview } from '../dist/src/tools/garmin-preview.js'
import { scaffoldGarminProject } from '../dist/src/tools/garmin-scaffold.js'
import { analyzeCaseResult } from './analyzer.mjs'

/**
 * Spawns a real dsh headless session and returns stdout, stderr, and exit code.
 */
function execDshSession(prompt, timeoutMs = 300000) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    let stdout = ''
    let stderr = ''
    let isTimedOut = false

    const child = spawn('dsh', ['--profile', 'headless', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    })

    const timer = setTimeout(() => {
      isTimedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 2000)
    }, timeoutMs)

    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })

    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        code: isTimedOut ? 124 : (code ?? 0),
        stdout,
        stderr,
        durationMs: Date.now() - startTime,
        isTimedOut
      })
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        code: 1,
        stdout,
        stderr: err.message,
        durationMs: Date.now() - startTime,
        isTimedOut: false
      })
    })
  })
}

/**
 * Runs the benchmark test suite.
 * Default: Real dsh Outer Loop (End-to-End Agent Invocation).
 * If options.offline is true, falls back to direct in-process generator.
 */
export async function runBenchmark(options = {}) {
  const casesFile = path.resolve('rsi/cases/archetypes.json')
  let casesData = JSON.parse(await fs.readFile(casesFile, 'utf8'))
  const baseOutputDir = path.resolve('rsi/history/runs')

  // Filter single case if specified
  if (options.caseId) {
    casesData = casesData.filter(c => c.id === options.caseId)
    if (casesData.length === 0) {
      throw new Error(`未找到指定的测试用例: "${options.caseId}"`)
    }
  }

  await fs.mkdir(baseOutputDir, { recursive: true })

  const results = []
  const startTime = Date.now()
  const isOffline = Boolean(options.offline)

  for (const c of casesData) {
    const caseDir = path.join(baseOutputDir, c.id)
    await fs.mkdir(caseDir, { recursive: true })

    const previewPath = path.join(caseDir, 'preview.svg')
    const projectDir = path.join(caseDir, 'code')

    // Clean previous output for clean measurement
    try {
      await fs.rm(previewPath, { force: true })
      await fs.rm(projectDir, { recursive: true, force: true })
    } catch {}

    let dshSession = null

    if (!isOffline) {
      // ==========================================
      // 【真实外循环模式】：驱动 real dsh 端到端执行
      // ==========================================
      const prompt = `${c.prompt}

【物理交付物规范】
1. 调用 garmin_preview 渲染 260x260 矢量预览，必须保存至: ${previewPath}
2. 调用 garmin_scaffold 生成完整工程脚手架，必须保存至目录: ${projectDir}
3. 严格遵循 Fenix 7 硬件门禁（onUpdate 零分配、64 色 MIP 调色板、Manifest 语言标签与精准权限）。`

      console.log(`\n🤖 [真实 dsh 外循环] 正在执行用例: ${c.name} (${c.id})...`)
      dshSession = await execDshSession(prompt, options.timeoutMs || 300000)

      if (dshSession.isTimedOut) {
        console.log(`   ⚠️ dsh 会话超时 (${dshSession.durationMs}ms)`)
      } else {
        console.log(`   ⏱️ dsh 执行完成 (耗时: ${(dshSession.durationMs / 1000).toFixed(1)}s, 退出码: ${dshSession.code})`)
      }
    } else {
      // 离线快速回退模式
      generateGarminPreview(c.spec, undefined, previewPath, c.template)
      await scaffoldGarminProject({
        projectDir,
        appName: c.spec.name,
        clockType: c.spec.clockType,
        theme: c.spec.theme,
        spec: c.spec,
        template: c.template
      })
    }

    // 3. 产物与白盒质量分析
    const analysis = await analyzeCaseResult({
      caseDef: c,
      previewPath,
      projectDir
    })

    // 检测真实会话中调用的工具
    const toolCallsDetected = []
    if (dshSession?.stdout) {
      const tools = ['garmin_specs', 'garmin_preview', 'garmin_scaffold', 'garmin_build', 'garmin_env']
      for (const t of tools) {
        if (dshSession.stdout.includes(t)) {
          toolCallsDetected.push(t)
        }
      }
    }

    results.push({
      ...analysis,
      mode: isOffline ? 'inner-offline' : 'outer-dsh',
      durationMs: dshSession ? dshSession.durationMs : 0,
      dshExitCode: dshSession ? dshSession.code : 0,
      toolCallsDetected,
      agentLogSnippet: dshSession?.stdout ? dshSession.stdout.slice(-500) : ''
    })
  }

  const durationMs = Date.now() - startTime
  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const averageScore = Math.round((totalScore / results.length) * 10) / 10
  const passedCount = results.filter(r => r.passed).length

  return {
    timestamp: new Date().toISOString(),
    mode: isOffline ? 'inner-offline' : 'outer-dsh',
    durationMs,
    totalCases: results.length,
    passedCases: passedCount,
    averageScore,
    passRate: `${Math.round((passedCount / results.length) * 100)}%`,
    cases: results
  }
}
