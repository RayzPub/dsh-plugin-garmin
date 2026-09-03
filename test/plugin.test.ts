import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import { generateGarminPreview } from '../src/tools/garmin-preview.js'
import { scaffoldGarminProject } from '../src/tools/garmin-scaffold.js'
import { ensureDeveloperKey } from '../src/tools/garmin-key.js'
import { buildGarminProject } from '../src/tools/garmin-build.js'
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

  it('3. should generate valid developer_key.der using openssl on Linux', async () => {
    const keyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'garmin-key-test-'))
    const keyInfo = await ensureDeveloperKey(keyDir)

    assert.ok(keyInfo.keyPath.endsWith('developer_key.der'))
    const stats = await fs.stat(keyInfo.keyPath)
    assert.ok(stats.size > 1000)

    await fs.rm(keyDir, { recursive: true, force: true })
  })

  it('4. should gracefully return diagnostic guidance if monkeyc/java is not installed', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'garmin-build-test-'))
    const buildRes = await buildGarminProject({
      projectDir: tmpDir,
      device: 'fenix7'
    })

    // Environment currently has openssl but no monkeyc / java installed
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
})
