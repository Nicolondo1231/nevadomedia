import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { AppLayout } from './app/AppLayout'
import { CommandCenter } from './pages/CommandCenter'
import { NotFound } from './pages/NotFound'
import { ContentPerformance, Funnel } from './pages/sections'
import { AdPerformance } from './pages/AdPerformance'
import { ClientTracker } from './pages/ClientTracker'
import { ContentPipeline } from './pages/ContentPipeline'
import { Finances } from './pages/Finances'
import { WeeklyMetrics } from './pages/WeeklyMetrics'
import { Team } from './pages/Team'
import { CallsIntel } from './pages/CallsIntel'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
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
  if (!session) return <LoginPage />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<CommandCenter />} />
        <Route path="/clients" element={<ClientTracker />} />
        <Route path="/ads" element={<AdPerformance />} />
        <Route path="/content-performance" element={<ContentPerformance />} />
        <Route path="/pipeline" element={<ContentPipeline />} />
        <Route path="/team" element={<Team />} />

        {/* Admin-only. Guarded here as well as in the nav, so an operator
            cannot reach one by typing the URL. The database is the real
            boundary — these routes would render empty for them regardless. */}
        <Route path="/finances" element={<AdminOnly><Finances /></AdminOnly>} />
        <Route path="/weekly" element={<AdminOnly><WeeklyMetrics /></AdminOnly>} />
        <Route path="/funnel" element={<AdminOnly><Funnel /></AdminOnly>} />
        <Route path="/calls" element={<AdminOnly><CallsIntel /></AdminOnly>} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function AdminOnly({ children }: { children: ReactElement }) {
  const { profile } = useAuth()
  // Wait for the profile before deciding — redirecting on an unresolved role
  // would bounce Sebastian off his own pages on a cold load.
  if (!profile) return <div className="text-dim text-sm">Loading…</div>
  return profile.role === 'admin' ? children : <Navigate to="/" replace />
}
