import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';

export function AppButton({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost'
  size = 'md',         // 'sm' | 'md' | 'lg'
  iconName,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceBorder;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.accent;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
      case 'secondary':
        return colors.textInverse;
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.textPrimary;
      default:
        return colors.textInverse;
    }
  };

  const buttonSizeStyle = {
    paddingVertical: size === 'sm' ? spacing.xs + 2 : size === 'lg' ? spacing.md : spacing.sm + 2,
    paddingHorizontal: size === 'sm' ? spacing.md : size === 'lg' ? spacing.xl : spacing.lg,
  };

  const fontSize =
    size === 'sm'
      ? typography.size.sm
      : size === 'lg'
      ? typography.size.lg
      : typography.size.md;

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        buttonSizeStyle,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && {
          borderWidth: 1.5,
          borderColor: disabled ? colors.surfaceBorder : colors.primary,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {iconName && iconPosition === 'left' && (
            <Ionicons
              name={iconName}
              size={fontSize + 2}
              color={textColor}
              style={{ marginRight: spacing.xs + 2 }}
            />
          )}
          <Text
            style={[
              styles.text,
              { color: textColor, fontSize },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconName && iconPosition === 'right' && (
            <Ionicons
              name={iconName}
              size={fontSize + 2}
              color={textColor}
              style={{ marginLeft: spacing.xs + 2 }}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
});

export default AppButton;
