import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
import { generateRazorpayCheckoutHtml, verifyClientPaymentSignature } from '../../services/paymentService';

export function PaymentCheckoutModal({
  visible,
  paymentOptions,
  onSuccess,
  onFailure,
  onClose,
}) {
  const [loading, setLoading] = useState(true);

  if (!paymentOptions) return null;

  const htmlContent = generateRazorpayCheckoutHtml(paymentOptions);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === 'success') {
        const verification = verifyClientPaymentSignature({
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_signature: data.razorpay_signature,
        });
        if (onSuccess) onSuccess(verification);
      } else if (data.status === 'failed') {
        if (onFailure) onFailure(data.error || 'Payment transaction failed.');
      } else if (data.status === 'cancelled') {
        if (onClose) onClose();
      }
    } catch (e) {
      console.warn('[PaymentModal] Error parsing webview message:', e);
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
            <View style={{ flex: 1 }}>
              <View style={styles.shieldRow}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text style={styles.headerTitle}>Razorpay Secure Gateway</Text>
              </View>
              <Text style={styles.headerSub}>UPI • Cards • NetBanking • Wallets</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Amount Badge */}
          <View style={styles.amountStrip}>
            <Text style={styles.amountLabel}>Total Payable</Text>
            <Text style={styles.amountValue}>
              ₹{(paymentOptions.amount / 100).toFixed(2)}
            </Text>
          </View>

          {/* WebView Container */}
          <View style={styles.webviewWrapper}>
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              onMessage={handleMessage}
              onLoadEnd={() => setLoading(false)}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              style={{ flex: 1, backgroundColor: colors.background }}
            />
            {loading && (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loaderText}>Connecting to Razorpay Gateway...</Text>
              </View>
            )}
          </View>
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  headerSub: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  amountStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryLight,
  },
  amountLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  amountValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  webviewWrapper: {
    flex: 1,
    position: 'relative',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
});

export default PaymentCheckoutModal;
