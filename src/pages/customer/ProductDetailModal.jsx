import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppButton from '../../components/common/AppButton';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';

export function ProductDetailModal({
  visible,
  product,
  onClose,
  onOpenTraceability,
}) {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const [selectedQty, setSelectedQty] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!product) return null;

  const maxStock = product.stock || 0;
  const isOutOfStock = maxStock <= 0;

  const handleAdd = () => {
    if (isOutOfStock) {
      Alert.alert('Out of Stock', 'This honey batch is currently sold out.');
      return;
    }

    const res = addToCart(product, selectedQty);
    if (res.success) {
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
        onClose();
      }, 700);
    } else {
      Alert.alert('Cart Notice', res.reason || 'Could not add to cart.');
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
              <View style={styles.badgeRow}>
                <View style={styles.floralBadge}>
                  <Ionicons name="leaf" size={12} color={colors.accentDeep} />
                  <Text style={styles.floralBadgeText}>{product.honeyType || 'Pure Honey'}</Text>
                </View>
                <View style={styles.packSizeBadge}>
                  <Text style={styles.packSizeText}>{product.packSize || '500g'}</Text>
                </View>
              </View>
              <Text style={styles.title}>{product.title}</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Price & Stock Strip */}
            <View style={styles.priceStrip}>
              <View>
                <Text style={styles.priceLabel}>Price per jar</Text>
                <Text style={styles.priceValue}>
                  ₹{product.price}{' '}
                  <Text style={styles.unitText}>/ {product.packSize || 'jar'}</Text>
                </Text>
              </View>

              <View style={styles.stockBox}>
                <View
                  style={[
                    styles.stockDot,
                    { backgroundColor: isOutOfStock ? colors.status.critical.indicator : colors.status.healthy.indicator },
                  ]}
                />
                <Text
                  style={[
                    styles.stockText,
                    { color: isOutOfStock ? colors.status.critical.text : colors.status.healthy.text },
                  ]}
                >
                  {isOutOfStock ? 'Sold Out' : `${maxStock} jars left`}
                </Text>
              </View>
            </View>

            {/* Direct Traceability Certificate Link */}
            {product.batchCode && (
              <TouchableOpacity
                onPress={() => onOpenTraceability && onOpenTraceability(product.batchCode)}
                style={styles.traceabilityCard}
                activeOpacity={0.8}
              >
                <View style={styles.traceabilityIconCircle}>
                  <Ionicons name="qr-code" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.traceabilityTitle}>Certified Honey Batch</Text>
                  <Text style={styles.traceabilityCode}>{product.batchCode}</Text>
                  <Text style={styles.traceabilitySub}>Tap to verify hive origin and harvest certificate</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {/* Apiary & Seller Information */}
            <View style={styles.sellerCard}>
              <View style={styles.sellerRow}>
                <Ionicons name="home-outline" size={16} color={colors.primary} />
                <Text style={styles.sellerLabel}>Apiary:</Text>
                <Text style={styles.sellerValue}>{product.apiaryName}</Text>
              </View>
              <View style={styles.sellerRow}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <Text style={styles.sellerLabel}>Location:</Text>
                <Text style={styles.sellerValue}>{product.originLocation || 'Karnataka'}</Text>
              </View>
              {product.sellerName && (
                <View style={styles.sellerRow}>
                  <Ionicons name="person-outline" size={16} color={colors.primary} />
                  <Text style={styles.sellerLabel}>Beekeeper:</Text>
                  <Text style={styles.sellerValue}>{product.sellerName}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.descBox}>
              <Text style={styles.descHeading}>Product Details</Text>
              <Text style={styles.descText}>
                {product.description ||
                  '100% natural, unadulterated raw honey sourced directly from registered bee colonies.'}
              </Text>
            </View>

            {/* Fulfilment Options */}
            <View style={styles.fulfilmentRow}>
              {product.deliveryAvailable && (
                <View style={styles.fulfilmentPill}>
                  <Ionicons name="bicycle-outline" size={14} color={colors.primary} />
                  <Text style={styles.fulfilmentText}>Home Delivery</Text>
                </View>
              )}
              {product.pickupAvailable && (
                <View style={styles.fulfilmentPill}>
                  <Ionicons name="storefront-outline" size={14} color={colors.primary} />
                  <Text style={styles.fulfilmentText}>Farm Pickup</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action Strip */}
          <View style={styles.footer}>
            {!isOutOfStock && (
              <View style={styles.qtyContainer}>
                <TouchableOpacity
                  onPress={() => setSelectedQty((q) => Math.max(1, q - 1))}
                  style={styles.qtyBtn}
                  disabled={selectedQty <= 1}
                >
                  <Ionicons name="remove" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{selectedQty}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedQty((q) => Math.min(maxStock, q + 1))}
                  style={styles.qtyBtn}
                  disabled={selectedQty >= maxStock}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <AppButton
                title={
                  addedSuccess
                    ? 'Added to Cart ✓'
                    : isOutOfStock
                    ? 'Out of Stock'
                    : `Add to Cart • ₹${product.price * selectedQty}`
                }
                iconName={addedSuccess ? 'checkmark' : 'cart-outline'}
                variant={addedSuccess ? 'secondary' : 'primary'}
                size="md"
                disabled={isOutOfStock}
                onPress={handleAdd}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '88%',
    minHeight: '65%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  floralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  floralBadgeText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
  },
  packSizeBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  packSizeText: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  title: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollBody: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  priceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  priceLabel: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  unitText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.regular,
  },
  stockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  traceabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCF8ED',
    borderWidth: 1,
    borderColor: '#EBD8B3',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  traceabilityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  traceabilityTitle: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
    letterSpacing: 0.3,
  },
  traceabilityCode: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  traceabilitySub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sellerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 6,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sellerLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    width: 70,
  },
  sellerValue: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  descBox: {
    marginBottom: spacing.md,
  },
  descHeading: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  descText: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  fulfilmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fulfilmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  fulfilmentText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  qtyText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
});

export default ProductDetailModal;
