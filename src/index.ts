/**
 * @module dsh-plugin-garmin
 * Garmin Watch Face Studio & Generator plugin for DeepSeek Harness
 */

import { GARMIN_FENIX7_SYSTEM_PROMPT } from './prompts/fenix7-prompt.js'
import { scaffoldGarminProject } from './tools/garmin-scaffold.js'
import { generateGarminPreview } from './tools/garmin-preview.js'
import { GARMIN_MIP_64_PALETTE } from './preview/mip-palette.js'
import { WatchFaceSpec } from './preview/watchface-model.js'

export const name = 'plugin-garmin'
export const inject = ['tools', 'systemPrompt']

export function apply(ctx: any) {
  // 1. Inject System Prompt Fragment
  if (ctx.systemPrompt?.add) {
    ctx.systemPrompt.add({
      id: 'garmin-fenix7-rules',
      priority: 80,
      content: GARMIN_FENIX7_SYSTEM_PROMPT
    })
  }

  // 2. Register garmin_specs tool
  if (ctx.tools?.register) {
    ctx.tools.register({
      name: 'garmin_specs',
      description: 'Get hardware specifications, screen constraints, and 64-color MIP palette for Garmin Fenix 7.',
      parameters: {
        device: { type: 'string', description: 'Target device ID, e.g. "fenix7"' }
      },
      output: {
        schema: { type: 'object' },
        render: (_args: any, value: any) => [{ type: 'text', text: JSON.stringify(value, null, 2) }]
      },
      async execute(_args: any) {
        return {
          device: 'fenix7',
          screen: {
            shape: 'round',
            width: 260,
            height: 260,
            center: [130, 130],
            displayType: 'MIP',
            colorDepth: '64-color'
          },
          memory: {
            maxAppMemoryKb: 128,
            recommendedThresholdKb: 96
          },
          palette: GARMIN_MIP_64_PALETTE.map(c => ({ name: c.name, hex: c.hex }))
        }
      }
    })

    // 3. Register garmin_preview tool
    ctx.tools.register({
      name: 'garmin_preview',
      description: 'Render and validate a declarative Garmin Fenix 7 watch face specification in 260x260 SVG and check memory/MIP color budget.',
      parameters: {
        spec: { type: 'object', required: true, description: 'Declarative WatchFaceSpec object' },
        simulationState: { type: 'object', description: 'Optional state overrides (hours, minutes, heartRate, steps, battery, isSleepMode)' }
      },
      output: {
        schema: { type: 'object' },
        render: (_args: any, value: any) => [
          { type: 'text', text: `[Garmin Fenix 7 Preview Generated] Memory: ${value.metrics.estimatedMemoryKb}KB / 128KB, MIP Colors Valid: ${value.metrics.colorPaletteValid}` }
        ]
      },
      async execute(args: { spec: WatchFaceSpec; simulationState?: any }) {
        return generateGarminPreview(args.spec, args.simulationState)
      }
    })

    // 4. Register garmin_scaffold tool
    ctx.tools.register({
      name: 'garmin_scaffold',
      description: 'Generate a complete, ready-to-compile Garmin Fenix 7 Connect IQ watch face project.',
      parameters: {
        projectDir: { type: 'string', required: true, description: 'Target directory for the project' },
        appName: { type: 'string', required: true, description: 'Display name of the watch face' },
        clockType: { type: 'string', description: '"analog" | "digital" | "hybrid"' }
      },
      output: {
        schema: { type: 'object' },
        render: (_args: any, value: any) => [
          { type: 'text', text: `Garmin Fenix 7 project created successfully. Files created:\n${value.filesCreated.map((f: string) => '- ' + f).join('\n')}` }
        ]
      },
      async execute(args: any) {
        return scaffoldGarminProject({
          projectDir: args.projectDir,
          appName: args.appName,
          clockType: args.clockType || 'digital',
          theme: 'sport'
        })
      }
    })
  }
}

export * from './preview/mip-palette.js'
export * from './preview/watchface-model.js'
export * from './preview/dc-emulator.js'
export * from './tools/garmin-preview.js'
export * from './tools/garmin-scaffold.js'
