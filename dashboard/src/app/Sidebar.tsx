import { NavLink } from 'react-router-dom'
import { visibleNav } from '../lib/nav'
import type { NotificationCounts } from '../lib/useNotifications'
import type { UserRole } from '../lib/types'
import { Icon, type IconName } from '../components/Icon'
import { LogoMark } from '../auth/LoginPage'

export function Sidebar({
  role,
  counts,
  onNavigate,
}: {
  role: UserRole | undefined
  counts: NotificationCounts
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col h-full w-60 shrink-0 border-r border-border bg-surface">
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border">
        <LogoMark />
        <div className="min-w-0">
          {/* Replace with the real NevadoMedia logo asset when supplied. */}
          <div className="font-semibold text-sm leading-tight truncate">NevadoMedia</div>
          <div className="text-dim text-xs leading-tight">Command Center</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {visibleNav(role).map((item) => {
          const count = item.badge ? counts[item.badge] : 0
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-surface-2 text-content font-medium'
                    : 'text-dim hover:text-content hover:bg-surface-2/60',
                ].join(' ')
              }
            >
              <Icon name={item.id as IconName} size={18} className="shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {count > 0 && (
                <span
                  className="tnum shrink-0 min-w-5 px-1.5 h-5 grid place-items-center rounded-full bg-danger text-white text-[11px] font-semibold"
                  title={`${count} needing attention`}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
