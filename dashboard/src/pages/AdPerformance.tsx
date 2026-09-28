import { useMemo, useState } from 'react'
import { SectionHeader } from '../app/AppLayout'
import { Card, Badge, StatTile, EmptyState } from '../components/primitives'
import { Freshness } from '../components/Freshness'
import { Icon } from '../components/Icon'
import { LineChart, Legend, type Series } from '../components/LineChart'
import { useFreshness } from '../lib/useFreshness'
import { useRows, money, type Row } from '../lib/db'
import { supabase } from '../lib/supabase'

interface Insight extends Row {
  account_id: string
  date: string
  campaign_name: string | null
  ad_name: string | null
  spend: number
  impressions: number
  clicks: number
  ctr: number | null
  cpm: number | null
  leads: number
  cpl: number | null
}

interface AdAccount extends Row {
  account_id: string
  label: string
  client_id: string | null
  provider: string
}

/** Thresholds from spec: CPL above this is red, CTR below this is yellow. */
const CPL_LIMIT = 50
const CTR_FLOOR = 3.5

const RANGES = [
  { id: '1d', label: '1D', days: 1 },
  { id: '7d', label: '7D', days: 7 },
  { id: '14d', label: '14D', days: 14 },
  { id: '30d', label: '30D', days: 30 },
] as const

const SERIES_COLORS = [
  'var(--color-series-1)', 'var(--color-series-2)',
  'var(--color-series-3)', 'var(--color-series-4)',
]

export function AdPerformance() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[1])
  const [refreshing, setRefreshing] = useState(false)
  const [refreshNote, setRefreshNote] = useState<string | null>(null)

  const insights = useRows<Insight>('meta_insights_daily', {
    order: { column: 'date' },
  })
  const accounts = useRows<AdAccount>('ad_accounts', { eq: { provider: 'meta' } })
  const fresh = useFreshness('meta')

  const since = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - (range.days - 1))
    return d.toISOString().slice(0, 10)
  }, [range])

  const inRange = insights.rows.filter((r) => r.date >= since)

  // Colour follows the account, fixed order, never recycled — so filtering or
  // an account dropping out never repaints the others.
  const colorFor = useMemo(() => {
    const map = new Map<string, string>()
    accounts.rows.forEach((a, i) => {
      map.set(a.account_id, SERIES_COLORS[i] ?? 'var(--color-dim)')
    })
    return map
  }, [accounts.rows])

  const labelFor = useMemo(
    () => new Map(accounts.rows.map((a) => [a.account_id, a.label])),
    [accounts.rows],
  )

  /** Daily CPL per account: summed spend over summed leads, never a mean of means. */
  const cplSeries: Series[] = useMemo(() => {
    const byAccount = new Map<string, Map<string, { spend: number; leads: number }>>()
    for (const row of inRange) {
      if (!byAccount.has(row.account_id)) byAccount.set(row.account_id, new Map())
      const days = byAccount.get(row.account_id)!
      const day = days.get(row.date) ?? { spend: 0, leads: 0 }
      day.spend += Number(row.spend)
      day.leads += Number(row.leads)
      days.set(row.date, day)
    }
    return [...byAccount.entries()].map(([accountId, days]) => ({
      id: accountId,
      label: labelFor.get(accountId) ?? accountId,
      color: colorFor.get(accountId) ?? 'var(--color-dim)',
      points: [...days.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({
          x: date,
          y: d.leads > 0 ? d.spend / d.leads : null,
        })),
    }))
  }, [inRange, colorFor, labelFor])

  const totals = inRange.reduce(
    (acc, r) => ({
      spend: acc.spend + Number(r.spend),
      leads: acc.leads + Number(r.leads),
      impressions: acc.impressions + Number(r.impressions),
      clicks: acc.clicks + Number(r.clicks),
    }),
    { spend: 0, leads: 0, impressions: 0, clicks: 0 },
  )
  const blendedCpl = totals.leads > 0 ? totals.spend / totals.leads : null
  const blendedCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null

  /** Per campaign, aggregated across the range. */
  const byCampaign = useMemo(() => {
    const map = new Map<string, {
      account_id: string; campaign: string; spend: number; leads: number
      impressions: number; clicks: number
    }>()
    for (const r of inRange) {
      const key = `${r.account_id}|${r.campaign_name ?? '—'}`
      const cur = map.get(key) ?? {
        account_id: r.account_id, campaign: r.campaign_name ?? '—',
        spend: 0, leads: 0, impressions: 0, clicks: 0,
      }
      cur.spend += Number(r.spend)
      cur.leads += Number(r.leads)
      cur.impressions += Number(r.impressions)
      cur.clicks += Number(r.clicks)
      map.set(key, cur)
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend)
  }, [inRange])

  /** Best ad per account: most leads at the lowest CPL, then highest CTR. */
  const topAds = useMemo(() => {
    const map = new Map<string, {
      ad: string; spend: number; leads: number; impressions: number; clicks: number
    }>()
    for (const r of inRange) {
      const key = `${r.account_id}|${r.ad_name ?? '—'}`
      const cur = map.get(key) ?? {
        ad: r.ad_name ?? '—', spend: 0, leads: 0, impressions: 0, clicks: 0,
      }
      cur.spend += Number(r.spend); cur.leads += Number(r.leads)
      cur.impressions += Number(r.impressions); cur.clicks += Number(r.clicks)
      map.set(key, cur)
    }
    const best = new Map<string, { ad: string; cpl: number | null; ctr: number | null }>()
    for (const [key, v] of map) {
      const accountId = key.split('|')[0]
      const cpl = v.leads > 0 ? v.spend / v.leads : null
      const ctr = v.impressions > 0 ? (v.clicks / v.impressions) * 100 : null
      const cur = best.get(accountId)
      const better =
        !cur ||
        (cpl != null && (cur.cpl == null || cpl < cur.cpl)) ||
        (cpl == null && cur.cpl == null && (ctr ?? 0) > (cur.ctr ?? 0))
      if (better) best.set(accountId, { ad: v.ad, cpl, ctr })
    }
    return best
  }, [inRange])

  async function refresh() {
    const workerUrl = import.meta.env.VITE_WORKER_URL
    if (!workerUrl) {
      setRefreshNote('Set VITE_WORKER_URL to the VPS worker address.')
      return
    }
    setRefreshing(true)
    setRefreshNote(null)
    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
      const res = await fetch(`${workerUrl.replace(/\/$/, '')}/refresh?days=30`, {
        method: 'POST',
        headers: { authorization: `Bearer ${data.session?.access_token ?? ''}` },
      })
      const body = await res.json()
      if (!res.ok && res.status !== 207) throw new Error(body.error ?? `HTTP ${res.status}`)
      setRefreshNote(
        `Pulled ${body.rows} rows across ${body.accounts} account(s)` +
        (body.failures?.length ? `, ${body.failures.length} failed` : '.'),
      )
      await insights.refresh()
    } catch (err) {
      setRefreshNote(err instanceof Error ? err.message : 'Refresh failed.')
    } finally {
      setRefreshing(false)
    }
  }

  const hasData = inRange.length > 0

  return (
    <>
      <SectionHeader
        title="Ad Performance"
        description="Live from the Meta Marketing API."
        meta={<Freshness lastUpdated={fresh?.last_success_at} source="meta" />}
        actions={
          <button
            onClick={refresh}
            disabled={refreshing}
            className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5"
          >
            <Icon name="refresh" size={14} />
            {refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
        }
      />

      {/* Filters sit in one row above everything they scope. */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                range.id === r.id
                  ? 'bg-surface-2 text-content font-medium'
                  : 'text-dim hover:text-content'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {refreshNote && <span className="text-xs text-dim">{refreshNote}</span>}
      </div>

      {!hasData ? (
        <EmptyState
          title="No Meta data yet"
          body="Once the worker runs its first sync, spend, leads, CPL and CTR appear here. The worker needs META_ACCESS_TOKEN and Julian's ad account id."
          phase="Awaiting first sync"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatTile label="Spend" value={money(totals.spend)} sublabel={`Last ${range.label}`} />
            <StatTile label="Leads" value={totals.leads} sublabel={`Last ${range.label}`} />
            <StatTile
              label="Blended CPL"
              value={blendedCpl == null ? '—' : money(blendedCpl)}
              tone={blendedCpl != null && blendedCpl > CPL_LIMIT ? 'danger' : 'neutral'}
              sublabel={
                blendedCpl != null && blendedCpl > CPL_LIMIT
                  ? <Badge tone="danger" icon="alert">Over ${CPL_LIMIT}</Badge>
                  : 'Spend ÷ leads'
              }
            />
            <StatTile
              label="Blended CTR"
              value={blendedCtr == null ? '—' : `${blendedCtr.toFixed(2)}%`}
              sublabel={
                blendedCtr != null && blendedCtr < CTR_FLOOR
                  ? <Badge tone="warning" icon="alert">Under {CTR_FLOOR}%</Badge>
                  : 'Clicks ÷ impressions'
              }
            />
          </div>

          <Card className="p-5 mt-4">
            <h2 className="font-medium">Cost per lead over time</h2>
            <p className="text-dim text-xs mt-0.5 mb-2">
              Daily spend ÷ daily leads, per account. Days with no leads are gaps, not zeroes.
            </p>
            <LineChart
              series={cplSeries}
              yFormat={(v) => `$${Math.round(v)}`}
              yLabel="Cost per lead"
            />
            <Legend series={cplSeries} />
          </Card>

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            {[...topAds.entries()].map(([accountId, best]) => (
              <Card key={accountId} className="p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-0.5 rounded-full"
                    style={{ background: colorFor.get(accountId) }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-dim">{labelFor.get(accountId) ?? accountId}</span>
                </div>
                <div className="text-sm mt-2">{best.ad}</div>
                <div className="flex gap-2 mt-2">
                  <Badge>{best.cpl == null ? 'No leads' : `${money(best.cpl)} CPL`}</Badge>
                  <Badge>{best.ctr == null ? '—' : `${best.ctr.toFixed(2)}% CTR`}</Badge>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-0 mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dim text-xs uppercase tracking-wide">
                  {['Client', 'Campaign', 'Spend', 'Leads', 'CPL', 'CTR', 'CPM', 'Impressions']
                    .map((h) => (
                      <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {byCampaign.map((c) => {
                  const cpl = c.leads > 0 ? c.spend / c.leads : null
                  const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : null
                  const cpm = c.impressions > 0 ? (c.spend / c.impressions) * 1000 : null
                  return (
                    <tr key={`${c.account_id}-${c.campaign}`} className="border-t border-border">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-0.5 rounded-full shrink-0"
                            style={{ background: colorFor.get(c.account_id) }}
                            aria-hidden="true"
                          />
                          {labelFor.get(c.account_id) ?? c.account_id}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-56 truncate">{c.campaign}</td>
                      <td className="tnum px-3 py-2.5">{money(c.spend)}</td>
                      <td className="tnum px-3 py-2.5">{c.leads}</td>
                      <td className="tnum px-3 py-2.5">
                        {cpl == null ? '—' : (
                          cpl > CPL_LIMIT
                            ? <Badge tone="danger" icon="alert">{money(cpl)}</Badge>
                            : money(cpl)
                        )}
                      </td>
                      <td className="tnum px-3 py-2.5">
                        {ctr == null ? '—' : (
                          ctr < CTR_FLOOR
                            ? <Badge tone="warning" icon="alert">{ctr.toFixed(2)}%</Badge>
                            : `${ctr.toFixed(2)}%`
                        )}
                      </td>
                      <td className="tnum px-3 py-2.5">{cpm == null ? '—' : money(cpm)}</td>
                      <td className="tnum px-3 py-2.5">{c.impressions.toLocaleString('en-US')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  )
}
