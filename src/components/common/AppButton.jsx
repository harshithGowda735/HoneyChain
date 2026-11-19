import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';

export function AppButton({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'sage'
  size = 'md',         // 'sm' | 'md' | 'lg'
  iconName,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const getBackgroundColor = () => {
    if (disabled) return colors.borderLight;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.backgroundSecondary;
      case 'sage':
        return colors.sage;
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
        return '#FFFFFF';
      case 'secondary':
        return colors.primaryDark;
      case 'sage':
        return '#FFFFFF';
      case 'outline':
        return colors.primaryDark;
      case 'ghost':
        return colors.textPrimary;
      default:
        return '#FFFFFF';
    }
  };

  const buttonSizeStyle = {
    minHeight: size === 'sm' ? 38 : size === 'lg' ? 52 : 46,
    paddingVertical: size === 'sm' ? spacing.xs + 2 : size === 'lg' ? spacing.md : spacing.sm + 2,
    paddingHorizontal: size === 'sm' ? spacing.md : size === 'lg' ? spacing.xl : spacing.lg,
    borderRadius: size === 'sm' ? borderRadius.md : borderRadius.lg,
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
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        buttonSizeStyle,
        { backgroundColor: getBackgroundColor() },
        variant === 'primary' && !disabled && styles.primaryShadow,
        variant === 'outline' && {
          borderWidth: 1.5,
          borderColor: disabled ? colors.borderLight : colors.primaryDark,
        },
        variant === 'secondary' && {
          borderWidth: 1,
          borderColor: colors.softAmber,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColor}
          style={styles.spinner}
        />
      ) : (
        <View style={styles.contentRow}>
          {iconName && iconPosition === 'left' && (
            <Ionicons
              name={iconName}
              size={fontSize + 2}
              color={textColor}
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                fontSize,
                color: textColor,
                fontWeight: typography.weight.bold,
              },
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
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryShadow: {
    shadowColor: '#D98B0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  leftIcon: {
    marginRight: spacing.xs + 2,
  },
  rightIcon: {
    marginLeft: spacing.xs + 2,
  },
  spinner: {
    marginVertical: 2,
  },
});

export default AppButton;
