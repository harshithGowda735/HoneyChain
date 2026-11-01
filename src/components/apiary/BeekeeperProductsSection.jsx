import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import { useAuth } from '../../context/AuthContext';
import {
  getBeekeeperProducts,
  updateProductStock,
  deleteProduct,
} from '../../services/productService';
import PublishProductModal from './PublishProductModal';

export default function BeekeeperProductsSection({ batches = [] }) {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const beekeeperId = currentUser?.uid || 'beekeeper_demo';

  const fetchProducts = async () => {
    try {
      const items = await getBeekeeperProducts(beekeeperId);
      setProducts(items);
    } catch (err) {
      console.warn('Failed fetching beekeeper products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [beekeeperId]);

  const handleAdjustStock = async (product, delta) => {
    const newStock = Math.max(0, (product.stockQuantity || 0) + delta);
    try {
      await updateProductStock(product.id, newStock);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, stockQuantity: newStock } : p))
      );
    } catch (err) {
      Alert.alert('Stock Error', err?.message || 'Failed to update stock.');
    }
  };

  const handleDelete = (productId) => {
    Alert.alert(
      'Remove Product',
      'Are you sure you want to delete this marketplace product listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(productId);
              setProducts((prev) => prev.filter((p) => p.id !== productId));
            } catch (err) {
              Alert.alert('Error', 'Could not delete product.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleWithCount}>
          <Text style={styles.sectionTitle}>Marketplace Listings</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{products.length}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            setEditingProduct(null);
            setModalVisible(true);
          }}
          style={styles.addSmallBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addSmallBtnText}>List Honey</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionSubtitle}>
        Manage packaged jars, direct pricing, and stock visible to consumers
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="basket-outline" size={28} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No products listed yet</Text>
          <Text style={styles.emptySub}>
            Package your harvested honey and sell directly to consumers at fair prices.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => {
              setEditingProduct(null);
              setModalVisible(true);
            }}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            <Text style={styles.emptyActionText}>Publish First Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.productsList}>
          {products.map((product) => {
            const isOutOfStock = (product.stockQuantity || 0) <= 0;
            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.cardMain}>
                  <View style={styles.infoCol}>
                    <View style={styles.titleRow}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      {product.batchCode && (
                        <View style={styles.batchTag}>
                          <Ionicons name="shield-checkmark" size={10} color={colors.success} />
                          <Text style={styles.batchText}>{product.batchCode}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.metaText}>
                      {product.honeyType} • {product.packSize || '500g'} • ₹{product.price}
                    </Text>

                    {/* Stock Counter */}
                    <View style={styles.stockRow}>
                      <Text style={styles.stockLabel}>Stock:</Text>
                      <View style={styles.stockControl}>
                        <TouchableOpacity
                          style={styles.stockBtn}
                          onPress={() => handleAdjustStock(product, -1)}
                          disabled={(product.stockQuantity || 0) <= 0}
                        >
                          <Ionicons name="remove" size={13} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.stockValue, isOutOfStock && styles.stockOutOfStock]}>
                          {product.stockQuantity || 0} jars
                        </Text>
                        <TouchableOpacity
                          style={styles.stockBtn}
                          onPress={() => handleAdjustStock(product, 1)}
                        >
                          <Ionicons name="add" size={13} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionCol}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingProduct(product);
                        setModalVisible(true);
                      }}
                      style={styles.actionIconBtn}
                    >
                      <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(product.id)}
                      style={styles.actionIconBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Publish or Edit Product Modal */}
      <PublishProductModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        batches={batches}
        editingProduct={editingProduct}
        onProductSaved={() => fetchProducts()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: spacing.md,
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
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  addSmallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: typography.weight.bold,
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
    maxWidth: 260,
  },
  emptyActionBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.sm,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },
  productsList: {
    gap: spacing.xs + 2,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    ...shadows.card,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  productName: {
    fontSize: 14,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  batchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  batchText: {
    fontSize: 9,
    color: colors.success,
    fontWeight: typography.weight.bold,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  stockLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stockControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 4,
    paddingHorizontal: 2,
    gap: 4,
  },
  stockBtn: {
    padding: 3,
  },
  stockValue: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  stockOutOfStock: {
    color: colors.error,
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.sm,
  },
  actionIconBtn: {
    padding: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
  },
});
