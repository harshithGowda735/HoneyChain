import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import { spacing, typography, borderRadius } from '../../constants/layout';
import AppButton from './AppButton';
import EmptyApiaryIllustration from '../illustrations/EmptyApiaryIllustration';

export function EmptyState({
  illustration = null,
  title = 'No colonies found',
  description = 'Your apiary has no recorded items yet.',
  actionTitle,
  onActionPress,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.illustrationWrapper}>
        {illustration ? (
          illustration
        ) : (
          <EmptyApiaryIllustration size={130} />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionTitle && onActionPress && (
        <AppButton
          title={actionTitle}
          onPress={onActionPress}
          variant="secondary"
          size="sm"
          style={styles.actionBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginVertical: spacing.md,
  },
  illustrationWrapper: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: spacing.xs,
  },
});

export default EmptyState;
