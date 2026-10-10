
import React, { useState } from 'react';
import {
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Product } from '../types/sales';

const UNITS = ['pcs', 'dozen', 'box', 'pack', 'carton'] as const;
type Unit = (typeof UNITS)[number];

const UNIT_LABELS: Record<Unit, string> = {
  pcs: 'Pieces (pcs)',
  dozen: 'Dozen (12)',
  box: 'Box',
  pack: 'Pack',
  carton: 'Carton',
};

type ProductCardProps = {
  product: Product;
  quantity: number;
  unit: Unit;
  onQuantityChange: (qty: number) => void;
  onUnitChange: (unit: Unit) => void;
  onAddToCart: () => void;
  onToggleStock: () => void;
  onRemoveProduct: () => void;
};

export default function ProductCard({
  product,
  quantity,
  unit,
  onQuantityChange,
  onUnitChange,
  onAddToCart,
  onToggleStock,
  onRemoveProduct,
}: ProductCardProps) {
  const images: string[] =
    product.thumbnailUris?.length
      ? product.thumbnailUris
      : product.imageUri
      ? [product.imageUri]
      : [];
  const [selectedImage, setSelectedImage] = useState<string>(images[0] ?? '');
  const [qtyText, setQtyText] = useState<string>(String(quantity));
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showProductActions, setShowProductActions] = useState(false);

  const handleQtyBlur = () => {
    const parsed = parseInt(qtyText, 10);
    const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setQtyText(String(safe));
    onQuantityChange(safe);
  };

  const handleStep = (delta: number) => {
    const next = Math.max(0, quantity + delta);
    setQtyText(String(next));
    onQuantityChange(next);
  };

  React.useEffect(() => {
    setQtyText(String(quantity));
  }, [quantity]);

  return (
    <View style={styles.card}>
      {/* ── Image ── */}
      <View style={styles.imageSection}>
        {selectedImage ? (
          <Image
            resizeMode="contain"
            source={{ uri: selectedImage }}
            style={styles.mainImage}
          />
        ) : (
          <View style={styles.emptyImage} />
        )}
        {product.originalPrice ? (
          <Text style={styles.discountBadge}>SALE</Text>
        ) : null}
      </View>

      {/* ── Thumbnails ── */}
      {images.length > 1 && (
        <View style={styles.thumbnails}>
          {images.slice(0, 4).map((image, index) => (
            <TouchableOpacity
              key={`${image}-${index}`}
              onPress={() => setSelectedImage(image)}
              style={[styles.thumbnail, image === selectedImage && styles.activeThumbnail]}
            >
              <Image resizeMode="contain" source={{ uri: image }} style={styles.thumbnailImage} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Text info ── */}
      <View style={styles.info}>
        <Text style={styles.category}>{product.category}</Text>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>PHP {product.wholesalePrice.toFixed(2)}</Text>
          {product.originalPrice ? (
            <Text style={styles.originalPrice}>PHP {product.originalPrice.toFixed(2)}</Text>
          ) : null}
        </View>
      </View>

      {/* ── Unit picker button ── */}
      <TouchableOpacity
        onPress={() => setShowUnitModal(true)}
        style={styles.unitPickerBtn}
        activeOpacity={0.75}
      >
        <View style={styles.unitPickerLeft}>
          <Text style={styles.unitPickerLabel}>Unit</Text>
          <Text style={styles.unitPickerValue}>{unit}</Text>
        </View>
        <Text style={styles.unitPickerChevron}>▾</Text>
      </TouchableOpacity>

      {/* ── Quantity stepper ── */}
      <View style={styles.stepperRow}>
        <TouchableOpacity
          disabled={product.outOfStock}
          onPress={() => handleStep(-1)}
          style={[styles.stepBtn, product.outOfStock && styles.disabledBtn]}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>

        <TextInput
          editable={!product.outOfStock}
          keyboardType="number-pad"
          onChangeText={(text) => setQtyText(text.replace(/\D/g, ''))}
          onBlur={handleQtyBlur}
          style={[styles.qtyInput, product.outOfStock && styles.disabledInput]}
          value={qtyText}
          selectTextOnFocus
        />

        <TouchableOpacity
          disabled={product.outOfStock}
          onPress={() => handleStep(1)}
          style={[styles.stepBtn, product.outOfStock && styles.disabledBtn]}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* ── Footer actions ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          disabled={product.outOfStock}
          onPress={onAddToCart}
          style={[styles.cartBtn, product.outOfStock && styles.disabledBtn]}
        >
          <Text style={styles.cartBtnText}>ADD TO CART</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityHint="Opens options to change stock status or remove this product."
          accessibilityLabel="Product actions"
          onPress={() => setShowProductActions(true)}
          style={styles.clearBtn}
        >
          <Text style={styles.clearBtnText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* ── Unit Modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={showUnitModal}
        onRequestClose={() => setShowUnitModal(false)}
      >
        {/* Backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowUnitModal(false)}
          style={styles.modalBackdrop}
        >
          {/* Bottom sheet — stop touch propagation so tapping sheet doesn't close it */}
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Unit</Text>
            <Text style={styles.modalSub}>How do you want to measure this product?</Text>

            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => {
                  onUnitChange(u);
                  setShowUnitModal(false);
                }}
                style={[styles.unitOption, u === unit && styles.unitOptionActive]}
              >
                <View style={styles.unitOptionLeft}>
                  <View style={[styles.unitRadio, u === unit && styles.unitRadioActive]}>
                    {u === unit && <View style={styles.unitRadioDot} />}
                  </View>
                  <View>
                    <Text style={[styles.unitOptionLabel, u === unit && styles.unitOptionLabelActive]}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </Text>
                    <Text style={styles.unitOptionSub}>{UNIT_LABELS[u]}</Text>
                  </View>
                </View>
                {u === unit && <Text style={styles.unitCheckmark}>✓</Text>}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setShowUnitModal(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Product actions modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={showProductActions}
        onRequestClose={() => setShowProductActions(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowProductActions(false)}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Product actions</Text>
            <Text style={styles.modalSub}>{product.name}</Text>

            <TouchableOpacity
              onPress={() => {
                onToggleStock();
                setShowProductActions(false);
              }}
              style={styles.actionOption}
            >
              <Text style={styles.actionOptionTitle}>
                {product.outOfStock ? 'Mark as in stock' : 'Mark as out of stock'}
              </Text>
              <Text style={styles.actionOptionSub}>
                {product.outOfStock
                  ? 'Allow this product to be added to the cart.'
                  : 'Disable ordering for this product.'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowProductActions(false);
                onRemoveProduct();
              }}
              style={styles.removeOption}
            >
              <Text style={styles.removeOptionTitle}>Remove product</Text>
              <Text style={styles.removeOptionSub}>Delete this product from the list.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowProductActions(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    elevation: 6,
    margin: 8,
    maxWidth: 240,
    shadowColor: '#1B263B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    width: 240,
  },

  // ── Image ─────────────────────────────────────────────────────────
  imageSection: {
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: 170,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mainImage: {
    height: '100%',
    width: '100%',
  },
  emptyImage: { flex: 1, backgroundColor: '#F1F5F9' },

  discountBadge: {
    backgroundColor: '#FF7A00',
    borderBottomRightRadius: 8,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    left: 0,
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    top: 0,
  },
  // ── Thumbnails ────────────────────────────────────────────────────
  thumbnails: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thumbnail: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 36,
    width: 36,
  },
  activeThumbnail: { borderColor: '#FF7A00', borderWidth: 2 },
  thumbnailImage: { borderRadius: 4, height: 32, width: 32 },

  // ── Text info ─────────────────────────────────────────────────────
  info: { paddingHorizontal: 14, paddingTop: 12 },
  category: {
    color: '#FF7A00',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  name: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 2,
  },
  priceRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
  price: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  originalPrice: { color: '#94A3B8', fontSize: 12, textDecorationLine: 'line-through' },

  // ── Unit picker button ────────────────────────────────────────────
  unitPickerBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unitPickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unitPickerLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  unitPickerValue: {
    backgroundColor: '#1B263B',
    borderRadius: 5,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unitPickerChevron: { color: '#64748B', fontSize: 12 },

  // ── Quantity stepper ──────────────────────────────────────────────
  stepperRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 14,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepBtn: {
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 6,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  disabledBtn: { backgroundColor: '#CBD5E1' },
  stepBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', lineHeight: 20 },
  qtyInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 6,
    borderWidth: 1,
    color: '#0F172A',
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    height: 30,
    minWidth: 0,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  disabledInput: { backgroundColor: '#F1F5F9', color: '#94A3B8' },

  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  cartBtn: {
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderBottomColor: '#0F172A',
    borderBottomWidth: 3,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 10,
  },
  cartBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  clearBtn: {
    alignItems: 'center',
    backgroundColor: '#FFF1E6',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  clearBtnText: { color: '#FF7A00', fontSize: 22, fontWeight: '700' },

  actionOption: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  actionOptionTitle: { color: '#0F172A', fontSize: 14, fontWeight: '800' },
  actionOptionSub: { color: '#64748B', fontSize: 12, marginTop: 4 },
  removeOption: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  removeOptionTitle: { color: '#B91C1C', fontSize: 14, fontWeight: '800' },
  removeOptionSub: { color: '#DC2626', fontSize: 12, marginTop: 4 },

  // ── Unit modal (bottom sheet) ─────────────────────────────────────
  modalBackdrop: {
    backgroundColor: 'rgba(15,23,42,0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 460,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    height: 4,
    marginBottom: 14,
    width: 36,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  modalSub: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 14,
  },
  unitOption: {
    alignItems: 'center',
    borderColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  unitOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1B263B',
  },
  unitOptionLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  unitRadio: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  unitRadioActive: { borderColor: '#1B263B' },
  unitRadioDot: {
    backgroundColor: '#1B263B',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  unitOptionLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  unitOptionLabelActive: { color: '#1B263B' },
  unitOptionSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  unitCheckmark: {
    color: '#1B263B',
    fontSize: 14,
    fontWeight: '800',
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderBottomColor: '#0F172A',
    borderBottomWidth: 2,
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 42,
    paddingVertical: 10,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
