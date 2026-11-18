/**
 * Layout, Spacing, and Typography Design Tokens
 * HoneyChain Warm Ivory Design System
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const typography = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const shadows = {
  sm: {
    shadowColor: '#493D32',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#493D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardElevated: {
    shadowColor: '#493D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  glow: {
    shadowColor: '#F5AC19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  tabBar: {
    shadowColor: '#493D32',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
  },
};

export default {
  spacing,
  borderRadius,
  typography,
  shadows,
};
