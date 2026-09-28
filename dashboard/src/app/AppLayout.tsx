import { useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { GlobalSearch } from './GlobalSearch'
import { useAuth } from '../auth/AuthProvider'
import { useNotifications } from '../lib/useNotifications'
import { Icon } from '../components/Icon'

export function AppLayout() {
  const { profile, session, signOut } = useAuth()
  const counts = useNotifications()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-dvh flex">
      {/* Desktop rail */}
      <aside className="hidden lg:block sticky top-0 h-dvh">
        <Sidebar role={profile?.role} counts={counts} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative">
            <Sidebar
              role={profile?.role}
              counts={counts}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-bg/85 backdrop-blur flex items-center gap-3 px-3 sm:px-5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden text-dim hover:text-content p-1"
            aria-label="Open navigation"
          >
            <Icon name="menu" />
          </button>

          <GlobalSearch role={profile?.role} />

          <div className="ml-auto flex items-center gap-3">
            {profile && (
              <span className="hidden sm:inline text-xs px-2.5 py-1 rounded-full border border-border text-dim capitalize">
                {profile.role}
              </span>
            )}
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-xs">{profile?.full_name ?? session?.user?.email}</div>
              <button
                onClick={signOut}
                className="text-[11px] text-dim hover:text-content transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px] w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Title row every section shares: name, optional freshness, optional actions. */
export function SectionHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
        {description && <p className="text-dim text-sm mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {meta}
        {actions}
      </div>
    </div>
  )
}
