import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { shadows } from '../../constants/layout';

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
        <Ionicons name="mic" size={24} color="#493D32" />
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
    borderColor: '#FFFDF7',
    ...shadows.glow,
    elevation: 8,
  },
  badgeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFDF7',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFDF7',
    letterSpacing: 0.5,
  },
});

export default VoiceSupportButton;
