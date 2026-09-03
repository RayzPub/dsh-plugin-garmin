/**
 * @module dsh-plugin-garmin
 * Garmin Watch Face Studio & Generator plugin for DeepSeek Harness (dsh)
 */

import { createRequire } from 'node:module'
import { GARMIN_FENIX7_SYSTEM_PROMPT } from './prompts/fenix7-prompt.js'
import { scaffoldGarminProject } from './tools/garmin-scaffold.js'
import { generateGarminPreview } from './tools/garmin-preview.js'
import { buildGarminProject, ALLOWED_GARMIN_DEVICES } from './tools/garmin-build.js'
import { ensureDeveloperKey } from './tools/garmin-key.js'
import { checkGarminEnvironment, setupGarminEnvironment } from './tools/garmin-env.js'
import { GARMIN_MIP_64_PALETTE } from './preview/mip-palette.js'
import { WatchFaceSpec } from './preview/watchface-model.js'
import { listWatchFaceTemplates } from './preview/templates.js'

const nodeRequire = createRequire(import.meta.url)

let dshDefineTool: any = null
try {
  dshDefineTool = nodeRequire('@deepseek-ai/dsh-tools').defineTool
} catch {}

/** Maximum SVG bytes persisted in tool presentationMeta to avoid bloating session history. */
const MAX_PRESENTATION_SVG_BYTES = 64 * 1024

export const name = 'plugin-garmin'
export const inject = ['tools', 'systemPrompt']

/**
 * Fallback defineTool compiler that converts ParameterSchemaSpec to JSON Schema object
 * when @deepseek-ai/dsh-tools is not installed.
 */
function fallbackDefineTool(options: any): any {
  let parameters = options.parameters
  if (parameters && parameters.type !== 'object') {
    const properties: Record<string, any> = {}
    const required: string[] = []
    for (const [key, prop] of Object.entries(parameters as Record<string, any>)) {
      const { required: isReq, ...rest } = prop
      properties[key] = rest
      if (isReq) {
        required.push(key)
      }
    }
    parameters = {
      type: 'object',
      properties,
      additionalProperties: false,
      ...(required.length > 0 ? { required } : {})
    }
  }

  return {
    name: options.name,
    description: options.description,
    parameters,
    output: options.output,
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
    execute: options.execute
  }
}

/**
 * Helper to define a DeepSeek Harness compliant tool definition.
 * Uses @deepseek-ai/dsh-tools defineTool when available, otherwise compiles using fallback.
 */
export function defineTool(options: any, ctx?: any): any {
  if (typeof ctx?.tools?.defineTool === 'function') {
    return ctx.tools.defineTool(options)
  }
  if (typeof dshDefineTool === 'function') {
    return dshDefineTool(options)
  }
  return fallbackDefineTool(options)
}

export function apply(ctx: any) {
  // 1. Inject System Prompt Section into DeepSeek Harness prompt assembly
  if (typeof ctx.systemPrompt?.section === 'function') {
    ctx.systemPrompt.section({
      name: 'garmin:fenix7-rules',
      order: 2950,
      text: GARMIN_FENIX7_SYSTEM_PROMPT
    })
  } else if (typeof ctx.systemPrompt?.add === 'function') {
    // Fallback for legacy prompt registry
    ctx.systemPrompt.add({
      id: 'garmin-fenix7-rules',
      priority: 80,
      content: GARMIN_FENIX7_SYSTEM_PROMPT
    })
  }

  // 2. Register tools with strict schema compliance
  if (ctx.tools?.register) {
    // garmin_specs
    ctx.tools.register(
      defineTool(
        {
          name: 'garmin_specs',
          description: 'Get hardware specifications, screen constraints, and 64-color MIP palette for Garmin Fenix 7.',
          parameters: {
            device: {
              type: 'string',
              description: 'Target device ID (default: "fenix7")',
              enum: [...ALLOWED_GARMIN_DEVICES]
            }
          },
          output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args: any, value: any) => [{ type: 'text', text: JSON.stringify(value, null, 2) }]
          },
          async execute(_args: any, _exec?: any) {
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
              palette: GARMIN_MIP_64_PALETTE.map(c => ({ name: c.name, hex: c.hex })),
              availableTemplates: listWatchFaceTemplates().map(t => ({
                id: t.id,
                name: t.name,
                theme: t.theme,
                clockType: t.clockType,
                description: t.description
              }))
            }
          }
        },
        ctx
      )
    )

    // garmin_preview
    ctx.tools.register(
      defineTool(
        {
          name: 'garmin_preview',
          description: 'Render and validate a declarative Garmin Fenix 7 watch face specification in 260x260 SVG and check memory/MIP color budget. Supports built-in templates (tactical, sport, pilot, minimal, hybrid).',
          parameters: {
            spec: {
              type: 'object',
              description: 'Declarative WatchFaceSpec object (optional if template is used, or can be partial)',
              additionalProperties: true
            },
            template: {
              type: 'string',
              description: 'Optional built-in template name: "tactical" | "sport" | "pilot" | "minimal" | "hybrid". If provided, loads or merges with this template.',
              enum: ['tactical', 'sport', 'pilot', 'minimal', 'hybrid']
            },
            simulationState: {
              type: 'object',
              description: 'Optional state overrides (hours, minutes, heartRate, steps, battery, isSleepMode)',
              additionalProperties: true
            },
            outputPath: {
              type: 'string',
              description: 'Optional file path to save the rendered SVG directly to disk (e.g. "./preview.svg")'
            }
          },
          output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args: any, value: any) => {
              const lines = []
              if (value.diagnosticInfo?.errors?.length) {
                lines.push(`⚠️ [Garmin Preview 诊断警告]`)
                for (const err of value.diagnosticInfo.errors) {
                  lines.push(`  - ❌ ${err}`)
                }
              }
              if (value.diagnosticInfo?.warnings?.length) {
                for (const warn of value.diagnosticInfo.warnings) {
                  lines.push(`  - 💡 ${warn}`)
                }
              }
              if (value.diagnosticInfo?.autoRepaired) {
                lines.push(`ℹ️ [模板自动兜底] 已自动加载/合并基准模板 "${value.templateUsed || 'tactical'}" 保证预览成功。`)
              }
              lines.push(
                `[Garmin Fenix 7 Preview Generated] 模板: ${value.templateUsed || 'custom'}, 内存预估: ${value.metrics?.estimatedMemoryKb}KB / 128KB, MIP 色彩合规: ${value.metrics?.colorPaletteValid}`
              )
              if (value.outputPath) {
                lines.push(`预览 SVG 已保存至: ${value.outputPath}`)
              }
              if (value.metrics?.recommendedFixes?.length) {
                lines.push(`优化建议: ${value.metrics.recommendedFixes.join('; ')}`)
              }
              return [
                {
                  type: 'text',
                  text: lines.join('\n')
                }
              ]
            },
            presentationMeta: (args: any, value: any) => {
              const svg =
                typeof value?.svg === 'string' && value.svg.length <= MAX_PRESENTATION_SVG_BYTES
                  ? value.svg
                  : undefined
              return {
                svg,
                metrics: value?.metrics,
                spec: value?.normalizedSpec || args?.spec,
                templateUsed: value?.templateUsed,
                outputPath: value?.outputPath,
                diagnosticInfo: value?.diagnosticInfo,
                availableTemplates: ['tactical', 'sport', 'pilot', 'minimal', 'hybrid']
              }
            }
          },
          async execute(
            args: { spec?: WatchFaceSpec; template?: string; simulationState?: any; outputPath?: string },
            _exec?: any
          ) {
            return generateGarminPreview(args?.spec, args?.simulationState, args?.outputPath, args?.template)
          }
        },
        ctx
      )
    )

    // garmin_scaffold
    ctx.tools.register(
      defineTool(
        {
          name: 'garmin_scaffold',
          description: 'Generate a complete, ready-to-compile Garmin Fenix 7 Connect IQ watch face project with dynamic Monkey C code.',
          parameters: {
            projectDir: { type: 'string', required: true, description: 'Target directory for the project' },
            appName: { type: 'string', required: true, description: 'Display name of the watch face' },
            clockType: {
              type: 'string',
              description: '"analog" | "digital" | "hybrid"',
              enum: ['analog', 'digital', 'hybrid']
            },
            template: {
              type: 'string',
              description: 'Optional built-in template name: "tactical" | "sport" | "pilot" | "minimal" | "hybrid"',
              enum: ['tactical', 'sport', 'pilot', 'minimal', 'hybrid']
            },
            spec: {
              type: 'object',
              description: 'Optional full WatchFaceSpec to generate customized View.mc',
              additionalProperties: true
            }
          },
          output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args: any, value: any) => [
              {
                type: 'text',
                text: `Garmin Fenix 7 project created successfully. Files created:\n${value.filesCreated?.map((f: string) => '- ' + f).join('\n')}`
              }
            ]
          },
          async execute(args: any, _exec?: any) {
            return scaffoldGarminProject({
              projectDir: args.projectDir,
              appName: args.appName,
              clockType: args.clockType || 'digital',
              theme: args.spec?.theme || 'sport',
              spec: args.spec,
              template: args.template
            })
          }
        },
        ctx
      )
    )

    // garmin_build
    ctx.tools.register(
      defineTool(
        {
          name: 'garmin_build',
          description: 'Compile a Garmin Connect IQ watch face project into an installable binary (.prg) on Linux.',
          parameters: {
            projectDir: { type: 'string', required: true, description: 'Root directory of the Garmin project containing monkey.jungle' },
            device: {
              type: 'string',
              description: 'Target device ID (default: "fenix7")',
              enum: [...ALLOWED_GARMIN_DEVICES]
            },
            outputPrg: { type: 'string', description: 'Optional explicit output path for .prg' },
            sdkPath: { type: 'string', description: 'Optional custom Connect IQ SDK root path' }
          },
          output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args: any, value: any) => [
              {
                type: 'text',
                text: value.success
                  ? `Garmin build SUCCEEDED: ${value.prgPath}`
                  : `Garmin build FAILED:\n${value.diagnostics?.join('\n') || value.error}`
              }
            ]
          },
          timeoutMs: 120_000,
          async execute(args: any, exec?: any) {
            return buildGarminProject({
              ...args,
              signal: exec?.signal
            })
          }
        },
        ctx
      )
    )

    // garmin_env
    ctx.tools.register(
      defineTool(
        {
          name: 'garmin_env',
          description: 'Check or initialize the Linux Garmin Connect IQ build environment (Java, SDK, Developer Key).',
          parameters: {
            action: {
              type: 'string',
              description: '"check" | "setup"',
              required: true,
              enum: ['check', 'setup']
            },
            sdkPath: { type: 'string', description: 'Optional custom Connect IQ SDK path' }
          },
          output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args: any, value: any) => [
              {
                type: 'text',
                text: value.summary || (value.success ? 'Garmin 环境初始化步骤执行完成' : `初始化失败: ${value.error}`)
              }
            ]
          },
          async execute(args: { action: 'check' | 'setup'; sdkPath?: string }, _exec?: any) {
            if (args.action === 'setup') {
              return setupGarminEnvironment({ customSdkPath: args.sdkPath })
            }
            return checkGarminEnvironment(args.sdkPath)
          }
        },
        ctx
      )
    )
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
export * from './tools/garmin-env.js'
