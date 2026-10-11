import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppButton from '../common/AppButton';
import { getPublicBatchVerification } from '../../services/batchService';
import { formatDate } from '../../utils/formatDate';

export function PublicVerificationModal({ visible, batchCode, onClose, onScanAnother }) {
  const [loading, setLoading] = useState(true);
  const [verifiedBatch, setVerifiedBatch] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible || !batchCode) {
      setVerifiedBatch(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchVerification = async () => {
      setLoading(true);
      setError(null);
      try {
        const publicData = await getPublicBatchVerification(batchCode);
        if (isMounted) {
          if (publicData) {
            setVerifiedBatch(publicData);
          } else {
            setVerifiedBatch(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to connect to verification registry.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVerification();
    return () => {
      isMounted = false;
    };
  }, [visible, batchCode]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Honey Traceability</Text>
              <Text style={styles.headerSub}>Public Consumer Verification</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Verifying batch against Firestore registry...</Text>
            </View>
          ) : verifiedBatch ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              {/* Authenticated Shield Badge */}
              <View style={styles.verifiedBanner}>
                <View style={styles.shieldCircle}>
                  <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
                </View>
                <Text style={styles.verifiedTitle}>Authentic Honey Verified</Text>
                <Text style={styles.verifiedSub}>
                  Origin and extraction records authenticated by the registered apiary
                </Text>
              </View>

              {/* Public Details Grid */}
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.label}>Batch Identifier</Text>
                  <Text style={styles.valueHighlight}>{verifiedBatch.batchCode}</Text>
                </View>

                <View style={styles.cardRow}>
                  <Text style={styles.label}>Floral Variety</Text>
                  <Text style={styles.value}>{verifiedBatch.honeyType}</Text>
                </View>

                <View style={styles.cardRow}>
                  <Text style={styles.label}>Harvest Date</Text>
                  <Text style={styles.value}>{formatDate(verifiedBatch.harvestDate)}</Text>
                </View>

                <View style={styles.cardRow}>
                  <Text style={styles.label}>Net Lot Weight</Text>
                  <Text style={styles.value}>
                    {verifiedBatch.quantity} {verifiedBatch.unit || 'kg'}
                  </Text>
                </View>

                <View style={styles.cardRow}>
                  <Text style={styles.label}>Production Facility</Text>
                  <Text style={styles.value}>{verifiedBatch.originApiary || 'Certified Apiary Yard'}</Text>
                </View>

                <View style={styles.cardRow}>
                  <Text style={styles.label}>Apiary Yard Region</Text>
                  <Text style={styles.value}>{verifiedBatch.originLocation || 'Verified Yard'}</Text>
                </View>

                <View style={[styles.cardRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.label}>Current Processing Stage</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{verifiedBatch.status || 'Verified Lot'}</Text>
                  </View>
                </View>
              </View>

              {/* Security & Privacy Statement */}
              <View style={styles.privacyNote}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                <Text style={styles.privacyText}>
                  Internal beekeeper telemetry, email addresses, and colony telemetry remain private and secured.
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                {onScanAnother && (
                  <AppButton
                    title="Scan Another Jar"
                    iconName="camera-outline"
                    variant="primary"
                    size="md"
                    onPress={() => {
                      onClose();
                      onScanAnother();
                    }}
                    style={{ flex: 1 }}
                  />
                )}
                <AppButton
                  title="Done"
                  variant="outline"
                  size="md"
                  onPress={onClose}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          ) : (
            <View style={styles.invalidBox}>
              <View style={styles.invalidIconCircle}>
                <Ionicons name="alert-circle" size={44} color={colors.status.critical.text} />
              </View>
              <Text style={styles.invalidTitle}>Batch Record Unavailable</Text>
              <Text style={styles.invalidSub}>
                The batch identifier "{batchCode}" could not be authenticated in the HoneyChain public registry.
              </Text>
              <Text style={styles.invalidDetails}>
                This batch record may be deleted, invalid, or has not yet been certified for consumer verification.
              </Text>

              <View style={styles.invalidActions}>
                {onScanAnother && (
                  <AppButton
                    title="Try Another Code"
                    iconName="refresh-outline"
                    variant="primary"
                    size="md"
                    onPress={() => {
                      onClose();
                      onScanAnother();
                    }}
                    style={{ width: '100%' }}
                  />
                )}
                <AppButton
                  title="Close"
                  variant="ghost"
                  size="sm"
                  onPress={onClose}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.full,
  },
  scrollBody: {
    paddingBottom: spacing.lg,
  },
  loadingBox: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  verifiedBanner: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  shieldCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  verifiedTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  verifiedSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  label: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  value: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    fontWeight: typography.weight.semibold,
  },
  valueHighlight: {
    fontSize: typography.size.sm + 1,
    color: colors.primary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  statusPill: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusPillText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  invalidBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  invalidIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.status.critical.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.status.critical.border,
  },
  invalidTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.status.critical.text,
  },
  invalidSub: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  invalidDetails: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  invalidActions: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});

export default PublicVerificationModal;
