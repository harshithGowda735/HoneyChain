import React from 'react';
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

export function QRCodeModal({
  visible,
  batch,
  onClose,
  onPreviewVerification,
}) {
  if (!batch) return null;

  const batchCode = batch.batchCode || batch.id;
  const verificationUrl = batch.verificationUrl || `https://honeychain.app/verify/${batchCode}`;

  const handleShare = async () => {
    try {
      await Share.share({
        title: `HoneyChain Batch ${batchCode}`,
        message: `HoneyChain Verified Harvest\nBatch: ${batchCode}\nFloral Type: ${batch.honeyType}\nHarvest Date: ${formatDate(batch.harvestDate)}\nNet Quantity: ${batch.quantity} ${batch.unit || 'kg'}\nVerify Authenticity: ${verificationUrl}`,
        url: verificationUrl,
      });
    } catch (err) {
      Alert.alert('Share Error', err?.message || 'Failed to share batch label.');
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
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* QR Code Container */}
            <View style={styles.qrContainer}>
              <View style={styles.qrCard}>
                <QRCode
                  value={verificationUrl}
                  size={210}
                  color={colors.textPrimary}
                  backgroundColor={colors.surface}
                />
              </View>

              <View style={styles.codePill}>
                <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
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
                <Text style={styles.metaValue}>{batch.honeyType}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Harvest Date</Text>
                <Text style={styles.metaValue}>{formatDate(batch.harvestDate)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Net Lot</Text>
                <Text style={styles.metaValue}>
                  {batch.quantity} {batch.unit || 'kg'}
                </Text>
              </View>
              <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.metaLabel}>Colony Origin</Text>
                <Text style={styles.metaValue}>{batch.hiveName || 'Verified Colony'}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionColumn}>
              <AppButton
                title="Share / Print Label"
                iconName="share-outline"
                variant="primary"
                size="md"
                onPress={handleShare}
                style={styles.actionBtn}
              />

              {onPreviewVerification && (
                <AppButton
                  title="Test Public Consumer View"
                  iconName="eye-outline"
                  variant="outline"
                  size="md"
                  onPress={() => {
                    onClose();
                    onPreviewVerification(batchCode);
                  }}
                  style={styles.actionBtn}
                />
              )}

              <AppButton
                title="Close"
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.primary,
    fontWeight: typography.weight.semibold,
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
  qrContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  qrCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.elevated,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    gap: 6,
  },
  codeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  urlText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    maxWidth: 240,
    textAlign: 'center',
  },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  metaLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  actionColumn: {
    gap: spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
});

export default QRCodeModal;
