/**
 * HoneyChain Design System - Warm Ivory + Honey Gold Palette
 *
 * Final Design Tokens:
 * - Primary background: #FFF8E7 (Warm Ivory)
 * - Secondary background: #FFF1C5 (Soft Warm Sand / Honey tint)
 * - Card background: #FFFEF8 (Warm parchment card surface)
 * - Primary honey: #F5AC19 (Luminous Honey Gold)
 * - Deep honey: #D98B0B (Rich Amber Honey Accent)
 * - Soft amber: #F9D76A (Warm Pollen / Light Honey)
 * - Honey glow / soft tint: #FFF5D9
 * - Sage accent: #879779 (Natural Botanical Sage)
 * - Sage light: #EAF0E6
 * - Primary text: #493D32 (Warm Soil / Deep Charcoal Brown)
 * - Secondary text: #817565 (Warm Muted Clay)
 * - Text muted: #A89D8F
 * - Border: #EFE3C9 (Soft Honeycomb Border)
 * - Border light: #F6EDE0
 */

export const colors = {
  // Brand & Honey Accents
  primary: '#F5AC19',          // Primary honey gold
  primaryDark: '#D98B0B',      // Deep honey accent
  accent: '#D98B0B',           // Deep amber honey
  accentLight: '#F9D76A',      // Soft amber / pollen
  accentSoft: '#FFF5D9',       // Gentle honey glow
  accentGlow: '#FEF3D6',       // Warm radiant fill
  deepHoney: '#D98B0B',        // Deep amber honey alias
  softAmber: '#F9D76A',        // Soft amber alias
  honeyGold: '#F5AC19',        // Honey gold alias

  // Sage / Botanical Accents
  sage: '#879779',             // Sage green
  sageLight: '#EAF0E6',        // Soft sage background tint
  sageDark: '#5E6E50',         // Deep sage for text/borders

  // Backgrounds & Surfaces
  background: '#FFF8E7',       // Primary warm ivory background
  backgroundSecondary: '#FFF1C5', // Secondary warm sand background
  surfaceSecondary: '#FFF1C5', // Surface secondary warm sand alias
  surface: '#FFFEF8',          // Warm card & container surface
  cardSurface: '#FFFEF8',      // Card surface alias
  cardBackground: '#FFFEF8',   // Card background alias
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#FFF5D9',    // Subtle honey surface
  surfaceBorder: '#EFE3C9',    // Soft border divider
  border: '#EFE3C9',
  borderLight: '#F6EDE0',

  // Text Hierarchy
  textPrimary: '#493D32',      // Main text: warm earth charcoal
  textSecondary: '#817565',    // Secondary text: warm clay
  textMuted: '#A89D8F',        // Muted label & placeholder text
  textInverse: '#FFFFFF',      // White text on dark/gold buttons
  textAccent: '#D98B0B',       // Deep honey accent text
  textSage: '#5E6E50',         // Sage text

  // Status Indicators
  error: '#C53030',            // Accessible warm red
  success: '#2E7D32',          // Natural leaf green
  warning: '#D98B0B',          // Warm honey amber

  status: {
    healthy: {
      text: '#2E7D32',
      bg: '#EBF5EC',
      border: '#C8E6C9',
      indicator: '#388E3C',
    },
    active: {
      text: '#2E7D32',
      bg: '#EBF5EC',
      border: '#C8E6C9',
      indicator: '#388E3C',
    },
    attention: {
      text: '#B45309',
      bg: '#FEF5E7',
      border: '#FDE3B7',
      indicator: '#F5AC19',
    },
    warning: {
      text: '#B45309',
      bg: '#FEF5E7',
      border: '#FDE3B7',
      indicator: '#F5AC19',
    },
    critical: {
      text: '#C53030',
      bg: '#FDF2F2',
      border: '#F8D2D2',
      indicator: '#C53030',
    },
    neutral: {
      text: '#817565',
      bg: '#F7EFE1',
      border: '#EFE3C9',
      indicator: '#A89D8F',
    },
  },

  // Sensor & Telemetry Tokens
  sensor: {
    temp: '#D98B0B',           // Deep honey for temperature
    humidity: '#4A90A4',       // Soft slate blue for humidity
    weight: '#879779',         // Sage green for colony biomass weight
    battery: '#388E3C',        // Leaf green for battery
  },

  // Bottom Navigation
  tabBar: {
    background: '#FFFEF8',
    border: '#EFE3C9',
    activeTint: '#D98B0B',
    inactiveTint: '#817565',
    activeBg: '#FFF1C5',
  },
};

export default colors;
