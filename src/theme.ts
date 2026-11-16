export const COLORS = {
  background: '#0a0a0f',
  surface: '#12121e',
  surfaceElevated: '#1c1c2e',
  primary: '#c084fc',
  primaryDark: '#8b5cf6',
  accent: '#22d3ee',
  danger: '#f47272',
  warning: '#fbbf24',
  success: '#34d399',
  text: '#f8fafc',
  textMuted: '#94a3b8',
} as const

export const DURATIONS = [2, 4, 6, 8, 12]

export const sessionStatuses = ['active', 'completed', 'unlocked_early'] as const

export function formatTimeLeft(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return {
    h,
    m,
    s,
    text: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  }
}
