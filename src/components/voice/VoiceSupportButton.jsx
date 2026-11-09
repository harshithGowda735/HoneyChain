import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { borderRadius, shadows } from '../../constants/layout';

export function VoiceSupportButton({ onPress, bottomOffset = 70 }) {
  return (
    <View
      style={[
        styles.floatingContainer,
        { bottom: bottomOffset + 14 },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.micButton}
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityLabel="Talk to HoneyChain AI Voice Assistant"
        accessibilityRole="button"
      >
        <Ionicons name="mic" size={24} color={colors.surface} />
        <View style={styles.badgeIndicator}>
          <Text style={styles.badgeText}>AI</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 999,
  },
  micButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    ...shadows.elevated,
    elevation: 8,
  },
  badgeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: 0.5,
  },
});

export default VoiceSupportButton;

