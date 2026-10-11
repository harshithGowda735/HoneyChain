/**
 * HoneyChain Color Palette
 * Designed for mobile-first agricultural technology:
 * - Warm cream background
 * - Forest-green primary
 * - Honey-gold accents
 */

export const colors = {
  // Brand Core
  primary: '#1B4332',        // Deep forest green
  primaryLight: '#2D6A4F',   // Medium forest green
  primarySoft: '#E8F5E9',    // Light forest tint
  primaryMuted: '#52796F',

  accent: '#E69500',         // Rich honey gold
  accentLight: '#F59E0B',    // Amber honey
  accentSoft: '#FEF3C7',     // Soft honey glow
  accentDeep: '#B45309',

  // Backgrounds & Surfaces
  background: '#F9F6F0',     // Warm cream background
  surface: '#FFFFFF',        // Pure white card surface
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F3EFE6',   // Slightly deeper cream
  surfaceBorder: '#E7E1D4',   // Warm border

  // Text Hierarchy
  textPrimary: '#1E2922',    // Deep organic dark slate
  textSecondary: '#5A685D',  // Medium moss gray
  textMuted: '#8C9B90',      // Soft earthy gray
  textInverse: '#FFFFFF',    // White text on dark buttons
  textAccent: '#B45309',

  // Status Indicators
  status: {
    healthy: {
      text: '#166534',
      bg: '#DCFCE7',
      border: '#86EFAC',
      indicator: '#22C55E',
    },
    attention: {
      text: '#92400E',
      bg: '#FEF3C7',
      border: '#FDE68A',
      indicator: '#F59E0B',
    },
    critical: {
      text: '#991B1B',
      bg: '#FEE2E2',
      border: '#FCA5A5',
      indicator: '#EF4444',
    },
    neutral: {
      text: '#374151',
      bg: '#F3F4F6',
      border: '#E5E7EB',
      indicator: '#9CA3AF',
    },
  },

  // Sensor Telemetry Colors
  sensor: {
    temp: '#EA580C',         // Warm orange for temp
    humidity: '#0284C7',     // Sky blue for humidity
    weight: '#7C3AED',       // Purple for weight/production
    battery: '#16A34A',      // Green for battery
  },

  // Bottom Navigation
  tabBar: {
    background: '#FFFFFF',
    border: '#E8E2D6',
    activeTint: '#1B4332',
    inactiveTint: '#8C9B90',
  },
};

export default colors;
