import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { createOrder } from '../../services/orderService';
import PaymentCheckoutModal from '../../components/orders/PaymentCheckoutModal';

export default function CartModal({
  visible,
  onClose,
  onOrderPlaced,
}) {
  const {
    items,
    itemCount,
    totalAmount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { currentUser } = useAuth();

  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' | 'pickup'
  const [address, setAddress] = useState(
    currentUser?.district ? `${currentUser.district}, ${currentUser.state || 'Karnataka'}` : ''
  );
  const [contactPhone, setContactPhone] = useState(currentUser?.phoneNumber || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment checkout modal state
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [pendingOrderDetails, setPendingOrderDetails] = useState(null);

  const deliveryFee = deliveryType === 'delivery' ? (totalAmount >= 1000 ? 0 : 50) : 0;
  const finalTotal = totalAmount + deliveryFee;

  const handleProceedToPayment = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to your cart before proceeding.');
      return;
    }
    if (deliveryType === 'delivery' && !address.trim()) {
      Alert.alert('Delivery Address', 'Please provide a delivery address.');
      return;
    }
    if (!contactPhone.trim()) {
      Alert.alert('Contact Phone', 'Please provide a contact phone number.');
      return;
    }

    // Prepare pending order payload for checkout
    const orderData = {
      customerId: currentUser?.uid || 'guest_customer',
      customerName: currentUser?.name || 'Customer',
      customerPhone: contactPhone.trim(),
      beekeeperId: items[0]?.beekeeperId || 'beekeeper_demo',
      beekeeperName: items[0]?.beekeeperName || 'Cauvery Honey Farm',
      deliveryType,
      deliveryAddress: deliveryType === 'delivery' ? address.trim() : 'Store / Apiary Pickup',
      notes: notes.trim(),
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        packSize: item.packSize,
        price: item.price,
        quantity: item.quantity,
        batchCode: item.batchCode || null,
        honeyType: item.honeyType || null,
        imageUrl: item.imageUrl || null,
      })),
      subtotal: totalAmount,
      deliveryFee,
      totalAmount: finalTotal,
    };

    setPendingOrderDetails(orderData);
    setCheckoutVisible(true);
  };

  const handlePaymentSuccess = async (paymentResult) => {
    setCheckoutVisible(false);
    setIsSubmitting(true);
    try {
      const orderPayload = {
        ...pendingOrderDetails,
        payment: {
          gateway: 'razorpay',
          status: 'paid',
          paymentId: paymentResult.paymentId,
          orderId: paymentResult.orderId,
          signature: paymentResult.signature,
          paidAt: new Date().toISOString(),
        },
      };

      const createdOrder = await createOrder(orderPayload);
      await clearCart();
      setIsSubmitting(false);
      onClose();

      Alert.alert(
        'Order Confirmed! 🍯',
        `Your order #${createdOrder.id.slice(-6).toUpperCase()} has been placed successfully. You can track its status in "My Orders".`,
        [
          {
            text: 'Track Order',
            onPress: () => onOrderPlaced && onOrderPlaced(createdOrder),
          },
        ]
      );
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert('Order Error', err?.message || 'Payment received but failed to record order. Please contact support.');
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="cart" size={24} color={colors.primary} />
              <Text style={styles.headerTitle}>Shopping Cart ({itemCount})</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="basket-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptySubtitle}>Explore direct-from-beekeeper honey jars and add them to your cart.</Text>
              <TouchableOpacity style={styles.shopNowBtn} onPress={onClose}>
                <Text style={styles.shopNowText}>Browse Honey</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Product items list */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Items from Beekeeper</Text>
                {items.map((item) => (
                  <View key={item.productId} style={styles.itemRow}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                    ) : (
                      <View style={[styles.itemImage, styles.placeholderImage]}>
                        <Ionicons name="nutrition" size={20} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
                      <Text style={styles.itemSub}>{item.packSize} • ₹{item.price}</Text>
                      {item.batchCode && (
                        <View style={styles.batchTag}>
                          <Ionicons name="shield-checkmark" size={10} color={colors.success} />
                          <Text style={styles.batchText}>{item.batchCode}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.qtyControl}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={14} color={colors.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.qtyNum}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color={colors.textPrimary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>

                    <TouchableOpacity
                      onPress={() => removeFromCart(item.productId)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Delivery or Pickup Options */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Fulfillment Method</Text>
                <View style={styles.fulfillmentRow}>
                  <TouchableOpacity
                    style={[
                      styles.fulfillmentOption,
                      deliveryType === 'delivery' && styles.fulfillmentOptionActive,
                    ]}
                    onPress={() => setDeliveryType('delivery')}
                  >
                    <Ionicons
                      name="bicycle"
                      size={20}
                      color={deliveryType === 'delivery' ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.fulfillmentLabel,
                        deliveryType === 'delivery' && styles.fulfillmentLabelActive,
                      ]}
                    >
                      Home Delivery
                    </Text>
                    <Text style={styles.fulfillmentSub}>
                      {totalAmount >= 1000 ? 'Free (over ₹1000)' : '₹50 shipping'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.fulfillmentOption,
                      deliveryType === 'pickup' && styles.fulfillmentOptionActive,
                    ]}
                    onPress={() => setDeliveryType('pickup')}
                  >
                    <Ionicons
                      name="storefront"
                      size={20}
                      color={deliveryType === 'pickup' ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.fulfillmentLabel,
                        deliveryType === 'pickup' && styles.fulfillmentLabelActive,
                      ]}
                    >
                      Apiary Pickup
                    </Text>
                    <Text style={styles.fulfillmentSub}>Collect directly (Free)</Text>
                  </TouchableOpacity>
                </View>

                {deliveryType === 'delivery' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Delivery Address *</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Street, House/Flat No, Landmark, City, Pincode"
                      placeholderTextColor={colors.textLight}
                      value={address}
                      onChangeText={setAddress}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contact Phone *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.textLight}
                    keyboardType="phone-pad"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Order Notes (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Special instructions for the beekeeper"
                    placeholderTextColor={colors.textLight}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              </View>

              {/* Price Breakdown */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Bill Summary</Text>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Subtotal</Text>
                  <Text style={styles.billValue}>₹{totalAmount}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  <Text style={styles.billValue}>
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.billRow}>
                  <Text style={styles.billTotalLabel}>Grand Total</Text>
                  <Text style={styles.billTotalValue}>₹{finalTotal}</Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Bottom Fixed Checkout Bar */}
          {items.length > 0 && (
            <View style={styles.bottomBar}>
              <View style={styles.totalInfo}>
                <Text style={styles.bottomTotalLabel}>Total to Pay</Text>
                <Text style={styles.bottomTotalVal}>₹{finalTotal}</Text>
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, isSubmitting && styles.checkoutBtnDisabled]}
                onPress={handleProceedToPayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card" size={18} color="#fff" />
                    <Text style={styles.checkoutBtnText}>Pay with Razorpay</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Razorpay WebView Checkout Modal */}
      {pendingOrderDetails && (
        <PaymentCheckoutModal
          visible={checkoutVisible}
          onClose={() => setCheckoutVisible(false)}
          orderDetails={pendingOrderDetails}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={(err) => {
            Alert.alert('Payment Failed', err?.message || 'Payment could not be completed. Please try again.');
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  shopNowBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
  },
  shopNowText: {
    color: '#fff',
    fontWeight: typography.weight.bold,
    fontSize: 15,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  placeholderImage: {
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  itemSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  batchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  batchText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: typography.weight.medium,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyNum: {
    fontSize: 13,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    minWidth: 16,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    minWidth: 46,
    textAlign: 'right',
  },
  deleteBtn: {
    padding: 4,
  },
  fulfillmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fulfillmentOption: {
    flex: 1,
    padding: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: 4,
  },
  fulfillmentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  fulfillmentLabel: {
    fontSize: 13,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  fulfillmentLabelActive: {
    color: colors.primary,
  },
  fulfillmentSub: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 3,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 4,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  billValue: {
    fontSize: 13,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  billTotalValue: {
    fontSize: 17,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.tabBar,
  },
  totalInfo: {
    justifyContent: 'center',
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bottomTotalVal: {
    fontSize: 18,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    ...shadows.button,
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    color: '#fff',
    fontWeight: typography.weight.bold,
    fontSize: 14,
  },
});
