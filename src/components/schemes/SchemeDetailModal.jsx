import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppButton from '../common/AppButton';
import { useLanguage } from '../../context/LanguageContext';

export function SchemeDetailModal({
  visible,
  scheme,
  relevance,
  isBookmarked = false,
  onToggleBookmark,
  onClose,
}) {
  const { language, t } = useLanguage();

  if (!scheme) return null;

  const displayName = language === 'kn' && scheme.nameKn
    ? scheme.nameKn
    : language === 'hi' && scheme.nameHi
    ? scheme.nameHi
    : scheme.name;

  const displayDept = language === 'kn' && scheme.departmentKn
    ? scheme.departmentKn
    : language === 'hi' && scheme.departmentHi
    ? scheme.departmentHi
    : scheme.department;

  const displayBenefit = language === 'kn' && scheme.simpleBenefitKn
    ? scheme.simpleBenefitKn
    : language === 'hi' && scheme.simpleBenefitHi
    ? scheme.simpleBenefitHi
    : scheme.simpleBenefit || scheme.benefits;

  const handleOpenUrl = async (url) => {
    if (!url) {
      Alert.alert('Notice', 'No official link is currently available for this scheme.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to Open Link', `Could not open ${url}.`);
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to open link.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Modal Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{displayName}</Text>
              <Text style={styles.department}>{displayDept}</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Top Highlight Subsidy Card */}
            <View style={styles.highlightCard}>
              <View style={styles.highlightBadge}>
                <Ionicons name="gift-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.highlightBadgeText}>{t('schemeWhatYouGet')}</Text>
              </View>
              <Text style={styles.highlightMainText}>{displayBenefit}</Text>
              <Text style={styles.highlightSubText}>{scheme.purpose}</Text>
            </View>

            {/* Who Can Apply (Eligibility) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={17} color={colors.primaryDark} />
                <Text style={styles.sectionTitle}>{t('schemeWhoCanApply')}</Text>
              </View>
              {scheme.eligibilityCriteria.map((item, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.status.healthy.indicator} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Required Documents Checklist */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={17} color={colors.primaryDark} />
                <Text style={styles.sectionTitle}>{t('schemeDocuments')}</Text>
              </View>
              {scheme.requiredDocuments.map((doc, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Ionicons name="document-attach-outline" size={16} color={colors.sageDark} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>{doc}</Text>
                </View>
              ))}
            </View>

            {/* How to Apply */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trail-sign-outline" size={17} color={colors.primaryDark} />
                <Text style={styles.sectionTitle}>{t('schemeHowToApply')}</Text>
              </View>
              {scheme.applicationProcess.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Official Website Button */}
            <View style={styles.portalActionBox}>
              <AppButton
                title={t('openPortal')}
                iconName="open-outline"
                variant="primary"
                size="lg"
                onPress={() => handleOpenUrl(scheme.applicationPortalUrl || scheme.officialSourceUrl)}
                style={{ width: '100%', marginBottom: spacing.xs }}
              />
              <Text style={styles.portalSubNote}>
                {scheme.portalName || 'Government Website'} • {scheme.officialSourceUrl}
              </Text>
            </View>

            {/* Farmer Safety Note */}
            <View style={styles.safetyBox}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primaryDark} />
              <Text style={styles.safetyText}>
                {t('schemeSafetyNotice')}
              </Text>
            </View>

            {/* Bottom Actions Row */}
            <View style={styles.bottomActions}>
              <AppButton
                title={isBookmarked ? t('removeSaved') : t('saveScheme')}
                iconName={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                variant={isBookmarked ? 'secondary' : 'outline'}
                size="md"
                onPress={() => onToggleBookmark && onToggleBookmark(scheme.id)}
                style={{ flex: 1 }}
              />

              <AppButton
                title={t('close')}
                variant="ghost"
                size="md"
                onPress={onClose}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(73, 61, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
  },
  title: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  department: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  scrollBody: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  highlightCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.softAmber,
    ...shadows.card,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  highlightBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  highlightMainText: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
  highlightSubText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs + 2,
  },
  bulletIcon: {
    marginRight: spacing.xs + 2,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: typography.size.xs + 1,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 1,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  stepText: {
    flex: 1,
    fontSize: typography.size.xs + 1,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  portalActionBox: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  portalSubNote: {
    fontSize: typography.size.xs - 1,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.softAmber,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  safetyText: {
    flex: 1,
    fontSize: typography.size.xs,
    color: colors.primaryDark,
    lineHeight: 18,
    fontWeight: typography.weight.medium,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});

export default SchemeDetailModal;
