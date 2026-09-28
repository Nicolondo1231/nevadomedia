import { SectionHeader } from '../app/AppLayout'
import { Card, Badge } from '../components/primitives'
import { AutoNumber } from '../components/AutoField'
import { useRows, pct, money, type Row } from '../lib/db'

interface WeekRow extends Row {
  week_date: string
  calls_booked: number
  show_rate: number | null
  close_rate: number | null
  revenue: number
  churn_rate: number | null
  outstanding_tasks: number
  updated_at: string
}

/** Monday of the week containing `d`, as YYYY-MM-DD. */
function mondayOf(d = new Date()): string {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7 // Monday = 0
  copy.setDate(copy.getDate() - day)
  return copy.toISOString().slice(0, 10)
}

const MEASURES = [
  { key: 'calls_booked', label: 'Calls booked', format: (v: number) => String(v) },
  { key: 'show_rate', label: 'Show rate', format: pct, suffix: '%' },
  { key: 'close_rate', label: 'Close rate', format: pct, suffix: '%' },
  { key: 'revenue', label: 'Revenue', format: money, prefix: '$' },
  { key: 'churn_rate', label: 'Churn rate', format: pct, suffix: '%' },
  { key: 'outstanding_tasks', label: 'Outstanding tasks', format: (v: number) => String(v) },
] as const

export function WeeklyMetrics() {
  const weeks = useRows<WeekRow>('weekly_metrics', {
    order: { column: 'week_date', ascending: false },
  })

  const thisWeek = mondayOf()
  const hasThisWeek = weeks.rows.some((w) => w.week_date === thisWeek)
  const recent = weeks.rows.slice(0, 4)

  return (
    <>
      <SectionHeader
        title="Weekly Metrics"
        description="Manual entry, timestamped automatically. Trend shows the last four weeks."
        actions={
          !hasThisWeek && (
            <button
              onClick={() => weeks.insert({ week_date: thisWeek } as Partial<WeekRow>)}
              className="btn-primary px-3 py-1.5 text-sm"
            >
              Start this week
            </button>
          )
        }
      />

      {weeks.loading ? (
        <p className="text-dim text-sm">Loading…</p>
      ) : weeks.rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-dim text-sm">
            No weeks recorded yet. Start this week to begin the trend.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {MEASURES.map((m) => (
              <Card key={m.key} className="p-4">
                <div className="text-xs text-dim uppercase tracking-wide">{m.label}</div>
                <Trend
                  values={recent.map((w) => ({
                    week: w.week_date,
                    value: w[m.key] as number | null,
                  }))}
                  format={m.format as (v: number | null) => string}
                />
              </Card>
            ))}
          </div>

          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dim text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Week of</th>
                  {MEASURES.map((m) => (
                    <th key={m.key} className="px-3 py-3 font-medium whitespace-nowrap">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.rows.map((w) => (
                  <tr key={w.id} className="border-t border-border align-bottom">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {new Date(w.week_date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                      {w.week_date === thisWeek && (
                        <span className="ml-2"><Badge>Current</Badge></span>
                      )}
                    </td>
                    {MEASURES.map((m) => (
                      <td key={m.key} className="px-3 py-2 w-28">
                        <AutoNumber
                          value={w[m.key] as number | null}
                          prefix={'prefix' in m ? m.prefix : undefined}
                          onCommit={(v) => weeks.update(w.id, { [m.key]: v } as Partial<WeekRow>)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-dim text-xs mt-3">
            Last edited{' '}
            {weeks.lastUpdated
              ? new Date(weeks.lastUpdated).toLocaleString('en-US')
              : '—'}
          </p>
        </>
      )}
    </>
  )
}

/**
 * Four weeks is too few points for a line chart to say anything a sparkline of
 * labelled values does not — so this stays a value strip with the current
 * figure called out, rather than a chart for decoration's sake.
 */
function Trend({
  values, format,
}: {
  values: { week: string; value: number | null }[]
  format: (v: number | null) => string
}) {
  const ordered = [...values].reverse() // oldest to newest
  const current = ordered.at(-1)?.value ?? null
  const previous = ordered.at(-2)?.value ?? null
  const delta = current != null && previous != null ? current - previous : null

  return (
    <>
      <div className="tnum text-2xl font-semibold mt-1.5">{format(current)}</div>
      {delta != null && delta !== 0 && (
        <div className="text-xs mt-1 text-dim">
          {delta > 0 ? '▲' : '▼'} {format(Math.abs(delta))} vs previous week
        </div>
      )}
      <div className="flex gap-1 mt-3">
        {ordered.map((v) => (
          <div key={v.week} className="flex-1 text-center">
            <div className="tnum text-[11px] text-dim">{format(v.value)}</div>
            <div className="text-[10px] text-dim/60 mt-0.5">
              {new Date(v.week + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'numeric', day: 'numeric',
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
