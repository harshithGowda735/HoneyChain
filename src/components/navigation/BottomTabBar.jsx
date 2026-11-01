import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, typography, shadows } from '../../constants/layout';
import { useLanguage } from '../../context/LanguageContext';

export const BEEKEEPER_TABS = [
  {
    key: 'home',
    labelKey: 'tabHome',
    defaultLabel: 'Home',
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    key: 'apiary',
    labelKey: 'tabApiary',
    defaultLabel: 'My Apiary',
    iconActive: 'grid',
    iconInactive: 'grid-outline',
  },
  {
    key: 'schemes',
    labelKey: 'tabSchemes',
    defaultLabel: 'Schemes',
    iconActive: 'ribbon',
    iconInactive: 'ribbon-outline',
  },
  {
    key: 'profile',
    labelKey: 'tabProfile',
    defaultLabel: 'Profile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

export const CUSTOMER_TABS = [
  {
    key: 'explore',
    labelKey: 'tabExplore',
    defaultLabel: 'Market',
    iconActive: 'storefront',
    iconInactive: 'storefront-outline',
  },
  {
    key: 'orders',
    labelKey: 'tabOrders',
    defaultLabel: 'My Orders',
    iconActive: 'receipt',
    iconInactive: 'receipt-outline',
  },
  {
    key: 'profile',
    labelKey: 'tabProfile',
    defaultLabel: 'Profile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

export const TABS = BEEKEEPER_TABS;

export function BottomTabBar({ activeTab = 'home', onTabPress, bottomInset = 0, role = 'beekeeper' }) {
  const { t } = useLanguage();
  const tabs = role === 'customer' ? CUSTOMER_TABS : BEEKEEPER_TABS;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              onPress={() => onTabPress && onTabPress(tab.key)}
              style={styles.tabButton}
            >
              <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
                <Ionicons
                  name={isActive ? tab.iconActive : tab.iconInactive}
                  size={22}
                  color={isActive ? colors.primary : colors.tabBar.inactiveTint}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.primary : colors.tabBar.inactiveTint,
                    fontWeight: isActive ? typography.weight.bold : typography.weight.regular,
                  },
                ]}
              >
                {t(tab.labelKey, tab.defaultLabel)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.tabBar.border,
    paddingTop: spacing.xs + 2,
    ...shadows.tabBar,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: colors.primarySoft,
  },
  tabLabel: {
    fontSize: typography.size.xs - 1,
    letterSpacing: 0.2,
  },
});

export default BottomTabBar;
