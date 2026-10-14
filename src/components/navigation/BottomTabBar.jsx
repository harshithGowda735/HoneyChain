import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, typography, shadows } from '../../constants/layout';
import { useLanguage } from '../../context/LanguageContext';

export const TABS = [
  {
    key: 'home',
    labelKey: 'tabHome',
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    key: 'apiary',
    labelKey: 'tabApiary',
    iconActive: 'grid',
    iconInactive: 'grid-outline',
  },
  {
    key: 'schemes',
    labelKey: 'tabSchemes',
    iconActive: 'ribbon',
    iconInactive: 'ribbon-outline',
  },
  {
    key: 'profile',
    labelKey: 'tabProfile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

export function BottomTabBar({ activeTab = 'home', onTabPress, bottomInset = 0 }) {
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
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
                {t(tab.labelKey)}
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
