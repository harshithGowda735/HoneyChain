import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, typography, shadows } from '../../constants/layout';

export const TABS = [
  {
    key: 'home',
    label: 'Home',
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    key: 'hives',
    label: 'My Hives',
    iconActive: 'grid',
    iconInactive: 'grid-outline',
  },
  {
    key: 'batches',
    label: 'Honey Batches',
    iconActive: 'cube',
    iconInactive: 'cube-outline',
  },
  {
    key: 'profile',
    label: 'Profile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

export function BottomTabBar({ activeTab = 'home', onTabPress, bottomInset = 0 }) {
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
                {tab.label}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
