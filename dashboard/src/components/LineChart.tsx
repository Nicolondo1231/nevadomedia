import { useId, useMemo, useState } from 'react'

export interface Series {
  id: string
  label: string
  color: string
  points: { x: string; y: number | null }[]
}

/**
 * Multi-series line chart, hand-built so the mark specs hold exactly: 2px
 * lines with round joins, >=8px end markers carrying a 2px surface ring, a
 * hairline recessive grid, and a crosshair that snaps to the nearest x so the
 * reader aims at a date rather than at a 2px line.
 *
 * One tooltip lists every series at that x, so the pointer never has to land
 * on a specific line to read a value.
 */
export function LineChart({
  series, height = 260, yFormat = (v: number) => String(v), yLabel,
}: {
  series: Series[]
  height?: number
  yFormat?: (v: number) => string
  yLabel?: string
}) {
  const clipId = useId()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const pad = { top: 16, right: 16, bottom: 28, left: 52 }
  const width = 760
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  // Every series shares the x domain so the crosshair indexes cleanly.
  const xs = useMemo(() => {
    const all = new Set<string>()
    series.forEach((s) => s.points.forEach((p) => all.add(p.x)))
    return [...all].sort()
  }, [series])

  const { yMax, ticks } = useMemo(() => {
    const values = series.flatMap((s) =>
      s.points.map((p) => p.y).filter((v): v is number => v != null),
    )
    const raw = values.length ? Math.max(...values) : 10
    // Round the axis up to a clean number so ticks read 0 / 25 / 50, not 0 / 23.7.
    const step = Math.pow(10, Math.floor(Math.log10(raw || 1)))
    const nice = Math.ceil(raw / step) * step || 10
    const count = 4
    return {
      yMax: nice,
      ticks: Array.from({ length: count + 1 }, (_, i) => (nice / count) * i),
    }
  }, [series])

  const xAt = (i: number) => (xs.length <= 1 ? plotW / 2 : (plotW * i) / (xs.length - 1))
  const yAt = (v: number) => plotH - (plotH * v) / (yMax || 1)

  function path(s: Series): string {
    let d = ''
    let open = false
    xs.forEach((x, i) => {
      const point = s.points.find((p) => p.x === x)
      if (!point || point.y == null) {
        open = false // a gap is a gap; do not draw through missing days
        return
      }
      d += `${open ? 'L' : 'M'}${xAt(i)},${yAt(point.y)}`
      open = true
    })
    return d
  }

  const valuesAt = (i: number) =>
    series
      .map((s) => ({ s, y: s.points.find((p) => p.x === xs[i])?.y ?? null }))
      .filter((r) => r.y != null)

  if (xs.length === 0) {
    return <p className="text-dim text-sm py-8 text-center">No data in this range.</p>
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${yLabel ?? 'Value'} over time, ${series.length} series`}
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const rel = ((e.clientX - rect.left) / rect.width) * width - pad.left
          const i = Math.round((rel / plotW) * (xs.length - 1))
          setHoverIndex(Math.max(0, Math.min(xs.length - 1, i)))
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={-8} width={plotW} height={plotH + 8} />
          </clipPath>
        </defs>

        <g transform={`translate(${pad.left},${pad.top})`}>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={0} x2={plotW} y1={yAt(t)} y2={yAt(t)}
                stroke="var(--color-border)" strokeWidth="1"
              />
              <text
                x={-10} y={yAt(t)} dy="0.32em" textAnchor="end"
                className="fill-[var(--color-dim)]" style={{ fontSize: 11 }}
              >
                {yFormat(t)}
              </text>
            </g>
          ))}

          {xs.map((x, i) =>
            i % Math.ceil(xs.length / 7) === 0 ? (
              <text
                key={x} x={xAt(i)} y={plotH + 18} textAnchor="middle"
                className="fill-[var(--color-dim)]" style={{ fontSize: 11 }}
              >
                {new Date(x + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'numeric', day: 'numeric',
                })}
              </text>
            ) : null,
          )}

          {hoverIndex != null && (
            <line
              x1={xAt(hoverIndex)} x2={xAt(hoverIndex)} y1={-8} y2={plotH}
              stroke="var(--color-dim)" strokeWidth="1"
            />
          )}

          <g clipPath={`url(#${clipId})`}>
            {series.map((s) => (
              <path
                key={s.id} d={path(s)} fill="none" stroke={s.color}
                strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              />
            ))}
          </g>

          {/* End markers: >=8px across, with a 2px surface ring so they stay
              legible where lines cross. */}
          {series.map((s) => {
            const lastIndex = [...xs].reduce(
              (acc, x, i) => (s.points.find((p) => p.x === x)?.y != null ? i : acc),
              -1,
            )
            if (lastIndex === -1) return null
            const v = s.points.find((p) => p.x === xs[lastIndex])!.y!
            return (
              <circle
                key={s.id} cx={xAt(lastIndex)} cy={yAt(v)} r={4}
                fill={s.color} stroke="var(--color-surface)" strokeWidth="2"
              />
            )
          })}

          {hoverIndex != null &&
            valuesAt(hoverIndex).map(({ s, y }) => (
              <circle
                key={s.id} cx={xAt(hoverIndex)} cy={yAt(y!)} r={4}
                fill={s.color} stroke="var(--color-surface)" strokeWidth="2"
              />
            ))}
        </g>
      </svg>

      {hoverIndex != null && (
        <Tooltip
          x={xs[hoverIndex]}
          rows={valuesAt(hoverIndex)}
          yFormat={yFormat}
          align={hoverIndex > xs.length / 2 ? 'left' : 'right'}
        />
      )}
    </div>
  )
}

function Tooltip({
  x, rows, yFormat, align,
}: {
  x: string
  rows: { s: Series; y: number | null }[]
  yFormat: (v: number) => string
  align: 'left' | 'right'
}) {
  return (
    <div
      // Sits opposite the pointer. The left position clears the y-axis ticks
      // rather than sitting on top of them.
      className={`pointer-events-none absolute top-2 ${
        align === 'left' ? 'left-[12%]' : 'right-2'
      } card px-3 py-2 shadow-lg`}
    >
      <div className="text-dim text-[11px] mb-1.5">
        {new Date(x + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        })}
      </div>
      {rows.length === 0 ? (
        <div className="text-dim text-xs">No spend</div>
      ) : (
        rows.map(({ s, y }) => (
          <div key={s.id} className="flex items-center gap-2 text-xs py-0.5">
            {/* A short stroke keys the series; at tooltip density a filled box
                is data-weight ink doing a label's job. */}
            <span
              className="w-3 h-0.5 rounded-full shrink-0"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            {/* Value leads, label follows — the reader has the series already. */}
            <span className="tnum font-semibold">{yFormat(y!)}</span>
            <span className="text-dim truncate max-w-40">{s.label}</span>
          </div>
        ))
      )}
    </div>
  )
}

/** Legend: always present for two or more series. Lines get a line key. */
export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
      {series.map((s) => (
        <span key={s.id} className="flex items-center gap-2 text-xs text-dim">
          <span
            className="w-4 h-0.5 rounded-full"
            style={{ background: s.color }}
            aria-hidden="true"
          />
          {s.label}
        </span>
      ))}
    </div>
  )
}
