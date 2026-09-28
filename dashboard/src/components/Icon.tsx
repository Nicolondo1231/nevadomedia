/**
 * Hand-rolled 20px stroke icons. A whole icon package would add ~40 KB to the
 * bundle for the dozen glyphs this dashboard uses.
 */
export type IconName =
  | 'command-center' | 'client-tracker' | 'ad-performance' | 'content-performance'
  | 'finances' | 'weekly-metrics' | 'content-pipeline' | 'funnel' | 'calls'
  | 'team' | 'search' | 'menu' | 'close' | 'refresh' | 'alert' | 'download'
  | 'chevron-down' | 'check'

const PATHS: Record<IconName, string> = {
  'command-center':      'M3 12h4l3 8 4-16 3 8h4',
  'client-tracker':      'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6M22 20v-2a4 4 0 0 0-3-3.87',
  'ad-performance':      'M3 3v18h18M7 15l4-5 3 3 5-7',
  'content-performance': 'M4 4h16v12H4zM8 20h8M12 16v4',
  'finances':            'M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5s2.2 2.8 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3',
  'weekly-metrics':      'M3 5h18M3 12h18M3 19h18M8 2v6M16 16v6',
  'content-pipeline':    'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v7h-4z',
  'funnel':              'M3 4h18l-7 8v7l-4 2v-9z',
  'calls':               'M4 4h6l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v6a1 1 0 0 1-1 1A17 17 0 0 1 3 5a1 1 0 0 1 1-1z',
  'team':                'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M23 21v-2a4 4 0 0 0-3-3.87M16 3.1a4 4 0 0 1 0 7.75',
  search:                'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M21 21l-5-5',
  menu:                  'M3 6h18M3 12h18M3 18h18',
  close:                 'M6 6l12 12M18 6L6 18',
  refresh:               'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
  alert:                 'M12 3l9 16H3zM12 9v5M12 17h.01',
  download:              'M12 3v12M7 11l5 5 5-5M4 20h16',
  'chevron-down':        'M6 9l6 6 6-6',
  check:                 'M4 12l5 5L20 6',
}

export function Icon({
  name,
  size = 20,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name].split('M').filter(Boolean).map((d, i) => (
        <path key={i} d={`M${d}`} />
      ))}
    </svg>
  )
}
