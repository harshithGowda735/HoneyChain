import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, typography, borderRadius, shadows } from '../../constants/layout';
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
              activeOpacity={0.75}
              onPress={() => onTabPress && onTabPress(tab.key)}
              style={styles.tabButton}
            >
              <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
                <Ionicons
                  name={isActive ? tab.iconActive : tab.iconInactive}
                  size={21}
                  color={isActive ? colors.primaryDark : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.primaryDark : colors.textSecondary,
                    fontWeight: isActive ? typography.weight.bold : typography.weight.medium,
                  },
                ]}
              >
                {t(tab.labelKey)}
              </Text>
              {isActive && <View style={styles.activeDot} />}
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
    borderTopColor: colors.surfaceBorder,
    paddingTop: spacing.xs + 3,
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
    paddingVertical: 3,
  },
  iconWrapper: {
    width: 44,
    height: 30,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: colors.backgroundSecondary,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryDark,
    marginTop: 2,
  },
  tabLabel: {
    fontSize: typography.size.xs - 1,
    letterSpacing: 0.1,
  },
});

export default BottomTabBar;
