export const Colors = {
  primary: '#166534',       // green-800
  primaryLight: '#22c55e',  // green-500
  primaryDark: '#14532d',   // green-900
  secondary: '#d97706',     // amber-600
  high: '#10b981',          // emerald-500
  medium: '#f59e0b',        // amber-400
  low: '#ef4444',           // red-500
  background: '#f8fafc',    // slate-50
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',// slate-100
  card: '#ffffff',
  border: '#e2e8f0',        // slate-200
  borderDark: '#cbd5e1',    // slate-300
  text: '#1e293b',          // slate-800
  textMuted: '#64748b',     // slate-500
  textLight: '#94a3b8',     // slate-400
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
} as const;

export type ColorType = typeof Colors;
export default Colors;
