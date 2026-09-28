import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  extractLeads, costPerAction, normalizeRow, dateRange, fetchInsights,
} from './meta.mjs'

const page1 = JSON.parse(readFileSync(new URL('./fixtures/insights-page1.json', import.meta.url)))
const page2 = JSON.parse(readFileSync(new URL('./fixtures/insights-page2.json', import.meta.url)))

test('lead extraction prefers the grouped on-Facebook type and never double counts', () => {
  // The row carries BOTH onsite_conversion.lead_grouped and lead with value 6.
  // Counting both would report 12 leads and halve the CPL.
  assert.equal(extractLeads(page1.data[0].actions), 6)
})

test('falls back to the pixel lead event when there is no on-Facebook form', () => {
  assert.equal(extractLeads(page2.data[0].actions), 3)
})

test('an ad with no lead action reports zero, not null', () => {
  assert.equal(extractLeads(page1.data[1].actions), 0)
  assert.equal(extractLeads(undefined), 0)
})

test('CPL is derived from the chosen lead count, and is null at zero leads', () => {
  const withLeads = normalizeRow(page1.data[0], 'act_1')
  assert.equal(withLeads.leads, 6)
  assert.equal(withLeads.cpl, 30.75)  // 184.52 / 6

  const noLeads = normalizeRow(page1.data[1], 'act_1')
  assert.equal(noLeads.leads, 0)
  assert.equal(noLeads.cpl, null)     // not Infinity, not 0
})

test('numeric strings become numbers and ids are preserved', () => {
  const row = normalizeRow(page1.data[0], 'act_919241897734064')
  assert.equal(row.account_id, 'act_919241897734064')
  assert.equal(row.date, '2026-09-27')
  assert.equal(row.spend, 184.52)
  assert.equal(row.impressions, 12043)
  assert.equal(row.clicks, 412)
  assert.equal(row.ctr, 3.421)
  assert.equal(row.ad_name, 'Marble install before/after')
  assert.equal(row.quality_ranking, 'ABOVE_AVERAGE')
})

test('cost_per_action_type flattens to an object', () => {
  assert.deepEqual(costPerAction(page1.data[0].cost_per_action_type), {
    lead: 30.7533, post_engagement: 0.348,
  })
  assert.deepEqual(costPerAction(undefined), {})
})

test('date range is inclusive of today', () => {
  const r = dateRange(7, new Date('2026-09-28T12:00:00Z'))
  assert.deepEqual(r, { since: '2026-09-22', until: '2026-09-28' })
  assert.deepEqual(dateRange(1, new Date('2026-09-28T12:00:00Z')),
    { since: '2026-09-28', until: '2026-09-28' })
})

test('paging is followed to the end', async () => {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    return { ok: true, json: async () => (calls.length === 1 ? page1 : page2) }
  }
  const rows = await fetchInsights({ accountId: 'act_1', token: 't', fetchImpl })
  assert.equal(calls.length, 2)
  assert.equal(rows.length, 3)
  assert.equal(rows.at(-1).date, '2026-09-26')
})

test('a Meta error surfaces with its message and code rather than empty data', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: 'Invalid OAuth access token', code: 190 } }),
  })
  await assert.rejects(
    () => fetchInsights({ accountId: 'act_1', token: 'bad', fetchImpl }),
    /Invalid OAuth access token.*code 190/,
  )
})

test('a 200 response carrying an error body is still treated as a failure', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ error: { message: 'Rate limit', code: 17 } }),
  })
  await assert.rejects(() => fetchInsights({ accountId: 'act_1', token: 't', fetchImpl }),
    /Rate limit/)
})

test('paging cannot loop forever', async () => {
  const selfReferential = {
    data: [page2.data[0]],
    paging: { next: 'https://graph.facebook.com/loop' },
  }
  const fetchImpl = async () => ({ ok: true, json: async () => selfReferential })
  const rows = await fetchInsights({ accountId: 'act_1', token: 't', fetchImpl, maxPages: 3 })
  assert.equal(rows.length, 3)
})
