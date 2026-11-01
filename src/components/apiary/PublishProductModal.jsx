import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import { useAuth } from '../../context/AuthContext';
import { createProduct, updateProduct } from '../../services/productService';

const PACK_SIZES = ['250g', '500g', '1kg', 'Comb (400g)'];

export default function PublishProductModal({
  visible,
  onClose,
  batches = [],
  editingProduct = null,
  onProductSaved,
}) {
  const { currentUser } = useAuth();

  const [selectedBatchId, setSelectedBatchId] = useState(editingProduct?.batchId || (batches[0]?.id || ''));
  const [productName, setProductName] = useState(editingProduct?.name || '');
  const [honeyType, setHoneyType] = useState(editingProduct?.honeyType || (batches[0]?.honeyType || 'Raw Forest Honey'));
  const [packSize, setPackSize] = useState(editingProduct?.packSize || '500g');
  const [price, setPrice] = useState(editingProduct?.price ? String(editingProduct.price) : '450');
  const [stockQuantity, setStockQuantity] = useState(
    editingProduct?.stockQuantity ? String(editingProduct.stockQuantity) : '20'
  );
  const [description, setDescription] = useState(
    editingProduct?.description || '100% pure, unprocessed raw honey directly harvested from our verified apiary.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When a batch is selected, auto-fill name & honeyType if not set
  const handleSelectBatch = (batch) => {
    setSelectedBatchId(batch.id);
    if (batch.honeyType) {
      setHoneyType(batch.honeyType);
      if (!productName || productName.includes('Honey')) {
        setProductName(`Pure ${batch.honeyType} (${packSize})`);
      }
    }
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Required Field', 'Please enter a product title.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price in INR.');
      return;
    }
    const stockNum = parseInt(stockQuantity, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      Alert.alert('Invalid Stock', 'Please enter a valid stock quantity.');
      return;
    }

    const linkedBatch = batches.find((b) => b.id === selectedBatchId);

    setIsSubmitting(true);
    try {
      const productPayload = {
        name: productName.trim(),
        honeyType: honeyType.trim(),
        packSize,
        price: priceNum,
        stockQuantity: stockNum,
        description: description.trim(),
        beekeeperId: currentUser?.uid || 'beekeeper_demo',
        beekeeperName: currentUser?.name || 'Cauvery Honey Farm',
        apiaryName: currentUser?.apiaryName || 'Cauvery Honey Farm',
        batchId: selectedBatchId || null,
        batchCode: linkedBatch?.batchCode || linkedBatch?.id || 'HC-2026-REG',
        isPublished: true,
      };

      let savedProduct;
      if (editingProduct?.id) {
        savedProduct = await updateProduct(editingProduct.id, productPayload);
        Alert.alert('Product Updated', 'Product listing has been updated.');
      } else {
        savedProduct = await createProduct(productPayload);
        Alert.alert('Product Published', 'Honey jars are now live in the HoneyChain marketplace!');
      }

      if (onProductSaved) onProductSaved(savedProduct);
      onClose();
    } catch (err) {
      Alert.alert('Publish Error', err?.message || 'Failed to save product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {editingProduct ? 'Edit Product Listing' : 'Publish Honey Product'}
            </Text>
            <Text style={styles.subtitle}>List verified jars directly to consumers</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Linked Batch Selection */}
          <View style={styles.inputCard}>
            <Text style={styles.sectionHeading}>1. Link Harvested Batch (Traceability)</Text>
            <Text style={styles.sectionTip}>
              Linking a batch displays its genuine harvest date, location, and QR verification to consumers.
            </Text>

            {batches.length === 0 ? (
              <View style={styles.noBatchNotice}>
                <Ionicons name="information-circle" size={18} color={colors.primary} />
                <Text style={styles.noBatchText}>
                  No harvest batches yet. Record a harvest first to enable blockchain/QR verification.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.batchScroll}>
                {batches.map((batch) => {
                  const isSelected = selectedBatchId === batch.id;
                  return (
                    <TouchableOpacity
                      key={batch.id}
                      style={[styles.batchChip, isSelected && styles.batchChipActive]}
                      onPress={() => handleSelectBatch(batch)}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={14}
                        color={isSelected ? '#fff' : colors.success}
                      />
                      <Text style={[styles.batchChipText, isSelected && styles.batchChipTextActive]}>
                        {batch.batchCode || batch.id}
                      </Text>
                      <Text style={[styles.batchSub, isSelected && styles.batchSubActive]}>
                        {batch.honeyType}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Product Details Form */}
          <View style={styles.inputCard}>
            <Text style={styles.sectionHeading}>2. Listing Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Product Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Pure Wild Forest Raw Honey"
                placeholderTextColor={colors.textLight}
                value={productName}
                onChangeText={setProductName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Honey Variety</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Multiflora, Acacia, Jamun, Raw Forest"
                placeholderTextColor={colors.textLight}
                value={honeyType}
                onChangeText={setHoneyType}
              />
            </View>

            {/* Pack Size Selection */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Pack Size</Text>
              <View style={styles.packRow}>
                {PACK_SIZES.map((size) => {
                  const isSel = packSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      style={[styles.packChip, isSel && styles.packChipActive]}
                      onPress={() => setPackSize(size)}
                    >
                      <Text style={[styles.packText, isSel && styles.packTextActive]}>{size}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Price & Stock in a 2-col row */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Price (₹ INR) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="450"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Available Stock (Jars) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Product Description</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe floral notes, purity, and apiary highlights..."
                placeholderTextColor={colors.textLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {editingProduct ? 'Save Changes' : 'Publish to Market'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionTip: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  noBatchNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  noBatchText: {
    fontSize: 12,
    color: colors.primaryDark,
    flex: 1,
  },
  batchScroll: {
    marginTop: spacing.xs,
  },
  batchChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
    marginRight: spacing.xs,
    gap: 2,
  },
  batchChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  batchChipTextActive: {
    color: '#fff',
  },
  batchSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  batchSubActive: {
    color: '#fff',
    opacity: 0.85,
  },
  fieldGroup: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
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
    minHeight: 70,
    textAlignVertical: 'top',
  },
  packRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  packChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
  },
  packChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  packText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  packTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: typography.weight.bold,
  },
});
