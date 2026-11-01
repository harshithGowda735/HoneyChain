import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeCustomerOrders,
  cancelOrder,
} from '../../services/orderService';

const STATUS_CONFIG = {
  placed: {
    label: 'Order Placed',
    color: '#D97706',
    bgColor: '#FEF3C7',
    icon: 'time',
  },
  accepted: {
    label: 'Accepted',
    color: '#2563EB',
    bgColor: '#DBEAFE',
    icon: 'checkmark-circle',
  },
  preparing: {
    label: 'Packing Honey',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    icon: 'cube',
  },
  dispatched: {
    label: 'Dispatched',
    color: '#0891B2',
    bgColor: '#CFFAFE',
    icon: 'bicycle',
  },
  completed: {
    label: 'Delivered',
    color: '#059669',
    bgColor: '#D1FAE5',
    icon: 'checkmark-done',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    icon: 'close-circle',
  },
};

export default function OrdersPage({ onOpenPublicVerify, onNavigateToExplore }) {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  useEffect(() => {
    const customerId = currentUser?.uid || 'guest_customer';
    const unsubscribe = subscribeCustomerOrders(customerId, (items) => {
      setOrders(items);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleCancelOrder = (order) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? Your payment will be refunded.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancellingOrderId(order.id);
            try {
              await cancelOrder(order.id, 'Cancelled by customer');
              Alert.alert('Order Cancelled', 'Your order was successfully cancelled.');
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not cancel order.');
            } finally {
              setCancellingOrderId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>Track your pure honey orders in real time</Text>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching your orders...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={56} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptyDesc}>
                You haven't ordered any fresh honey from beekeepers yet.
              </Text>
              {onNavigateToExplore && (
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={onNavigateToExplore}
                >
                  <Text style={styles.browseBtnText}>Explore Marketplace</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            orders.map((order) => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
              const canCancel = order.status === 'placed';
              const isCancelling = cancellingOrderId === order.id;

              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.orderId}>
                        Order #{order.id ? order.id.slice(-6).toUpperCase() : 'HC'}
                      </Text>
                      <Text style={styles.orderDate}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: status.bgColor },
                      ]}
                    >
                      <Ionicons name={status.icon} size={13} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  {/* Beekeeper / Origin */}
                  <View style={styles.beekeeperRow}>
                    <Ionicons name="business" size={14} color={colors.primary} />
                    <Text style={styles.beekeeperName}>
                      {order.beekeeperName || 'Cauvery Honey Farm'}
                    </Text>
                    <View style={styles.deliveryBadge}>
                      <Ionicons
                        name={order.deliveryType === 'pickup' ? 'storefront' : 'bicycle'}
                        size={11}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.deliveryText}>
                        {order.deliveryType === 'pickup' ? 'Apiary Pickup' : 'Home Delivery'}
                      </Text>
                    </View>
                  </View>

                  {/* Items List */}
                  <View style={styles.itemsList}>
                    {order.items?.map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <View style={styles.itemBullet} />
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.productName}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {item.quantity}x ({item.packSize || '500g'})
                        </Text>
                        <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>

                        {item.batchCode && (
                          <TouchableOpacity
                            style={styles.traceTag}
                            onPress={() => onOpenPublicVerify && onOpenPublicVerify(item.batchCode)}
                          >
                            <Ionicons name="shield-checkmark" size={10} color={colors.success} />
                            <Text style={styles.traceTagText}>Trace</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Order Total & Payment status */}
                  <View style={styles.footerRow}>
                    <View>
                      <Text style={styles.paymentInfo}>
                        Payment:{' '}
                        <Text style={styles.paidBadge}>
                          {order.payment?.status === 'paid' ? 'Paid Online' : 'Pending'}
                        </Text>
                      </Text>
                      <Text style={styles.totalText}>
                        Total: <Text style={styles.totalPrice}>₹{order.totalAmount}</Text>
                      </Text>
                    </View>

                    {canCancel && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelOrder(order)}
                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  scrollList: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 1.5,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  browseBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 4,
    borderRadius: borderRadius.md,
  },
  browseBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: typography.weight.bold,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs + 4,
  },
  orderId: {
    fontSize: 14,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  orderDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
  },
  beekeeperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: spacing.xs + 4,
  },
  beekeeperName: {
    fontSize: 13,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  deliveryText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  itemsList: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.xs + 4,
    gap: 6,
    marginBottom: spacing.xs + 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
  },
  itemMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  traceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  traceTagText: {
    fontSize: 9,
    color: colors.success,
    fontWeight: typography.weight.bold,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  paymentInfo: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  paidBadge: {
    color: colors.success,
    fontWeight: typography.weight.bold,
  },
  totalText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  cancelBtnText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
  },
});
