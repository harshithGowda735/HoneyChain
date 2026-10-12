/**
 * HoneyChain Color Palette
 * Government-Service Agricultural System Design:
 * - Clean white card surfaces & warm neutral backgrounds
 * - Deep Indian forest green primary action color
 * - Restrained national saffron/amber accents
 * - High accessible contrast for rural sunlight readability
 */

export const colors = {
  // Brand & Action Colors (Government Forest Green)
  primary: '#1B4332',        // Deep forest green (accessible, formal, trustworthy)
  primaryLight: '#2D6A4F',   // Secondary action green
  primarySoft: '#E8F5E9',    // High-contrast light green tint
  primaryMuted: '#52796F',   // Subdued green tone

  // Restrained Saffron / Agricultural Accents
  accent: '#E65100',         // Deep saffron / harvest amber
  accentLight: '#F57C00',    // Warm saffron accent
  accentSoft: '#FFF3E0',     // Gentle saffron background tint
  accentDeep: '#BF360C',     // Dark saffron border/text

  // Backgrounds & Surfaces (Clean, Warm Neutral)
  background: '#F9F6F0',     // Warm cream / parchment background
  surface: '#FFFFFF',        // Clean white card surface
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F4EFE6',   // High clarity border / subtle card
  surfaceBorder: '#E5DED1',   // Crisp accessible divider

  // Text Hierarchy (High Contrast)
  textPrimary: '#17231B',    // Near-black organic slate
  textSecondary: '#4A5B50',  // Accessible secondary moss gray
  textMuted: '#78897E',      // Accessible subtle gray
  textInverse: '#FFFFFF',    // Pure white on dark buttons
  textAccent: '#BF360C',     // High-contrast saffron accent text

  // Government Status Indicators
  status: {
    healthy: {
      text: '#14532D',
      bg: '#DCFCE7',
      border: '#86EFAC',
      indicator: '#16A34A',
    },
    active: {
      text: '#14532D',
      bg: '#DCFCE7',
      border: '#86EFAC',
      indicator: '#16A34A',
    },
    attention: {
      text: '#78350F',
      bg: '#FEF3C7',
      border: '#FDE68A',
      indicator: '#D97706',
    },
    warning: {
      text: '#78350F',
      bg: '#FEF3C7',
      border: '#FDE68A',
      indicator: '#D97706',
    },
    critical: {
      text: '#7F1D1D',
      bg: '#FEE2E2',
      border: '#FCA5A5',
      indicator: '#DC2626',
    },
    neutral: {
      text: '#374151',
      bg: '#F3F4F6',
      border: '#E5E7EB',
      indicator: '#9CA3AF',
    },
  },

  // Sensor & Telemetry Tokens
  sensor: {
    temp: '#EA580C',         // Warm orange for temperature
    humidity: '#0284C7',     // Water blue for humidity
    weight: '#7C3AED',       // Purple for hive scale weight
    battery: '#16A34A',      // Green for device battery
  },

  // Bottom Navigation
  tabBar: {
    background: '#FFFFFF',
    border: '#E5DED1',
    activeTint: '#1B4332',
    inactiveTint: '#78897E',
  },
};

export default colors;
