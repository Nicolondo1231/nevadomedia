/**
 * In-memory stand-in for the Supabase client, used ONLY by the preview build
 * (`VITE_PREVIEW=1`), which vite aliases over src/lib/supabase.ts. It never
 * reaches the production bundle.
 *
 * Its purpose is to render the real screens against realistic rows so layout
 * and interaction can be reviewed without a live project. It is not a fake to
 * test business logic against — the SQL suite does that.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const today = new Date()
const iso = (offsetDays: number) =>
  new Date(today.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10)
const stamp = (minsAgo: number) =>
  new Date(Date.now() - minsAgo * 60_000).toISOString()

const CLIENTS = [
  { id: 'c1', name: 'Julian | Premier Marble Kitchens', service: 'Ads', retainer: 1000,
    payment_status: 'pending', payment_status_override: false, contract_start: '2026-09-26',
    renewal_date: iso(28), last_touchpoint: iso(-1), next_action: 'Send first creative batch',
    next_action_due: iso(2), goals: '10 kitchen estimates/mo', goal_progress: 30,
    at_risk: false, notes: null, ball_side: 'nevadomedia', location: 'Connecticut',
    active: true, ended_at: null, updated_at: stamp(90) },
  { id: 'c2', name: 'Julio | Jay Pro Finish', service: 'Ads (paused)', retainer: 0,
    payment_status: 'paid', payment_status_override: false, contract_start: '2026-03-01',
    renewal_date: null, last_touchpoint: iso(-4), next_action: 'Restart ads in October',
    next_action_due: null, goals: null, goal_progress: 0, at_risk: true, notes: 'Favor — long term play.',
    ball_side: 'client', location: 'New Jersey', active: true, ended_at: null, updated_at: stamp(300) },
  { id: 'c3', name: 'Cleber + Laura | FD Construction', service: 'Organic only', retainer: 1500,
    payment_status: 'pending', payment_status_override: false, contract_start: null,
    renewal_date: null, last_touchpoint: iso(0), next_action: 'Kickoff call',
    next_action_due: iso(1), goals: null, goal_progress: 0, at_risk: false, notes: 'Starting soon.',
    ball_side: 'waiting', location: null, active: true, ended_at: null, updated_at: stamp(20) },
  { id: 'c4', name: 'Karol', service: 'Organic content', retainer: 2000,
    payment_status: 'overdue', payment_status_override: true, contract_start: null,
    renewal_date: iso(9), last_touchpoint: iso(-6), next_action: 'Chase decision',
    next_action_due: iso(-1), goals: null, goal_progress: 0, at_risk: true, notes: 'Decision pending.',
    ball_side: 'client', location: null, active: true, ended_at: null, updated_at: stamp(600) },
  { id: 'c5', name: 'NevadoMedia', service: 'Own campaigns', retainer: 0,
    payment_status: 'paid', payment_status_override: false, contract_start: null,
    renewal_date: null, last_touchpoint: iso(0), next_action: 'October launch',
    next_action_due: iso(3), goals: null, goal_progress: 15, at_risk: false, notes: null,
    ball_side: 'nevadomedia', location: 'Union, NJ', active: true, ended_at: null, updated_at: stamp(5) },
]

const TABLES: Record<string, Record<string, unknown>[]> = {
  profiles: [{ id: 'preview', email: 'sebastian@nevadomedia.info', full_name: 'Sebastian', role: 'admin' }],
  clients: CLIENTS,
  clients_ops: CLIENTS,
  onboarding_checklist: [
    { id: 'o1', client_id: 'c1', item: 'Contract signed', owner: 'NevadoMedia', completed: true, due_date: null, sort_order: 1 },
    { id: 'o2', client_id: 'c1', item: 'Deposit collected', owner: 'NevadoMedia', completed: true, due_date: null, sort_order: 2 },
    { id: 'o3', client_id: 'c1', item: 'Ad account access granted', owner: 'Client', completed: false, due_date: iso(1), sort_order: 3 },
    { id: 'o4', client_id: 'c1', item: 'First shoot scheduled', owner: 'NevadoMedia', completed: false, due_date: iso(4), sort_order: 4 },
    { id: 'o5', client_id: 'c2', item: 'Campaign launched', owner: 'NevadoMedia', completed: false, due_date: null, sort_order: 5 },
  ],
  content_pipeline: [
    { id: 'p1', client_id: 'c1', title: 'Marble countertop install — before/after', format: 'Reel', stage: 'scripted', assigned_to: 'Editor', due_date: iso(3), sort_order: 1 },
    { id: 'p2', client_id: 'c1', title: 'Client testimonial — Greenwich kitchen', format: 'Reel', stage: 'shot', assigned_to: 'Editor', due_date: iso(1), sort_order: 2 },
    { id: 'p3', client_id: 'c2', title: 'Cabinet refinish time-lapse', format: 'Short', stage: 'edited', assigned_to: 'Caleb', due_date: iso(-2), sort_order: 3 },
    { id: 'p4', client_id: 'c3', title: 'Framing walkthrough', format: 'Reel', stage: 'approved', assigned_to: 'Editor', due_date: iso(5), sort_order: 4 },
    { id: 'p5', client_id: 'c5', title: 'Agency offer explainer', format: 'VSL', stage: 'scheduled', assigned_to: 'Sebastian', due_date: iso(6), sort_order: 5 },
    { id: 'p6', client_id: 'c2', title: 'Deck staining spotlight', format: 'Reel', stage: 'posted', assigned_to: 'Editor', due_date: iso(-8), sort_order: 6 },
  ],
  sales_pipeline: [
    { id: 's1', prospect_name: 'Rivera Tile & Stone', trade: 'Tile', location: 'Newark, NJ', monthly_revenue: 45000, stage: 'lead', next_step: 'Send case study', next_step_due: iso(1), probability: 20, notes: null, sort_order: 1 },
    { id: 's2', prospect_name: 'Delgado Painting', trade: 'Painting', location: 'Elizabeth, NJ', monthly_revenue: 30000, stage: 'setting_call', next_step: 'Confirm Thursday', next_step_due: iso(2), probability: 35, notes: null, sort_order: 2 },
    { id: 's3', prospect_name: 'Mateo Flooring', trade: 'Flooring', location: 'Yonkers, NY', monthly_revenue: 60000, stage: 'sales_call', next_step: 'Run numbers on call', next_step_due: iso(0), probability: 50, notes: null, sort_order: 3 },
    { id: 's4', prospect_name: 'Herrera Remodeling', trade: 'Remodeling', location: 'Union, NJ', monthly_revenue: 90000, stage: 'proposal', next_step: 'Follow up on proposal', next_step_due: iso(-1), probability: 70, notes: null, sort_order: 4 },
  ],
  team_assignments: [
    { id: 't1', assignee: 'Editor', task: 'Cut 4 reels for Julian', client_id: 'c1', sent_date: iso(-3), due_date: iso(-1), delivered_date: null, status: 'in_progress', payment_amount: 250, payment_status: 'pending', updated_at: stamp(120) },
    { id: 't2', assignee: 'Caleb', task: 'Schedule October content', client_id: 'c5', sent_date: iso(-1), due_date: iso(3), delivered_date: null, status: 'pending', payment_amount: null, payment_status: null, updated_at: stamp(60) },
  ],
  lead_response_log: [
    { id: 'l1', lead_name: 'Maria Gonzalez', lead_source: 'Meta', received_at: stamp(8), first_contacted_at: null, response_time_minutes: null, status: 'new' },
    { id: 'l2', lead_name: 'Tom Brady (Westport)', lead_source: 'Meta', received_at: stamp(140), first_contacted_at: stamp(98), response_time_minutes: 42, status: 'qualified' },
    { id: 'l3', lead_name: 'Anna Ruiz', lead_source: 'GHL', received_at: stamp(300), first_contacted_at: stamp(292), response_time_minutes: 8, status: 'booked' },
  ],
  client_communication_log: [
    { id: 'm1', client_id: 'c1', date: iso(-1), summary: 'Walked through first creative concepts. Wants more close-ups of edge detail.', next_followup_date: iso(2) },
  ],
  expenses: (() => {
    const m = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    return [
      { id: 'e1', month: m, category: 'Mentor', amount: 1500 },
      { id: 'e2', month: m, category: 'Subscriptions', amount: 500 },
      { id: 'e3', month: m, category: 'Phones', amount: 250 },
      { id: 'e4', month: m, category: 'Editor', amount: 250 },
    ]
  })(),
  weekly_metrics: (() => {
    const monday = (w: number) => {
      const d = new Date()
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - w * 7)
      return d.toISOString().slice(0, 10)
    }
    return [
      { id: 'w0', week_date: monday(0), calls_booked: 6, show_rate: 66.7, close_rate: 25, revenue: 1000, churn_rate: 0, outstanding_tasks: 7, updated_at: stamp(30) },
      { id: 'w1', week_date: monday(1), calls_booked: 4, show_rate: 75, close_rate: 33.3, revenue: 0, churn_rate: 20, outstanding_tasks: 9, updated_at: stamp(10080) },
      { id: 'w2', week_date: monday(2), calls_booked: 5, show_rate: 60, close_rate: 20, revenue: 1500, churn_rate: 0, outstanding_tasks: 11, updated_at: stamp(20160) },
      { id: 'w3', week_date: monday(3), calls_booked: 3, show_rate: 100, close_rate: 0, revenue: 0, churn_rate: 0, outstanding_tasks: 8, updated_at: stamp(30240) },
    ]
  })(),
  app_settings: [{ id: 'a1', key: 'team_size', value: 3 }],
  ad_accounts: [
    { id: 'aa1', client_id: 'c1', provider: 'meta', account_id: 'act_PENDING_JULIAN', label: 'Julian | Premier Marble Kitchens', active: true },
    { id: 'aa2', client_id: 'c2', provider: 'meta', account_id: 'act_1759311301271024', label: 'Julio | Jay Pro Finish', active: true },
    { id: 'aa3', client_id: 'c5', provider: 'meta', account_id: 'act_443475824888837', label: 'NevadoMedia Nicogrowth', active: true },
    { id: 'aa4', client_id: 'c6', provider: 'meta', account_id: 'act_919241897734064', label: 'Andrew | Best Pro Service', active: true },
  ],
  meta_insights_daily: (() => {
    // 30 days across four accounts, with deliberately varied CPL and CTR so
    // the red/yellow thresholds and the "no leads" gaps are all exercised.
    const accounts = [
      { id: 'act_PENDING_JULIAN', campaign: 'Kitchens — Fairfield County', ad: 'Marble install before/after', base: 38, ctr: 3.9, spend: 180 },
      { id: 'act_1759311301271024', campaign: 'Interior repaint — Union NJ', ad: 'Cabinet refinish time-lapse', base: 62, ctr: 2.8, spend: 120 },
      { id: 'act_443475824888837', campaign: 'Agency — subcontractor offer', ad: 'VSL cold traffic', base: 24, ctr: 4.6, spend: 90 },
      { id: 'act_919241897734064', campaign: 'Decks & fences — Essex', ad: 'Deck staining spotlight', base: 47, ctr: 3.4, spend: 140 },
    ]
    const rows = []
    for (let d = 29; d >= 0; d--) {
      const date = new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)
      for (const [i, a] of accounts.entries()) {
        // Deterministic wobble so screenshots are reproducible.
        const wobble = Math.sin((d + i * 7) / 3.1) * 0.28 + Math.cos(d / 5.3) * 0.12
        const cpl = Math.max(8, a.base * (1 + wobble))
        const spend = a.spend * (1 + wobble / 2)
        const leads = d % 9 === i ? 0 : Math.max(1, Math.round(spend / cpl))
        const impressions = Math.round(spend * 70)
        rows.push({
          id: `${a.id}-${date}`, account_id: a.id, date,
          campaign_name: a.campaign, ad_name: a.ad,
          spend: Number(spend.toFixed(2)),
          impressions, reach: Math.round(impressions * 0.78),
          clicks: Math.round(impressions * (a.ctr / 100)),
          ctr: a.ctr, cpm: Number(((spend / impressions) * 1000).toFixed(2)),
          leads, cpl: leads > 0 ? Number((spend / leads).toFixed(2)) : null,
        })
      }
    }
    return rows
  })(),
  sync_freshness: [
    { source: 'meta', last_success_at: new Date(Date.now() - 3 * 3600_000).toISOString(), is_stale: false },
    { source: 'metricool', last_success_at: new Date(Date.now() - 31 * 3600_000).toISOString(), is_stale: true },
  ],
}

function builder(table: string) {
  let rows = [...(TABLES[table] ?? [])]
  let head = false
  let wantSingle = false

  const api = {
    select(_cols?: string, opts?: { head?: boolean; count?: string }) {
      head = Boolean(opts?.head)
      return api
    },
    eq(col: string, val: unknown) {
      rows = rows.filter((r) => String(r[col]) === String(val))
      return api
    },
    neq(col: string, val: unknown) {
      rows = rows.filter((r) => String(r[col]) !== String(val))
      return api
    },
    gt(col: string, val: unknown) { rows = rows.filter((r) => Number(r[col]) > Number(val)); return api },
    lt(col: string, val: unknown) { rows = rows.filter((r) => String(r[col]) < String(val)); return api },
    gte(col: string, val: unknown) { rows = rows.filter((r) => String(r[col]) >= String(val)); return api },
    is(col: string, val: unknown) { rows = rows.filter((r) => r[col] === val); return api },
    order(col: string, opts?: { ascending?: boolean }) {
      const dir = opts?.ascending === false ? -1 : 1
      rows.sort((a, b) => (String(a[col]) > String(b[col]) ? dir : -dir))
      return api
    },
    single() { wantSingle = true; return api },
    maybeSingle() { wantSingle = true; return api },
    update() { return { eq: async () => ({ error: null }) } },
    insert() { return { select: () => ({ single: async () => ({ data: rows[0] ?? {}, error: null }) }) } },
    upsert: async () => ({ error: null }),
    delete() { return { eq: async () => ({ error: null }) } },
    then(resolve: (v: unknown) => void) {
      resolve({
        data: head ? null : wantSingle ? (rows[0] ?? null) : rows,
        error: null,
        count: rows.length,
      })
    },
  }
  return api
}

export const isConfigured = true

export const supabase = {
  from: (table: string) => builder(table),
  auth: {
    getSession: async () => ({
      data: { session: { user: { id: 'preview', email: 'sebastian@nevadomedia.info' } } },
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
  },
} as unknown as SupabaseClient

export function requireSupabase() {
  return supabase
}
