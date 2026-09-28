import { SectionHeader } from '../app/AppLayout'
import { EmptyState } from '../components/primitives'
import { Freshness } from '../components/Freshness'
import { useFreshness } from '../lib/useFreshness'

/**
 * Phase 2 renders every section's frame — title, description, freshness badge
 * and an empty state naming the phase that fills it. Each is replaced in place
 * as its phase lands, so navigation and layout are testable now.
 */
function Section({
  title,
  description,
  source,
  emptyTitle,
  emptyBody,
  phase,
}: {
  title: string
  description: string
  source?: string
  emptyTitle: string
  emptyBody: string
  phase: string
}) {
  const fresh = useFreshness(source ?? '')
  return (
    <>
      <SectionHeader
        title={title}
        description={description}
        meta={source ? <Freshness lastUpdated={fresh?.last_success_at} source={source} /> : undefined}
      />
      <EmptyState title={emptyTitle} body={emptyBody} phase={phase} />
    </>
  )
}

export const ClientTracker = () => (
  <Section
    title="Client Tracker"
    description="One card per client: payment, renewal, onboarding, content, ads and notes."
    emptyTitle="Client cards arrive in phase 3"
    emptyBody="Six clients are already seeded in the database. Phase 3 builds the card UI, the onboarding checklist, the communication log and the auto-saving fields."
    phase="Phase 3"
  />
)

export const AdPerformance = () => (
  <Section
    title="Ad Performance"
    description="Live from the Meta Marketing API across all four ad accounts."
    source="meta"
    emptyTitle="Meta data arrives in phase 4"
    emptyBody="The table, the 1D/7D/14D/30D switcher, the CPL trend chart, the CPL and CTR flags and the manual refresh button are built once the Meta token and Julian's account id are in place."
    phase="Phase 4"
  />
)

export const ContentPerformance = () => (
  <Section
    title="Content Performance"
    description="Views, reach, engagement and follower growth per connected account."
    source="metricool"
    emptyTitle="Metricool data arrives in phase 6"
    emptyBody="Three brands are already mapped to clients. Phase 6 pulls the top and bottom five posts, the follower growth chart and the engagement trend."
    phase="Phase 6"
  />
)

export const Finances = () => (
  <Section
    title="Finances"
    description="MRR contracted against collected, expenses, net profit, churn and close rate."
    emptyTitle="Finance views arrive in phase 3"
    emptyBody="The $2,500 monthly expense rows are seeded. Phase 3 builds the manual side; phase 7 connects Stripe for collected revenue."
    phase="Phase 3 · Stripe in phase 7"
  />
)

export const WeeklyMetrics = () => (
  <Section
    title="Weekly Metrics"
    description="Calls booked, show rate, close rate, revenue, churn and outstanding tasks, week over week."
    emptyTitle="Weekly entry arrives in phase 3"
    emptyBody="Manual input with an auto-timestamp, plus a four-week trend for each measure."
    phase="Phase 3"
  />
)

export const ContentPipeline = () => (
  <Section
    title="Content Pipeline"
    description="Every piece of content across all clients."
    emptyTitle="The kanban board arrives in phase 3"
    emptyBody="Six stages from Scripted to Posted, drag and drop between them, colour coded by client, filterable by client or format."
    phase="Phase 3"
  />
)

export const Funnel = () => (
  <Section
    title="Funnel Performance"
    description="NevadoMedia's own VSL funnel, visitor through to closed."
    emptyTitle="Funnel tracking arrives in phase 11"
    emptyBody="Needs the VSL landing page URL and a tracking snippet on it. Booking and close data join from GoHighLevel."
    phase="Phase 11"
  />
)

export const CallsIntel = () => (
  <Section
    title="Calls & Intel"
    description="Fathom recordings classified and summarised, plus the Sales 2026 pipeline."
    source="fathom"
    emptyTitle="Call intelligence arrives in phase 8"
    emptyBody="The sales pipeline board is built in phase 3 and starts syncing from GoHighLevel in phase 5; Fathom summaries and action items land in phase 8."
    phase="Phase 3 · 5 · 8"
  />
)

export const Team = () => (
  <Section
    title="Team"
    description="Editor and Caleb assignments, deadlines, delivery and payment status."
    emptyTitle="Team assignments arrive in phase 3"
    emptyBody="Manual entry with overdue items flagged in red."
    phase="Phase 3"
  />
)
