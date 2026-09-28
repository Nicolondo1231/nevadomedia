import { SectionHeader } from '../app/AppLayout'
import { Card, StatTile, Badge } from '../components/primitives'
import { AutoNumber, AutoText } from '../components/AutoField'
import { useRows, useSetting, money, pct, type Row } from '../lib/db'

interface Expense extends Row {
  month: string
  category: string
  amount: number
}

interface ClientMoney extends Row {
  name: string
  retainer: number
  payment_status: string
  active: boolean
  contract_start: string | null
  ended_at: string | null
}

interface WeeklyRow extends Row {
  week_date: string
  close_rate: number | null
  churn_rate: number | null
}

const monthStart = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export function Finances() {
  const expenses = useRows<Expense>('expenses', { order: { column: 'category' } })
  const clients = useRows<ClientMoney>('clients', {
    select: 'id, name, retainer, payment_status, active, contract_start, ended_at',
    order: { column: 'name' },
  })
  const weekly = useRows<WeeklyRow>('weekly_metrics', {
    select: 'id, week_date, close_rate, churn_rate',
    order: { column: 'week_date', ascending: false },
  })
  const [teamSize, setTeamSize] = useSetting<number>('team_size', 3)

  const thisMonth = monthStart()
  const monthExpenses = expenses.rows.filter((e) => e.month === thisMonth)
  const totalExpenses = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)

  const active = clients.rows.filter((c) => c.active)
  const mrrContracted = active.reduce((s, c) => s + Number(c.retainer), 0)

  // Collected revenue comes from Stripe. Until phase 7 there is no honest
  // number for it, so net profit and revenue per head stay unknown rather than
  // silently using contracted MRR in their place.
  const mrrCollected: number | null = null
  const netProfit = mrrCollected == null ? null : mrrCollected - totalExpenses
  const perHead = mrrCollected == null || teamSize <= 0 ? null : mrrCollected / teamSize

  const signedThisMonth = clients.rows.filter(
    (c) => c.contract_start && c.contract_start >= thisMonth,
  ).length
  const lostThisMonth = clients.rows.filter(
    (c) => c.ended_at && c.ended_at >= thisMonth,
  ).length

  const latest = weekly.rows[0]
  const churnBeatsClose =
    latest?.churn_rate != null &&
    latest?.close_rate != null &&
    Number(latest.churn_rate) > Number(latest.close_rate)

  return (
    <>
      <SectionHeader
        title="Finances"
        description="Contracted revenue is live. Collected revenue arrives with Stripe."
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          label="MRR Contracted"
          value={money(mrrContracted)}
          sublabel={`${active.length} active clients`}
        />
        <StatTile
          label="MRR Collected"
          value="—"
          sublabel={<Badge>Stripe · phase 7</Badge>}
        />
        <StatTile
          label="Monthly Expenses"
          value={money(totalExpenses)}
          sublabel="This month"
        />
        <StatTile
          label="Net Profit"
          value={netProfit == null ? '—' : money(netProfit)}
          tone={netProfit != null && netProfit < 0 ? 'danger' : 'neutral'}
          sublabel={
            netProfit == null
              ? <Badge>Needs collected revenue</Badge>
              : 'Collected − expenses'
          }
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <h2 className="font-medium mb-3">Monthly expenses</h2>
          <div className="space-y-2">
            {expenses.loading ? (
              <p className="text-dim text-sm">Loading…</p>
            ) : (
              monthExpenses.map((e) => (
                <div key={e.id} className="grid grid-cols-[1fr_auto] gap-3 items-end">
                  <AutoText
                    value={e.category}
                    onCommit={(v) => expenses.update(e.id, { category: v })}
                  />
                  <div className="w-32">
                    <AutoNumber
                      value={Number(e.amount)}
                      prefix="$"
                      onCommit={(v) => expenses.update(e.id, { amount: v })}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className="text-sm text-dim">Total</span>
            <span className="tnum font-semibold">{money(totalExpenses)}</span>
          </div>
          <button
            onClick={() =>
              expenses.insert({
                month: thisMonth, category: 'New expense', amount: 0,
              } as Partial<Expense>)
            }
            className="mt-3 text-xs text-dim hover:text-content"
          >
            + Add expense
          </button>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-medium mb-3">Revenue per head</h2>
            <div className="grid grid-cols-[auto_1fr] gap-4 items-end">
              <div className="w-24">
                <AutoNumber
                  label="Team size"
                  value={teamSize}
                  onCommit={(v) => setTeamSize(Math.max(1, Math.round(v)))}
                />
              </div>
              <div>
                <div className="text-xs text-dim">Collected ÷ team</div>
                <div className="tnum text-2xl font-semibold mt-1">
                  {perHead == null ? '—' : money(perHead)}
                </div>
              </div>
            </div>
            <p className="text-dim text-xs mt-3">
              Contracted per head is {money(mrrContracted / Math.max(1, teamSize))}.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-medium mb-3">Close rate vs churn rate</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-dim">Close rate</div>
                <div className="tnum text-2xl font-semibold mt-1">
                  {pct(latest?.close_rate)}
                </div>
              </div>
              <div>
                <div className="text-xs text-dim">Churn rate</div>
                <div
                  className={`tnum text-2xl font-semibold mt-1 ${
                    churnBeatsClose ? 'text-danger' : ''
                  }`}
                >
                  {pct(latest?.churn_rate)}
                </div>
              </div>
            </div>
            {churnBeatsClose && (
              <div className="mt-3">
                <Badge tone="danger" icon="alert">Churn is outrunning close rate</Badge>
              </div>
            )}
            <p className="text-dim text-xs mt-3">
              From the latest week in Weekly Metrics. This month: {signedThisMonth} signed,{' '}
              {lostThisMonth} lost.
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
