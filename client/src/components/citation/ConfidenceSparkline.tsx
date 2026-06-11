/**
 * ConfidenceSparkline — tiny inline SVG sparkline showing confidence score history.
 * Renders a polyline with a dot at the latest value and a colour-coded endpoint.
 */
import type { ConfidenceTrendPoint } from '@/lib/api'

interface Props {
  points: ConfidenceTrendPoint[]
  width?: number
  height?: number
}

export function ConfidenceSparkline({ points, width = 80, height = 28 }: Props) {
  if (!points || points.length < 2) return null

  const scores = points.map((p) => p.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 0.01

  const pad = 3
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const coords = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * innerW
    const y = pad + innerH - ((s - min) / range) * innerH
    return { x, y }
  })

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const last = coords[coords.length - 1]
  const lastScore = scores[scores.length - 1]

  const dotColor =
    lastScore >= 0.75
      ? '#10b981' // emerald
      : lastScore >= 0.5
        ? '#f59e0b' // amber
        : '#ef4444' // red

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`Confidence trend: ${(lastScore * 100).toFixed(0)}%`}
      className="inline-block align-middle"
    >
      {/* Track */}
      <polyline
        points={polyline}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Coloured line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={dotColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Latest dot */}
      <circle cx={last.x} cy={last.y} r={2.5} fill={dotColor} />
    </svg>
  )
}
