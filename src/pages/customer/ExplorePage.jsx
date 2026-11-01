import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { subscribeToPublishedProducts } from '../../services/productService';
import { detectCurrentLocation } from '../../services/locationService';
import ProductDetailModal from './ProductDetailModal';
import CartModal from './CartModal';

const CATEGORIES = [
  'All',
  'Wild Forest',
  'Multiflora',
  'Acacia',
  'Jamun',
  'Eucalyptus',
];

export default function ExplorePage({
  onOpenPublicVerify,
  onOpenScanner,
  onNavigateToOrders,
}) {
  const { itemCount, addToCart } = useCart();
  const { t } = useLanguage();
  const { currentUser } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Location state
  const [userLocation, setUserLocation] = useState(currentUser?.district ? `${currentUser.district}, ${currentUser.state}` : 'Karnataka, India');
  const [detectingLoc, setDetectingLoc] = useState(false);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    // Subscribe to published marketplace products
    const unsubscribe = subscribeToPublishedProducts((items) => {
      setProducts(items);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Real-time listener automatically handles update; trigger timer fallback
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleDetectLocation = async () => {
    setDetectingLoc(true);
    try {
      const loc = await detectCurrentLocation(false);
      if (loc?.formatted) {
        setUserLocation(loc.formatted);
      }
    } catch (err) {
      Alert.alert('Location', 'Could not detect current location.');
    } finally {
      setDetectingLoc(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.apiaryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.honeyType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.batchCode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' ||
      p.honeyType?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appTitle}>HoneyChain Market</Text>
          <TouchableOpacity
            style={styles.locationPill}
            onPress={handleDetectLocation}
            disabled={detectingLoc}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={13} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {detectingLoc ? 'Locating...' : userLocation}
            </Text>
            <Ionicons name="chevron-down" size={11} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenScanner}
            accessibilityLabel="Scan Honey QR"
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => setCartVisible(true)}
            accessibilityLabel="View Cart"
          >
            <Ionicons name="cart" size={20} color={colors.primary} />
            {itemCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search pure honey, apiaries, batch..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoryWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Products Feed */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading fresh honey batches...</Text>
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
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="leaf-outline" size={54} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Honey Products Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'Try searching with a different term.'
                  : 'Beekeepers are currently packing fresh harvests. Check back shortly!'}
              </Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map((product) => {
                const isOutOfStock = (product.stockQuantity || 0) <= 0;
                return (
                  <View key={product.id} style={styles.productCard}>
                    {/* Image Area */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setSelectedProduct(product)}
                      style={styles.imageWrap}
                    >
                      {product.imageUrl ? (
                        <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                      ) : (
                        <View style={styles.placeholderWrap}>
                          <Ionicons name="nutrition" size={32} color={colors.primary} />
                        </View>
                      )}

                      {/* Traceability Badge */}
                      {product.batchCode && (
                        <TouchableOpacity
                          style={styles.traceBadge}
                          onPress={() => onOpenPublicVerify && onOpenPublicVerify(product.batchCode)}
                        >
                          <Ionicons name="shield-checkmark" size={11} color="#fff" />
                          <Text style={styles.traceText} numberOfLines={1}>
                            {product.batchCode}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {isOutOfStock && (
                        <View style={styles.outOfStockBadge}>
                          <Text style={styles.outOfStockText}>Out of Stock</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Product Details */}
                    <View style={styles.cardBody}>
                      <Text style={styles.honeyType}>{product.honeyType || 'Raw Honey'}</Text>
                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </Text>

                      <View style={styles.apiaryRow}>
                        <Ionicons name="home-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.apiaryName} numberOfLines={1}>
                          {product.apiaryName || 'Registered Apiary'}
                        </Text>
                      </View>

                      <View style={styles.priceRow}>
                        <View>
                          <Text style={styles.price}>₹{product.price}</Text>
                          <Text style={styles.packSize}>{product.packSize || '500g'}</Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.addBtn,
                            isOutOfStock && styles.addBtnDisabled,
                          ]}
                          disabled={isOutOfStock}
                          onPress={() => {
                            addToCart(product, 1);
                            Alert.alert('Added to Cart', `${product.name} added to your basket!`);
                          }}
                        >
                          <Ionicons name="add" size={16} color="#fff" />
                          <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        visible={Boolean(selectedProduct)}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenPublicVerify={onOpenPublicVerify}
      />

      {/* Cart Modal */}
      <CartModal
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        onOrderPlaced={() => {
          setCartVisible(false);
          if (onNavigateToOrders) onNavigateToOrders();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs + 2,
    backgroundColor: colors.surface,
  },
  headerLeft: {
    flex: 1,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    maxWidth: 220,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs + 4,
    fontSize: 14,
    color: colors.textPrimary,
  },
  categoryWrap: {
    paddingVertical: spacing.xs + 2,
  },
  categoryScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: typography.weight.bold,
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  productCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageWrap: {
    width: '100%',
    height: 130,
    backgroundColor: colors.surfaceVariant,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
  },
  traceBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    maxWidth: '85%',
  },
  traceText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: typography.weight.bold,
  },
  outOfStockBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },
  cardBody: {
    padding: spacing.xs + 4,
    gap: 3,
  },
  honeyType: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 13,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  apiaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  apiaryName: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  price: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  packSize: {
    fontSize: 10,
    color: colors.textLight,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  addBtnDisabled: {
    backgroundColor: colors.textLight,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },
});
