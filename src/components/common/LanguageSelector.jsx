import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
import { useLanguage, LANGUAGES } from '../../context/LanguageContext';

export function LanguageSelector({ style, compact = false }) {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={[styles.container, style]}>
      {!compact && (
        <View style={styles.header}>
          <Ionicons name="language" size={16} color={colors.primary} />
          <Text style={styles.headerText}>ಭಾಷೆ / Language / भाषा</Text>
        </View>
      )}

      <View style={styles.pillRow}>
        {LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              activeOpacity={0.7}
              onPress={() => setLanguage(lang.code)}
              style={[styles.pill, isActive && styles.pillActive]}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {lang.nativeName}
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
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  headerText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  pillRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 4,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  pillActive: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  pillText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
  },
});

export default LanguageSelector;
