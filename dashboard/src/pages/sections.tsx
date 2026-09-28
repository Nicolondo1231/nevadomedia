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

export const Funnel = () => (
  <Section
    title="Funnel Performance"
    description="NevadoMedia's own VSL funnel, visitor through to closed."
    emptyTitle="Funnel tracking arrives in phase 11"
    emptyBody="Needs the VSL landing page URL and a tracking snippet on it. Booking and close data join from GoHighLevel."
    phase="Phase 11"
  />
)

