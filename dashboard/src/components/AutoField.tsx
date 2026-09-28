import { useEffect, useRef, useState, type ReactNode } from 'react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Every manual field commits on blur, never on each keystroke. The indicator is
 * deliberate: a field that silently fails to save is worse than no auto-save at
 * all, so an error stays on screen with the reason until the next success.
 */
function useCommit<T>(initial: T, onCommit: (v: T) => Promise<void>) {
  const [value, setValue] = useState<T>(initial)
  const [state, setState] = useState<SaveState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const committed = useRef(initial)

  // Track external changes (a refresh, another editor) unless mid-edit.
  useEffect(() => {
    if (state !== 'saving') {
      committed.current = initial
      setValue(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  async function commit(next: T = value) {
    if (next === committed.current) return
    setState('saving')
    setMessage(null)
    try {
      await onCommit(next)
      committed.current = next
      setState('saved')
      setTimeout(() => setState((s) => (s === 'saved' ? 'idle' : s)), 1600)
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Save failed')
      setValue(committed.current) // show the value that is actually stored
    }
  }

  return { value, setValue, commit, state, message }
}

function Status({ state, message }: { state: SaveState; message: string | null }) {
  if (state === 'idle') return null
  return (
    <span
      className={`text-[11px] ml-2 ${
        state === 'error' ? 'text-danger' : state === 'saved' ? 'text-positive' : 'text-dim'
      }`}
      role={state === 'error' ? 'alert' : undefined}
    >
      {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : `Not saved — ${message}`}
    </span>
  )
}

function Label({ children, status }: { children: ReactNode; status: ReactNode }) {
  return (
    <div className="flex items-baseline">
      <span className="text-xs text-dim">{children}</span>
      {status}
    </div>
  )
}

export function AutoText({
  label, value, onCommit, placeholder, type = 'text',
}: {
  label?: string
  value: string | null
  onCommit: (v: string) => Promise<void>
  placeholder?: string
  type?: 'text' | 'date' | 'number'
}) {
  const f = useCommit(value ?? '', onCommit)
  return (
    <label className="block">
      {label && <Label status={<Status state={f.state} message={f.message} />}>{label}</Label>}
      <input
        type={type}
        value={f.value}
        placeholder={placeholder}
        onChange={(e) => f.setValue(e.target.value)}
        onBlur={() => f.commit()}
        className="field w-full mt-1 px-2.5 py-1.5 text-sm"
      />
    </label>
  )
}

export function AutoNumber({
  label, value, onCommit, prefix,
}: {
  label?: string
  value: number | null
  onCommit: (v: number) => Promise<void>
  prefix?: string
}) {
  const f = useCommit(value == null ? '' : String(value), async (v) =>
    onCommit(v === '' ? 0 : Number(v)),
  )
  return (
    <label className="block">
      {label && <Label status={<Status state={f.state} message={f.message} />}>{label}</Label>}
      <div className="relative mt-1">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          value={f.value}
          onChange={(e) => f.setValue(e.target.value)}
          onBlur={() => f.commit()}
          className={`field tnum w-full py-1.5 text-sm ${prefix ? 'pl-6 pr-2.5' : 'px-2.5'}`}
        />
      </div>
    </label>
  )
}

export function AutoTextarea({
  label, value, onCommit, rows = 3, placeholder,
}: {
  label?: string
  value: string | null
  onCommit: (v: string) => Promise<void>
  rows?: number
  placeholder?: string
}) {
  const f = useCommit(value ?? '', onCommit)
  return (
    <label className="block">
      {label && <Label status={<Status state={f.state} message={f.message} />}>{label}</Label>}
      <textarea
        rows={rows}
        value={f.value}
        placeholder={placeholder}
        onChange={(e) => f.setValue(e.target.value)}
        onBlur={() => f.commit()}
        className="field w-full mt-1 px-2.5 py-1.5 text-sm resize-y"
      />
    </label>
  )
}

export function AutoSelect<T extends string>({
  label, value, options, onCommit,
}: {
  label?: string
  value: T
  options: { value: T; label: string }[]
  onCommit: (v: T) => Promise<void>
}) {
  const f = useCommit<T>(value, onCommit)
  return (
    <label className="block">
      {label && <Label status={<Status state={f.state} message={f.message} />}>{label}</Label>}
      <select
        value={f.value}
        onChange={(e) => {
          const next = e.target.value as T
          f.setValue(next)
          f.commit(next) // a select has no meaningful blur-to-commit moment
        }}
        className="field w-full mt-1 px-2.5 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function AutoCheckbox({
  label, checked, onCommit, strikeWhenChecked = false,
}: {
  label: ReactNode
  checked: boolean
  onCommit: (v: boolean) => Promise<void>
  /** Checklist items read as done when struck through; a state toggle such as
      "Active client" must not, or being active looks like being cancelled. */
  strikeWhenChecked?: boolean
}) {
  const f = useCommit(checked, onCommit)
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={f.value}
        onChange={(e) => {
          f.setValue(e.target.checked)
          f.commit(e.target.checked)
        }}
        className="size-4 rounded accent-[var(--color-accent)] cursor-pointer"
      />
      <span
        className={`text-sm ${strikeWhenChecked && f.value ? 'text-dim line-through' : ''}`}
      >
        {label}
      </span>
      <Status state={f.state} message={f.message} />
    </label>
  )
}
