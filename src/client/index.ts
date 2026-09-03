import { GarminPreviewRow } from './GarminPreviewRow.js'

export const name = 'plugin-garmin-client'
export const inject = ['slots']

/**
 * DeepSeek Harness Client Plugin entrypoint for Garmin Watch Face Studio
 */
export function apply(ctx: any): void {
  if (ctx.slots?.inject && ctx.slots?.register) {
    ctx.slots.inject('tool.call.toolview', () =>
      ctx.slots.register(
        {
          name: 'tool.call.toolview',
          key: 'garmin_preview'
        },
        GarminPreviewRow
      )
    )
  }
}

export { GarminPreviewRow }
