export const COLORS = {
  // OLED Dark base
  background: '#0a0e17',
  surface: '#0f131c',
  surfaceElevated: '#181b25',
  surfaceBright: '#181b25',
  surfaceBorder: '#232836',
  surfaceContainerLowest: '#06090e',

  // Brand & Accents
  primary: '#ff5c35',
  primaryHover: '#ff4416',
  primaryContainer: '#3d160b',
  primaryTextOnDark: '#ffffff',

  // Status & Badges
  emerald: '#10b981',
  emeraldBg: 'rgba(16, 185, 129, 0.12)',
  accent: '#10b981',
  danger: '#dc2626',
  dangerBg: 'rgba(220, 38, 38, 0.18)',
  sosRed: '#dc2626',
  sosRedBg: 'rgba(220, 38, 38, 0.18)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  taxiYellow: '#f59e0b',
  taxiBg: 'rgba(245, 158, 11, 0.15)',
  success: '#10b981',

  // Typography Colors
  text: '#f8fafc',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textInactive: '#475569',
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
