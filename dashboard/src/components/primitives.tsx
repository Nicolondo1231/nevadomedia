import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`card ${className}`}>{children}</div>
}

type Tone = 'neutral' | 'positive' | 'warning' | 'danger'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'text-dim border-border',
  positive: 'text-positive border-positive/40 bg-positive/10',
  warning: 'text-warning border-warning/40 bg-warning/10',
  danger: 'text-danger border-danger/40 bg-danger/10',
}

/**
 * Status is never carried by color alone — every non-neutral badge takes an
 * icon or a word as well, so it survives colorblindness and forced-colors.
 */
export function Badge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode
  tone?: Tone
  icon?: IconName
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${TONE_CLASS[tone]}`}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  )
}

/**
 * A stat tile is the right form for a single headline number — no plot, so per
 * the viz rules it carries no hover layer. `delta` is optional and always
 * labelled, never a bare colored arrow.
 */
export function StatTile({
  label,
  value,
  sublabel,
  tone = 'neutral',
  loading = false,
}: {
  label: string
  value: ReactNode
  sublabel?: ReactNode
  tone?: Tone
  loading?: boolean
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="text-dim text-xs font-medium uppercase tracking-wide">{label}</div>
      <div
        className={`tnum mt-2 text-2xl sm:text-3xl font-semibold ${
          tone === 'danger' ? 'text-danger' : tone === 'positive' ? 'text-positive' : ''
        }`}
      >
        {loading ? <span className="text-dim text-xl">—</span> : value}
      </div>
      {sublabel && <div className="text-dim text-xs mt-1.5">{sublabel}</div>}
    </Card>
  )
}

export function EmptyState({
  title,
  body,
  phase,
}: {
  title: string
  body: string
  phase?: string
}) {
  return (
    <Card className="p-8 text-center">
      <div className="font-medium">{title}</div>
      <p className="text-dim text-sm mt-2 max-w-md mx-auto">{body}</p>
      {phase && (
        <div className="mt-4">
          <Badge>{phase}</Badge>
        </div>
      )}
    </Card>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-2 ${className}`} />
}
