/**
 * HoneyChain Color Palette
 * Government-Service Agricultural System Design:
 * - Clean white card surfaces & warm neutral backgrounds
 * - Deep Indian forest green primary action color
 * - Restrained national saffron/amber accents
 * - High accessible contrast for rural sunlight readability
 */

/**
 * HoneyChain Color Palette
 * Professional Indian Government Field-Service Agricultural System Design:
 * - Primary forest green: #07583F
 * - Dark green: #06452F
 * - White: #FFFFFF
 * - Warm cream background: #F7F5ED
 * - Restrained saffron accent: #E87522
 * - Main text: #1E2924
 * - Secondary text: #66736B
 * - Borders: #E4E2D8
 * - Error: #B42318
 * - Success: #16804A
 */

export const colors = {
  // Brand & Action Colors
  primary: '#07583F',        // Primary forest green
  darkGreen: '#06452F',      // Dark green
  primaryLight: '#0E7051',   // Mid forest green
  primarySoft: '#E6EFEA',    // Subtle forest green tint
  primaryMuted: '#537C6E',   // Muted green

  // Restrained National Saffron / Harvest Accents
  accent: '#E87522',         // Restrained saffron accent
  accentLight: '#F38E45',    // Warm saffron tint
  accentSoft: '#FDF0E7',     // Gentle saffron background tint
  accentDeep: '#C95F16',     // Deep saffron for text/borders

  // Backgrounds & Surfaces
  background: '#F7F5ED',     // Warm cream background
  surface: '#FFFFFF',        // Pure white card & container surface
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F0EDE3',   // Subtle neutral surface
  surfaceBorder: '#E4E2D8',   // Clean government border / divider

  // Text Hierarchy
  textPrimary: '#1E2924',    // Main text (high-contrast near-black slate)
  textSecondary: '#66736B',  // Secondary text (neutral moss slate)
  textMuted: '#8E9C94',      // Muted label & placeholder text
  textInverse: '#FFFFFF',    // White text on dark buttons/headers
  textAccent: '#C95F16',     // Saffron accent text

  // Status Indicators
  error: '#B42318',          // Government error red
  success: '#16804A',        // Government success green
  warning: '#D97706',        // Amber warning

  status: {
    healthy: {
      text: '#16804A',
      bg: '#EAF7EE',
      border: '#B6E8C6',
      indicator: '#16804A',
    },
    active: {
      text: '#16804A',
      bg: '#EAF7EE',
      border: '#B6E8C6',
      indicator: '#16804A',
    },
    attention: {
      text: '#B45309',
      bg: '#FEF3C7',
      border: '#FDE68A',
      indicator: '#D97706',
    },
    warning: {
      text: '#B45309',
      bg: '#FEF3C7',
      border: '#FDE68A',
      indicator: '#D97706',
    },
    critical: {
      text: '#B42318',
      bg: '#FDF0EE',
      border: '#FECDCA',
      indicator: '#B42318',
    },
    neutral: {
      text: '#66736B',
      bg: '#F0EDE3',
      border: '#E4E2D8',
      indicator: '#8E9C94',
    },
  },

  // Sensor & Telemetry Tokens
  sensor: {
    temp: '#E87522',         // Saffron-orange for hive temperature
    humidity: '#0284C7',     // Water blue for humidity
    weight: '#7C3AED',       // Clean purple for weight
    battery: '#16804A',      // Green for battery
  },

  // Bottom Navigation
  tabBar: {
    background: '#FFFFFF',
    border: '#E4E2D8',
    activeTint: '#07583F',
    inactiveTint: '#66736B',
  },
};

export default colors;
