import type { UserRole } from './types'

export interface NavItem {
  id: string
  path: string
  label: string
  /** Which roles may open the section. Absent = both. */
  roles?: UserRole[]
  /** Which notification counter, if any, shows as a badge on this item. */
  badge?: 'atRisk' | 'overdue' | 'slowLeads'
}

/**
 * Sections an operator cannot open carry roles: ['admin'] — anything holding
 * retainers, revenue, expenses or prospect deal sizes. The database enforces
 * the same boundary, so hiding the link is convenience, not the control.
 */
export const NAV: NavItem[] = [
  { id: 'command-center',      path: '/',                    label: 'Command Center', badge: 'slowLeads' },
  { id: 'client-tracker',      path: '/clients',             label: 'Client Tracker', badge: 'atRisk' },
  { id: 'ad-performance',      path: '/ads',                 label: 'Ad Performance' },
  { id: 'content-performance', path: '/content-performance', label: 'Content Performance' },
  { id: 'finances',            path: '/finances',            label: 'Finances',        roles: ['admin'] },
  { id: 'weekly-metrics',      path: '/weekly',              label: 'Weekly Metrics',  roles: ['admin'] },
  { id: 'content-pipeline',    path: '/pipeline',            label: 'Content Pipeline' },
  { id: 'funnel',              path: '/funnel',              label: 'Funnel',          roles: ['admin'] },
  { id: 'calls',               path: '/calls',               label: 'Calls & Intel',   roles: ['admin'] },
  { id: 'team',                path: '/team',                label: 'Team',            badge: 'overdue' },
]

export function visibleNav(role: UserRole | undefined): NavItem[] {
  if (!role) return []
  return NAV.filter((item) => !item.roles || item.roles.includes(role))
}
