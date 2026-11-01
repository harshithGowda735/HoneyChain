import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeBeekeeperOrders,
  updateOrderStatus,
  cancelOrder,
} from '../../services/orderService';

const STATUS_CONFIG = {
  placed: {
    label: 'New Order',
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
    label: 'Packing',
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

export default function BeekeeperOrdersSection() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const beekeeperId = currentUser?.uid || 'beekeeper_demo';

  useEffect(() => {
    const unsubscribe = subscribeBeekeeperOrders(beekeeperId, (items) => {
      setOrders(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [beekeeperId]);

  const handleUpdateStatus = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, nextStatus);
    } catch (err) {
      Alert.alert('Status Error', err?.message || 'Could not update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelOrder = (order) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? Reserved items will be restored to inventory.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(order.id);
            try {
              await cancelOrder(order.id, 'Cancelled by beekeeper');
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not cancel order.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const pastOrders = orders.filter((o) => o.status === 'completed' || o.status === 'cancelled');

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleWithCount}>
          <Text style={styles.sectionTitle}>Customer Orders</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{activeOrders.length}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionSubtitle}>
        Live orders received from consumers via HoneyChain marketplace
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={28} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No orders received yet</Text>
          <Text style={styles.emptySub}>
            When customers discover and purchase your published honey jars, orders will appear here in real time.
          </Text>
        </View>
      ) : (
        <View style={styles.ordersList}>
          {orders.map((order) => {
            const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
            const isUpdating = updatingId === order.id;

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Header */}
                <View style={styles.orderTopRow}>
                  <View>
                    <Text style={styles.orderCode}>
                      #{order.id ? order.id.slice(-6).toUpperCase() : 'ORDER'}
                    </Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                    <Ionicons name={status.icon} size={12} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                {/* Customer Details */}
                <View style={styles.customerBox}>
                  <View style={styles.customerRow}>
                    <Ionicons name="person" size={13} color={colors.textSecondary} />
                    <Text style={styles.customerName}>{order.customerName || 'Customer'}</Text>
                    {order.customerPhone ? (
                      <Text style={styles.customerPhone}>({order.customerPhone})</Text>
                    ) : null}
                  </View>

                  <View style={styles.customerRow}>
                    <Ionicons
                      name={order.deliveryType === 'pickup' ? 'storefront-outline' : 'navigate-outline'}
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.customerAddress} numberOfLines={2}>
                      {order.deliveryAddress || 'Standard Delivery'}
                    </Text>
                  </View>
                </View>

                {/* Ordered Items */}
                <View style={styles.itemsWrap}>
                  {order.items?.map((item, idx) => (
                    <View key={idx} style={styles.itemLine}>
                      <Text style={styles.itemQty}>{item.quantity}x</Text>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.productName} ({item.packSize || '500g'})
                      </Text>
                      <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                    </View>
                  ))}
                </View>

                {/* Total & Payment */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Payment: <Text style={styles.paidHighlight}>Paid Online</Text>
                  </Text>
                  <Text style={styles.totalAmount}>₹{order.totalAmount}</Text>
                </View>

                {/* Status Transition Action Buttons */}
                <View style={styles.actionsBar}>
                  {order.status === 'placed' && (
                    <>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelOrder(order)}
                        disabled={isUpdating}
                      >
                        <Text style={styles.cancelBtnText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtnPrimary}
                        onPress={() => handleUpdateStatus(order.id, 'accepted')}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Accept Order</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {order.status === 'accepted' && (
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => handleUpdateStatus(order.id, 'preparing')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="cube-outline" size={14} color="#fff" />
                          <Text style={styles.actionBtnText}>Start Packing Honey</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {order.status === 'preparing' && (
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => handleUpdateStatus(order.id, 'dispatched')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons
                            name={order.deliveryType === 'pickup' ? 'storefront-outline' : 'bicycle-outline'}
                            size={14}
                            color="#fff"
                          />
                          <Text style={styles.actionBtnText}>
                            {order.deliveryType === 'pickup' ? 'Ready for Pickup' : 'Dispatch for Delivery'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {order.status === 'dispatched' && (
                    <TouchableOpacity
                      style={[styles.actionBtnPrimary, { backgroundColor: colors.success }]}
                      onPress={() => handleUpdateStatus(order.id, 'completed')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={14} color="#fff" />
                          <Text style={styles.actionBtnText}>Mark Completed / Delivered</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {order.status === 'completed' && (
                    <View style={styles.completedNotice}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.completedText}>Order Fulfilled</Text>
                    </View>
                  )}

                  {order.status === 'cancelled' && (
                    <View style={styles.cancelledNotice}>
                      <Ionicons name="close-circle" size={14} color={colors.error} />
                      <Text style={styles.cancelledText}>Order Cancelled</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.xs + 4,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.card,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 270,
  },
  ordersList: {
    gap: spacing.sm,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs + 2,
  },
  orderCode: {
    fontSize: 13,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  orderDate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },
  customerBox: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    padding: spacing.xs + 2,
    marginVertical: spacing.xs + 2,
    gap: 3,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerName: {
    fontSize: 12,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  customerPhone: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  customerAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  itemsWrap: {
    gap: 2,
    paddingVertical: 2,
  },
  itemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemQty: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    minWidth: 18,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.xs + 2,
    marginTop: spacing.xs + 2,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  paidHighlight: {
    color: colors.success,
    fontWeight: typography.weight.bold,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.xs + 4,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  cancelBtnText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: typography.weight.medium,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: typography.weight.bold,
  },
  cancelledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cancelledText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: typography.weight.bold,
  },
});
