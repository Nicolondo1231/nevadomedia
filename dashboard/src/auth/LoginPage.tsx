import { useState, type FormEvent } from 'react'
import { supabase, isConfigured } from '../lib/supabase'

type Mode = 'password' | 'magic'

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        setSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <LogoMark />
          <div>
            <div className="font-semibold leading-tight">NevadoMedia</div>
            <div className="text-dim text-xs leading-tight">Command Center</div>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-semibold mb-1">Sign in</h1>
          <p className="text-dim text-sm mb-6">
            {mode === 'password'
              ? 'Use your email and password.'
              : 'We will email you a one-time sign-in link.'}
          </p>

          {!isConfigured ? (
            <ConfigNotice />
          ) : sent ? (
            <p className="text-sm text-positive">
              Check {email} for your sign-in link.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="text-xs text-dim">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field w-full mt-1 px-3 py-2.5 text-sm"
                  placeholder="you@nevadomedia.info"
                />
              </label>

              {mode === 'password' && (
                <label className="block">
                  <span className="text-xs text-dim">Password</span>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field w-full mt-1 px-3 py-2.5 text-sm"
                    placeholder="••••••••"
                  />
                </label>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}

              <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-sm">
                {busy ? 'Working…' : mode === 'password' ? 'Sign in' : 'Email me a link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'password' ? 'magic' : 'password')
                  setError(null)
                }}
                className="w-full text-xs text-dim hover:text-content transition-colors"
              >
                {mode === 'password' ? 'Use a magic link instead' : 'Use a password instead'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfigNotice() {
  return (
    <div className="text-sm text-warning space-y-2">
      <p className="font-medium">Not connected to Supabase yet.</p>
      <p className="text-dim">
        Set <code className="text-content">VITE_SUPABASE_URL</code> and{' '}
        <code className="text-content">VITE_SUPABASE_ANON_KEY</code> in the Netlify
        site environment, then redeploy.
      </p>
    </div>
  )
}

export function LogoMark() {
  // Placeholder mark until the real NevadoMedia logo asset is supplied.
  return (
    <div
      aria-label="NevadoMedia logo placeholder"
      className="size-9 rounded-xl grid place-items-center font-bold text-white shrink-0"
      style={{ background: 'linear-gradient(135deg, #7C5CFF, #A78BFA)' }}
    >
      N
    </div>
  )
}
