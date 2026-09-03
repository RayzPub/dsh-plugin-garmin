/**
 * @module dsh-plugin-garmin
 * Garmin Watch Face Studio & Generator plugin for DeepSeek Harness (dsh)
 */

import { GARMIN_FENIX7_SYSTEM_PROMPT } from './prompts/fenix7-prompt.js'
import { scaffoldGarminProject } from './tools/garmin-scaffold.js'
import { generateGarminPreview } from './tools/garmin-preview.js'
import { buildGarminProject } from './tools/garmin-build.js'
import { ensureDeveloperKey } from './tools/garmin-key.js'
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

  // 2. Register tools
  if (ctx.tools?.register) {
    // garmin_specs
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

    // garmin_preview
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

    // garmin_scaffold
    ctx.tools.register({
      name: 'garmin_scaffold',
      description: 'Generate a complete, ready-to-compile Garmin Fenix 7 Connect IQ watch face project with dynamic Monkey C code.',
      parameters: {
        projectDir: { type: 'string', required: true, description: 'Target directory for the project' },
        appName: { type: 'string', required: true, description: 'Display name of the watch face' },
        clockType: { type: 'string', description: '"analog" | "digital" | "hybrid"' },
        spec: { type: 'object', description: 'Optional full WatchFaceSpec to generate customized View.mc' }
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
          theme: args.spec?.theme || 'sport',
          spec: args.spec
        })
      }
    })

    // garmin_build
    ctx.tools.register({
      name: 'garmin_build',
      description: 'Compile a Garmin Connect IQ watch face project into an installable binary (.prg) on Linux.',
      parameters: {
        projectDir: { type: 'string', required: true, description: 'Root directory of the Garmin project containing monkey.jungle' },
        device: { type: 'string', description: 'Target device ID (default: "fenix7")' },
        outputPrg: { type: 'string', description: 'Optional explicit output path for .prg' },
        sdkPath: { type: 'string', description: 'Optional custom Connect IQ SDK root path' }
      },
      output: {
        schema: { type: 'object' },
        render: (_args: any, value: any) => [
          {
            type: 'text',
            text: value.success
              ? `Garmin build SUCCEEDED: ${value.prgPath}`
              : `Garmin build FAILED:\n${value.diagnostics?.join('\n') || value.error}`
          }
        ]
      },
      async execute(args: any) {
        return buildGarminProject(args)
      }
    })
  }
}

export * from './preview/mip-palette.js'
export * from './preview/watchface-model.js'
export * from './preview/dc-emulator.js'
export * from './preview/code-generator.js'
export * from './tools/garmin-preview.js'
export * from './tools/garmin-scaffold.js'
export * from './tools/garmin-build.js'
export * from './tools/garmin-key.js'
