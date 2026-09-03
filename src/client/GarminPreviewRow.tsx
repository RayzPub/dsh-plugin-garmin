import React, { useState, useMemo } from 'react'

export interface GarminPreviewRowProps {
  callId?: string
  toolName?: string
  block?: any
  cwd?: string
  home?: string
  openFile?: (path: string) => void
  inspect?: () => void
}

/**
 * Renders an inline Garmin Fenix 7 interactive preview card in DSH conversation stream.
 */
export function GarminPreviewRow(props: GarminPreviewRowProps) {
  const { block, toolName } = props
  const [backlight, setBacklight] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const settled = Boolean(block && 'kind' in block)
  const isError = Boolean(block?.isError)

  // Extract metadata and SVG safely from tool presentationMeta
  const meta = useMemo(() => {
    if (!settled) return null
    return block?.meta || null
  }, [settled, block])

  const svg = meta?.svg
  const metrics = meta?.metrics
  const spec = meta?.spec
  const outputPath = meta?.outputPath

  // Running state
  if (!settled) {
    return (
      <div style={styles.runningContainer}>
        <span style={styles.watchIcon}>⌚</span>
        <span style={styles.runningText}>
          正在仿真渲染 Garmin Fenix 7 (260×260 MIP) 矢量表盘...
        </span>
      </div>
    )
  }

  // Error state
  if (isError) {
    const errorObj = block?.error
    const errText =
      (typeof errorObj === 'string' ? errorObj : null) ||
      errorObj?.message ||
      errorObj?.code ||
      '表盘预览生成失败'
    const errorDetails = errorObj?.details || errorObj?.stack || null
    return (
      <div style={styles.errorContainer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontWeight: 600, color: '#f87171', fontSize: 13 }}>
            [Garmin Preview 渲染失败] {errText}
          </span>
        </div>
        {errorDetails && (
          <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 4, fontFamily: 'monospace' }}>
            {typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails)}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#e5e7eb', marginTop: 6, lineHeight: 1.4 }}>
          💡 <strong>快速修复建议：</strong>
          推荐使用内置表盘模板快速生成，例如传入 <code>template: "tactical"</code>、<code>"sport"</code> 或 <code>"pilot"</code>，即可确保参数完整并成功渲染。
        </div>
      </div>
    )
  }

  // Fallback if no SVG in metadata
  if (!svg) {
    const textContent = block?.content?.map((c: any) => c.text).join('\n') || '[Garmin Preview 无视图数据]'
    return (
      <div style={styles.runningContainer}>
        <span style={styles.watchIcon}>⌚</span>
        <span style={styles.runningText}>{textContent}</span>
      </div>
    )
  }

  const memoryKb = metrics?.estimatedMemoryKb ?? 32
  const maxMemoryKb = metrics?.maxMemoryKb ?? 128
  const memoryPct = Math.min(100, Math.round((memoryKb / maxMemoryKb) * 100))
  const isMemorySafe = memoryKb <= 96
  const isColorValid = metrics?.colorPaletteValid !== false

  const handleDownloadSvg = () => {
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${spec?.name || 'garmin-fenix7-preview'}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download SVG failed', err)
    }
  }

  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(svg)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      setCopied(false)
    }
  }

  return (
    <div style={styles.cardContainer}>
      {/* Header Bar */}
      <div style={styles.cardHeader}>
        <div style={styles.headerLeft}>
          <span style={styles.watchIcon}>⌚</span>
          <span style={styles.headerTitle}>
            {spec?.name ? `${spec.name}` : 'Garmin Fenix 7 表盘预览'}
          </span>
          <span style={styles.deviceBadge}>Fenix 7 · 260×260 MIP</span>
          {meta?.templateUsed && (
            <span style={styles.templateBadge}>
              🎨 {meta.templateUsed}
              {meta?.diagnosticInfo?.autoRepaired ? ' (已兜底)' : ''}
            </span>
          )}
        </div>

        <div style={styles.headerRight}>
          <button
            type="button"
            style={{
              ...styles.toolBtn,
              backgroundColor: backlight ? 'rgba(0, 220, 130, 0.2)' : 'transparent',
              borderColor: backlight ? '#00dc82' : 'rgba(255,255,255,0.15)'
            }}
            onClick={() => setBacklight(!backlight)}
            title="模拟夜间绿色夜光/背光点亮效果"
          >
            💡 {backlight ? '背光开启' : '背光关闭'}
          </button>
          <button
            type="button"
            style={styles.toolBtn}
            onClick={handleCopySvg}
            title="复制 SVG 矢量源码"
          >
            📋 {copied ? '已复制' : '复制 SVG'}
          </button>
          <button
            type="button"
            style={styles.toolBtn}
            onClick={handleDownloadSvg}
            title="下载 SVG 矢量文件"
          >
            💾 下载 SVG
          </button>
        </div>
      </div>

      {/* Main Content: Watch dial centered + Metrics panel */}
      <div style={styles.cardBody}>
        {/* Watch Outer Bezel Simulation */}
        <div style={styles.bezelWrapper}>
          <div style={styles.bezelFrame}>
            {/* Top/Bottom/Left/Right Titanium Screws Accent */}
            <div style={{ ...styles.screw, top: 6, left: '50%', transform: 'translateX(-50%)' }} />
            <div style={{ ...styles.screw, bottom: 6, left: '50%', transform: 'translateX(-50%)' }} />
            <div style={{ ...styles.screw, left: 6, top: '50%', transform: 'translateY(-50%)' }} />
            <div style={{ ...styles.screw, right: 6, top: '50%', transform: 'translateY(-50%)' }} />

            {/* Inner Round Screen Container */}
            <div
              style={{
                ...styles.screenContainer,
                filter: backlight ? 'drop-shadow(0 0 12px rgba(0,255,140,0.45)) brightness(1.15)' : 'none'
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>

        {/* Diagnostics & Metrics Bar */}
        <div style={styles.metricsContainer}>
          <div style={styles.metricItem}>
            <div style={styles.metricLabelRow}>
              <span style={styles.metricLabel}>APP 内存预算</span>
              <span style={{ ...styles.metricValue, color: isMemorySafe ? '#4ade80' : '#f87171' }}>
                {memoryKb} KB / {maxMemoryKb} KB ({memoryPct}%)
              </span>
            </div>
            <div style={styles.progressBarTrack}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${memoryPct}%`,
                  backgroundColor: isMemorySafe ? '#22c55e' : '#ef4444'
                }}
              />
            </div>
          </div>

          <div style={styles.chipsRow}>
            <span
              style={{
                ...styles.badge,
                backgroundColor: isColorValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                color: isColorValid ? '#4ade80' : '#facc15',
                borderColor: isColorValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'
              }}
            >
              {isColorValid ? '✅ 64-Color MIP 硬件合规' : '⚠️ 非原生 MIP 色彩已自动吸附'}
            </span>

            {outputPath && (
              <span style={styles.pathBadge} title={outputPath}>
                📁 已落盘: {outputPath.split('/').slice(-2).join('/')}
              </span>
            )}
          </div>

          {((metrics?.recommendedFixes && metrics.recommendedFixes.length > 0) ||
            (meta?.diagnosticInfo?.warnings && meta.diagnosticInfo.warnings.length > 0)) && (
            <div style={styles.fixesContainer}>
              <div
                style={styles.fixesHeader}
                onClick={() => setShowDetails(!showDetails)}
              >
                <span>💡 诊断与规范建议 ({((metrics?.recommendedFixes?.length || 0) + (meta?.diagnosticInfo?.warnings?.length || 0))})</span>
                <span style={{ fontSize: 11 }}>{showDetails ? '收起 ▲' : '展开 ▼'}</span>
              </div>
              {showDetails && (
                <ul style={styles.fixesList}>
                  {meta?.diagnosticInfo?.warnings?.map((w: string, idx: number) => (
                    <li key={`warn-${idx}`} style={{ ...styles.fixItem, color: '#60a5fa' }}>ℹ️ {w}</li>
                  ))}
                  {metrics?.recommendedFixes?.map((fix: string, idx: number) => (
                    <li key={`fix-${idx}`} style={styles.fixItem}>💡 {fix}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  runningContainer: {
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  errorContainer: {
    padding: '12px 16px',
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  templateBadge: {
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 10,
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  },
  runningText: {
    fontSize: 13,
    color: '#a3a3a3'
  },
  errorText: {
    fontSize: 13,
    color: '#f87171'
  },
  cardContainer: {
    margin: '8px 0',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'linear-gradient(180deg, rgba(28, 30, 36, 0.95) 0%, rgba(18, 20, 24, 0.98) 100%)',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  watchIcon: {
    fontSize: 18
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f3f4f6'
  },
  deviceBadge: {
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#9ca3af'
  },
  toolBtn: {
    padding: '4px 9px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 14px 14px',
    gap: 14
  },
  bezelWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6
  },
  bezelFrame: {
    width: 284,
    height: 284,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #3a3e46 0%, #202328 65%, #14161a 100%)',
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.18), inset 0 -2px 6px rgba(0,0,0,0.8)',
    border: '2px solid #4a505b',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  screw: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#737a88',
    boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)'
  },
  screenContainer: {
    width: 260,
    height: 260,
    borderRadius: '50%',
    overflow: 'hidden',
    backgroundColor: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.9)'
  },
  metricsContainer: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  metricLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12
  },
  metricLabel: {
    color: '#9ca3af'
  },
  metricValue: {
    fontWeight: 600
  },
  progressBarTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease'
  },
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center'
  },
  badge: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 6,
    border: '1px solid transparent',
    fontWeight: 500
  },
  pathBadge: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#9ca3af',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  fixesContainer: {
    marginTop: 4,
    borderRadius: 6,
    background: 'rgba(234, 179, 8, 0.06)',
    border: '1px solid rgba(234, 179, 8, 0.2)',
    overflow: 'hidden'
  },
  fixesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    fontSize: 11,
    color: '#facc15',
    cursor: 'pointer',
    userSelect: 'none'
  },
  fixesList: {
    margin: 0,
    padding: '0 12px 8px 24px',
    fontSize: 11,
    color: '#e5e7eb'
  },
  fixItem: {
    marginTop: 3
  }
}
