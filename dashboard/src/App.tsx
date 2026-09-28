import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginPage, LogoMark } from './auth/LoginPage'

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="text-dim text-sm">Loading…</div>
      </div>
    )
  }
  return session ? <Shell /> : <LoginPage />
}

/**
 * Phase 1 shell: proves auth, role resolution and the design tokens end to end.
 * Phase 2 replaces the body with the real sidebar and the ten sections.
 */
function Shell() {
  const { profile, session, signOut } = useAuth()
  const name = profile?.full_name ?? session?.user?.email ?? 'there'

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="font-semibold text-sm leading-tight">NevadoMedia</div>
              <div className="text-dim text-xs leading-tight">Command Center</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-border text-dim capitalize">
                {profile.role}
              </span>
            )}
            <button
              onClick={signOut}
              className="text-xs text-dim hover:text-content transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-semibold">Good morning, {name}.</h1>
        <p className="text-dim text-sm mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        <div className="card p-6 mt-8">
          <h2 className="font-medium">Phase 1 complete</h2>
          <p className="text-dim text-sm mt-2 max-w-prose">
            Authentication, roles and the database schema are live. The sidebar and
            the ten dashboard sections arrive in phase 2.
          </p>
        </div>
      </main>
    </div>
  )
}
