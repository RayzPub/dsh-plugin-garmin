import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import { generateGarminPreview } from '../src/tools/garmin-preview.js'
import { scaffoldGarminProject } from '../src/tools/garmin-scaffold.js'
import { ensureDeveloperKey } from '../src/tools/garmin-key.js'
import { buildGarminProject, quoteSh, buildMonkeycCommand, ALLOWED_GARMIN_DEVICES } from '../src/tools/garmin-build.js'
import { apply } from '../src/index.js'
import { WatchFaceSpec } from '../src/preview/watchface-model.js'

describe('dsh-plugin-garmin End-to-End Tests', () => {
  const sampleSpec: WatchFaceSpec = {
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
      accentTail: true
    },
    complications: [
      { id: 'hr', type: 'heart_rate', position: { x: 80, y: 150 }, style: 'arc_progress', color: '#FF0000' },
      { id: 'bat', type: 'battery', position: { x: 180, y: 150 }, style: 'bar_progress', color: '#00AAFF' }
    ]
  }

  it('1. should generate valid SVG preview and pass MIP color budget', () => {
    const preview = generateGarminPreview(sampleSpec)
    assert.ok(preview.svg.includes('<svg'))
    assert.ok(preview.svg.includes('fenix7-round-clip'))
    assert.strictEqual(preview.metrics.colorPaletteValid, true)
    assert.ok(preview.metrics.estimatedMemoryKb < 100)
  })

  it('2. should scaffold full project with dynamic Monkey C View.mc', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'garmin-scaffold-test-'))
    const res = await scaffoldGarminProject({
      projectDir: tmpDir,
      appName: 'TacticalStealth',
      clockType: 'hybrid',
      spec: sampleSpec
    })

    assert.strictEqual(res.success, true)
    assert.ok(res.filesCreated.includes('source/View.mc'))

    const viewMc = await fs.readFile(path.join(tmpDir, 'source', 'View.mc'), 'utf8')
    assert.ok(viewMc.includes('TacticalStealth') || viewMc.includes('GarminWatchFaceView'))
    assert.ok(viewMc.includes('Hour Hand'))
    assert.ok(viewMc.includes('ActivityMonitor'))

    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('3. should generate valid developer_key.der using node:crypto without openssl CLI', async () => {
    const keyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'garmin-key-test-'))
    const keyInfo = await ensureDeveloperKey(keyDir)

    assert.ok(keyInfo.keyPath.endsWith('developer_key.der'))
    const stats = await fs.stat(keyInfo.keyPath)
    // 4096-bit RSA PKCS#8 DER key is > 2000 bytes
    assert.ok(stats.size > 2000)

    // Re-check existing key reuse
    const secondCheck = await ensureDeveloperKey(keyDir)
    assert.strictEqual(secondCheck.isGenerated, false)
    assert.strictEqual(secondCheck.keyPath, keyInfo.keyPath)

    await fs.rm(keyDir, { recursive: true, force: true })
  })

  it('4. should gracefully return diagnostic guidance if monkeyc/java is not installed', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'garmin-build-test-'))
    const buildRes = await buildGarminProject({
      projectDir: tmpDir,
      device: 'fenix7'
    })

    assert.strictEqual(buildRes.success, false)
    assert.ok(buildRes.diagnostics.length > 0)

    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('5. should check Garmin environment status accurately', async () => {
    const { checkGarminEnvironment } = await import('../src/tools/garmin-env.js')
    const status = await checkGarminEnvironment()
    assert.ok(typeof status.ready === 'boolean')
    assert.ok(Array.isArray(status.actionItems))
  })

  it('6. should run setupGarminEnvironment to ensure key and dirs', async () => {
    const { setupGarminEnvironment } = await import('../src/tools/garmin-env.js')
    const res = await setupGarminEnvironment()
    assert.strictEqual(res.success, true)
    assert.ok(res.stepsCompleted.length >= 2)
  })

  it('7. quoteSh should safely escape strings for POSIX sh/bash', () => {
    // Normal string
    assert.strictEqual(quoteSh('hello'), "'hello'")
    // Empty string
    assert.strictEqual(quoteSh(''), "''")
    // Embedded single quote
    assert.strictEqual(quoteSh("foo'bar"), "'foo'\\''bar'")
    // Whitespace
    assert.strictEqual(quoteSh('a b c'), "'a b c'")
    // Subshell and expansion attempts
    assert.strictEqual(quoteSh('$(touch /tmp/pwned)'), "'$(touch /tmp/pwned)'")
    assert.strictEqual(quoteSh('fenix7; rm -rf /'), "'fenix7; rm -rf /'")

    // Test buildMonkeycCommand
    const cmd = buildMonkeycCommand({
      monkeycPath: '/sdk/bin/monkeyc',
      jungleFile: '/project/monkey.jungle',
      outputPrg: '/project/bin/fenix7.prg',
      device: 'fenix7',
      keyPath: '/key/developer_key.der'
    })
    assert.ok(cmd.includes("'/sdk/bin/monkeyc'"))
    assert.ok(cmd.includes("'/project/bin/fenix7.prg'"))
    assert.ok(cmd.includes(" -d 'fenix7'"))
  })

  it('8. should reject command injection attempts in device and outputPrg', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'garmin-inject-test-'))
    const pwnedFile = path.join(os.tmpdir(), 'garmin_test_pwned_' + Date.now())

    try {
      await fs.rm(pwnedFile, { force: true })
    } catch {}

    // Malicious device parameter with shell metacharacters
    const buildRes = await buildGarminProject({
      projectDir: tmpDir,
      device: `fenix7; touch ${pwnedFile}`,
      outputPrg: `${tmpDir}/$(touch ${pwnedFile}).prg`
    })

    assert.strictEqual(buildRes.success, false)
    assert.ok(buildRes.error?.includes('Invalid or untrusted device ID'))

    // Verify /tmp/pwned file was NOT created
    let pwnedExists = false
    try {
      await fs.access(pwnedFile)
      pwnedExists = true
    } catch {}
    assert.strictEqual(pwnedExists, false, 'Command injection must not create canary file')

    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('9. should integrate cleanly with Cordis context and satisfy DeepSeek Harness requirements', () => {
    const registeredSections: Array<{ name: string; order: number; text: string }> = []
    const registeredTools: any[] = []

    const mockCtx = {
      systemPrompt: {
        section(sec: { name: string; order: number; text: string }) {
          registeredSections.push(sec)
          return () => {}
        }
      },
      tools: {
        register(toolDef: any) {
          registeredTools.push(toolDef)
          return () => {}
        },
        schemas() {
          return registeredTools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }))
        }
      }
    }

    const injectedServices = new Set(['tools', 'systemPrompt'])
    const strictCordisCtx = new Proxy(mockCtx, {
      get(target: any, prop: string | symbol) {
        if (typeof prop === 'string' && !injectedServices.has(prop) && !(prop in target)) {
          throw new Error(`cannot get property "${prop}" without inject`)
        }
        return target[prop]
      }
    })

    apply(strictCordisCtx)

    // 1. Check System Prompt Section registration (Defect 1)
    assert.strictEqual(registeredSections.length, 1, 'System prompt section must be registered via ctx.systemPrompt.section')
    const promptSection = registeredSections[0]
    assert.strictEqual(promptSection.name, 'garmin:fenix7-rules')
    assert.strictEqual(promptSection.order, 2950, 'Section order must match GARMIN_RULES (2950)')
    assert.ok(promptSection.text.includes('Fenix 7'), 'Prompt text must contain Fenix 7 hardware constraints')

    // 2. Check 5 tools registered (Defect 2)
    const toolMap = new Map(registeredTools.map(t => [t.name, t]))
    const expectedToolNames = ['garmin_specs', 'garmin_preview', 'garmin_scaffold', 'garmin_build', 'garmin_env']
    for (const name of expectedToolNames) {
      assert.ok(toolMap.has(name), `Tool ${name} must be registered`)
    }

    // 3. Verify all tool output schemas have additionalProperties: true
    for (const [name, tool] of toolMap.entries()) {
      assert.strictEqual(
        tool.output.schema.type,
        'object',
        `Tool ${name} output schema must be type object`
      )
      assert.strictEqual(
        tool.output.schema.additionalProperties,
        true,
        `Tool ${name} output schema must explicitly have additionalProperties: true`
      )
    }

    // 4. Check garmin_preview parameters have additionalProperties: true and presentationMeta
    const previewTool = toolMap.get('garmin_preview')!
    const previewProps = previewTool.parameters.properties
    assert.strictEqual(previewProps.spec.type, 'object')
    assert.strictEqual(previewProps.spec.additionalProperties, true)
    assert.strictEqual(previewProps.simulationState.type, 'object')
    assert.strictEqual(previewProps.simulationState.additionalProperties, true)
    assert.ok(typeof previewTool.output.presentationMeta === 'function')

    // Test presentationMeta bounds SVG size
    const metaSmall = previewTool.output.presentationMeta({}, { svg: '<svg>small</svg>', metrics: { colorPaletteValid: true } })
    assert.strictEqual(metaSmall.svg, '<svg>small</svg>')
    const metaTooBig = previewTool.output.presentationMeta({}, { svg: 'x'.repeat(70000), metrics: {} })
    assert.strictEqual(metaTooBig.svg, undefined)

    // 5. Check garmin_scaffold parameters have additionalProperties: true and clockType enum
    const scaffoldTool = toolMap.get('garmin_scaffold')!
    assert.strictEqual(scaffoldTool.parameters.properties.spec.type, 'object')
    assert.strictEqual(scaffoldTool.parameters.properties.spec.additionalProperties, true)
    assert.deepStrictEqual(scaffoldTool.parameters.properties.clockType.enum, ['analog', 'digital', 'hybrid'])

    // 6. Check garmin_specs and garmin_build device enum
    const specsTool = toolMap.get('garmin_specs')!
    assert.deepStrictEqual(specsTool.parameters.properties.device.enum, [...ALLOWED_GARMIN_DEVICES])

    const buildTool = toolMap.get('garmin_build')!
    assert.deepStrictEqual(buildTool.parameters.properties.device.enum, [...ALLOWED_GARMIN_DEVICES])
    assert.strictEqual(buildTool.timeoutMs, 120_000)

    // 7. Check garmin_env action enum
    const envTool = toolMap.get('garmin_env')!
    assert.deepStrictEqual(envTool.parameters.properties.action.enum, ['check', 'setup'])

    // 8. Check schemas() projection
    const schemas = mockCtx.tools.schemas()
    assert.strictEqual(schemas.length, 5)
  })

  it('10. codebase audit: should have no exec( calls in src/', async () => {
    async function scanDir(dir: string): Promise<string[]> {
      const files: string[] = []
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          files.push(...(await scanDir(fullPath)))
        } else if (entry.name.endsWith('.ts')) {
          files.push(fullPath)
        }
      }
      return files
    }

    const srcDir = path.resolve('src')
    const files = await scanDir(srcDir)
    const violations: string[] = []

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Match exec( or execAsync( but not execFile( or execFileAsync(
        if (/\bexec\s*\(/.test(line) || /\bexecAsync\s*\(/.test(line)) {
          violations.push(`${path.relative(srcDir, file)}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    assert.strictEqual(violations.length, 0, `Forbidden exec() calls found:\n${violations.join('\n')}`)
  })
})
