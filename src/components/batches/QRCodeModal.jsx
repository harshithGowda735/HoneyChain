import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppButton from '../common/AppButton';
import { formatDate } from '../../utils/formatDate';
import { syncPublicBatchRecord } from '../../services/batchService';

export function QRCodeModal({
  visible,
  batch,
  onClose,
  onPreviewVerification,
}) {
  // Ensure the batch is synced to public_batches
  useEffect(() => {
    if (visible && batch) {
      syncPublicBatchRecord(batch.id, batch, {
        name: batch.hiveName,
        apiaryName: batch.apiaryName,
      });
    }
  }, [visible, batch]);

  if (!batch) return null;

  const batchCode = batch.batchCode || batch.id;
  const verificationUrl = batch.verificationUrl || `https://honeychain.app/verify/${batchCode}`;

  const handleShare = async () => {
    try {
      await Share.share({
        title: `HoneyChain Batch ${batchCode}`,
        message: `HoneyChain Certified Harvest\nBatch: ${batchCode}\nFloral Source: ${batch.honeyType}\nHarvest Date: ${formatDate(batch.harvestDate)}\nQuantity: ${batch.quantity} ${batch.unit || 'kg'}\nVerify Honey Purity: ${verificationUrl}`,
        url: verificationUrl,
      });
    } catch (err) {
      Alert.alert('Share Notice', err?.message || 'Failed to share batch label.');
    }
  };

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
              <Text style={styles.title}>Honey Jar QR Label</Text>
              <Text style={styles.subtitle}>Batch: {batchCode}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* QR Code Container */}
            <View style={styles.qrContainer}>
              <View style={styles.qrCard}>
                <QRCode
                  value={verificationUrl}
                  size={190}
                  color={colors.textPrimary}
                  backgroundColor="#FFFFFF"
                />
              </View>

              <View style={styles.codePill}>
                <Ionicons name="shield-checkmark" size={14} color={colors.primaryDark} />
                <Text style={styles.codeText}>{batchCode}</Text>
              </View>

              <Text style={styles.urlText} numberOfLines={1}>
                {verificationUrl}
              </Text>
            </View>

            {/* Label Metadata Summary */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Floral Source</Text>
                <Text style={styles.metaValue}>{batch.honeyType || 'Raw Honey'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Harvest Date</Text>
                <Text style={styles.metaValue}>{formatDate(batch.harvestDate)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Net Harvest Lot</Text>
                <Text style={styles.metaValue}>
                  {batch.quantity} {batch.unit || 'kg'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Source Colonies</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {batch.sourceHiveNames?.join(', ') || batch.hiveName || 'Registered Colony'}
                </Text>
              </View>
              <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.metaLabel}>Registry Status</Text>
                <View style={styles.verifiedRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.status.healthy.indicator} />
                  <Text style={styles.verifiedText}>Verified in Apiary Registry</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              {onPreviewVerification && (
                <AppButton
                  title="Verify in Public Registry"
                  iconName="shield-checkmark-outline"
                  variant="primary"
                  size="md"
                  onPress={() => {
                    onClose();
                    onPreviewVerification(batchCode);
                  }}
                  style={{ width: '100%', marginBottom: spacing.sm }}
                />
              )}

              <AppButton
                title="Share Verification Link"
                iconName="share-social-outline"
                variant="outline"
                size="md"
                onPress={handleShare}
                style={{ width: '100%', marginBottom: spacing.sm }}
              />

              <AppButton
                title="Done"
                variant="ghost"
                size="sm"
                onPress={onClose}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(73, 61, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  subtitle: {
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
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qrCard: {
    padding: spacing.md + 2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.card,
    marginBottom: spacing.sm,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.softAmber,
    gap: 6,
    marginBottom: 4,
  },
  codeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  urlText: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    maxWidth: 260,
  },
  metaCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  metaLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.status.healthy.text,
  },
  actions: {
    width: '100%',
  },
});

export default QRCodeModal;
