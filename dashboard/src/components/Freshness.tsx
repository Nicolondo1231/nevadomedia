import { Badge } from './primitives'

/**
 * Every section states when its data last landed. A source that has not
 * refreshed in 24 hours gets a yellow warning badge, per spec.
 */
export function Freshness({
  lastUpdated,
  source,
}: {
  lastUpdated: string | null | undefined
  source?: string
}) {
  if (!lastUpdated) {
    return <Badge>{source ? `${source}: never synced` : 'Never synced'}</Badge>
  }

  const when = new Date(lastUpdated)
  const hours = (Date.now() - when.getTime()) / 3_600_000
  const stale = hours >= 24

  const relative =
    hours < 1
      ? `${Math.max(1, Math.round(hours * 60))} min ago`
      : hours < 24
        ? `${Math.round(hours)} h ago`
        : `${Math.round(hours / 24)} d ago`

  return (
    <Badge tone={stale ? 'warning' : 'neutral'} icon={stale ? 'alert' : undefined}>
      {stale ? 'Stale — ' : 'Updated '}
      {relative}
    </Badge>
  )
}
