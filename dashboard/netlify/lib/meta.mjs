/**
 * Shared Meta Marketing API client, used by both Netlify functions.
 *
 * Meta Marketing API client. Direct to graph.facebook.com — no middleware.
 *
 * NOTE: the field mapping below follows Meta's documented insights shape but
 * has not yet been run against a live ad account. The lead action_type in
 * particular varies by how a client's lead events are configured, which is why
 * LEAD_ACTION_TYPES is a priority list rather than a single string.
 */

const GRAPH = 'https://graph.facebook.com'

/**
 * Shared Meta Marketing API client, used by both Netlify functions.
 *
 * Lead counts arrive inside `actions` under an action_type that depends on the
 * client's setup: on-Facebook lead forms, a pixel lead event, or a generic
 * lead. Checked in this order; the first present wins so the same lead is not
 * counted twice.
 */
export const LEAD_ACTION_TYPES = [
  'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead',
  'lead',
  'leadgen_grouped',
]

export const INSIGHT_FIELDS = [
  'campaign_id', 'campaign_name',
  'adset_id', 'adset_name',
  'ad_id', 'ad_name',
  'spend', 'impressions', 'reach', 'frequency', 'clicks', 'ctr', 'cpm',
  'actions', 'cost_per_action_type',
  'quality_ranking', 'engagement_rate_ranking',
].join(',')

/** Supported date windows, in days back from today inclusive. */
export const RANGES = { '1d': 1, '7d': 7, '14d': 14, '30d': 30 }

export function dateRange(days, today = new Date()) {
  const until = new Date(today)
  const since = new Date(today)
  since.setDate(since.getDate() - (days - 1))
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { since: fmt(since), until: fmt(until) }
}

/** Pulls the first matching lead count out of an insights row's actions array. */
export function extractLeads(actions) {
  if (!Array.isArray(actions)) return 0
  for (const type of LEAD_ACTION_TYPES) {
    const hit = actions.find((a) => a.action_type === type)
    if (hit) return Number(hit.value) || 0
  }
  return 0
}

/** Turns cost_per_action_type into a plain {action_type: cost} object. */
export function costPerAction(list) {
  if (!Array.isArray(list)) return {}
  return Object.fromEntries(list.map((c) => [c.action_type, Number(c.value) || 0]))
}

/** Normalises one raw insights row into a meta_insights_daily row. */
export function normalizeRow(raw, accountId) {
  const leads = extractLeads(raw.actions)
  const spend = Number(raw.spend) || 0
  return {
    account_id: accountId,
    date: raw.date_start,
    campaign_id: raw.campaign_id ?? null,
    campaign_name: raw.campaign_name ?? null,
    adset_id: raw.adset_id ?? null,
    adset_name: raw.adset_name ?? null,
    ad_id: raw.ad_id ?? null,
    ad_name: raw.ad_name ?? null,
    spend,
    impressions: Number(raw.impressions) || 0,
    reach: Number(raw.reach) || 0,
    frequency: raw.frequency == null ? null : Number(raw.frequency),
    clicks: Number(raw.clicks) || 0,
    ctr: raw.ctr == null ? null : Number(raw.ctr),
    cpm: raw.cpm == null ? null : Number(raw.cpm),
    leads,
    // Cost per lead is derived, not reported: Meta's cost_per_action_type uses
    // whichever action type it likes, and we need it against the lead count we
    // actually chose above. Zero leads means no CPL, not a division by zero.
    cpl: leads > 0 ? Number((spend / leads).toFixed(2)) : null,
    cost_per_action_type: costPerAction(raw.cost_per_action_type),
    quality_ranking: raw.quality_ranking ?? null,
    engagement_rate_ranking: raw.engagement_rate_ranking ?? null,
  }
}

/**
 * Fetches daily, ad-level insights for one account. Follows paging until
 * exhausted, with a hard page cap so a pathological response cannot loop.
 */
export async function fetchInsights({
  accountId, token, version = 'v21.0', days = 30, fetchImpl = fetch, maxPages = 50,
}) {
  const { since, until } = dateRange(days)
  const params = new URLSearchParams({
    level: 'ad',
    fields: INSIGHT_FIELDS,
    time_increment: '1',
    time_range: JSON.stringify({ since, until }),
    limit: '500',
    access_token: token,
  })

  let url = `${GRAPH}/${version}/${accountId}/insights?${params}`
  const rows = []

  for (let page = 0; page < maxPages && url; page++) {
    const res = await fetchImpl(url)
    const body = await res.json()

    if (!res.ok || body.error) {
      const err = body.error ?? {}
      throw new Error(
        `Meta API ${res.status} for ${accountId}: ${err.message ?? 'unknown'}` +
        (err.code ? ` (code ${err.code})` : ''),
      )
    }

    for (const raw of body.data ?? []) rows.push(normalizeRow(raw, accountId))
    url = body.paging?.next ?? null
  }

  return rows
}
