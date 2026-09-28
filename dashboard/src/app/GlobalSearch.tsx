import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { visibleNav } from '../lib/nav'
import type { UserRole } from '../lib/types'
import { Icon } from '../components/Icon'

interface Hit {
  label: string
  sub: string
  path: string
}

/**
 * Searches the sections the current role may open, plus client names. More
 * record types join as their sections land in later phases.
 */
export function GlobalSearch({ role }: { role: UserRole | undefined }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<{ id: string; name: string; service: string | null }[]>([])
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('clients_ops')
      .select('id, name, service')
      .eq('active', true)
      .then(({ data }) => setClients(data ?? []))
  }, [])

  // Cmd/Ctrl-K focuses the box, Escape dismisses it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const sections: Hit[] = visibleNav(role)
      .filter((s) => s.label.toLowerCase().includes(q))
      .map((s) => ({ label: s.label, sub: 'Section', path: s.path }))
    const people: Hit[] = clients
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({ label: c.name, sub: c.service ?? 'Client', path: '/clients' }))
    return [...sections, ...people].slice(0, 8)
  }, [query, clients, role])

  return (
    <div ref={boxRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Icon
          name="search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search clients and sections…"
          aria-label="Global search"
          className="field w-full pl-9 pr-10 py-2 text-sm"
        />
        <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-dim border border-border rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </div>

      {open && query.trim() !== '' && (
        <div className="absolute z-30 mt-2 w-full card overflow-hidden">
          {hits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-dim">No matches.</div>
          ) : (
            hits.map((hit) => (
              <button
                key={`${hit.sub}-${hit.label}`}
                onClick={() => {
                  navigate(hit.path)
                  setQuery('')
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-2 transition-colors"
              >
                <div className="text-sm">{hit.label}</div>
                <div className="text-dim text-xs">{hit.sub}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
