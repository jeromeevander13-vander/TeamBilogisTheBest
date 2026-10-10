import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import ProductCard from '../components/ProductCard';
import type { CheckedOutOrder, OrderItem, Product, StoreDetailRouteParams } from '../types/sales';

type Unit = 'pcs' | 'dozen' | 'box' | 'pack' | 'carton';

const CARD_WIDTH = 240 + 16;
const CART_PAGE_SIZE = 10;
const PRODUCT_PAGE_SIZE = 10;

const makeImagePermanent = async (uri: string): Promise<string> => {
  if (!uri.startsWith('blob:')) return uri;
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not save the image.'));
    reader.readAsDataURL(blob);
  });
};

export default function OrderScreen() {
  const params = useLocalSearchParams<StoreDetailRouteParams>();
  const router = useRouter();
  const category = params.category || 'Products';
  const { width: screenWidth } = useWindowDimensions();

  // Compute centred column count — min 1, max 4
  const numColumns = Math.max(1, Math.min(4, Math.floor(screenWidth / CARD_WIDTH)));

  const [products, setProducts] = useState<Product[]>([]);
  const [draftQuantities, setDraftQuantities] = useState<Record<number, number>>({});
  const [draftUnits, setDraftUnits] = useState<Record<number, Unit>>({});
  const [cartQuantities, setCartQuantities] = useState<Record<number, number>>({});
  const [cartUnits, setCartUnits] = useState<Record<number, Unit>>({});
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [imageUri, setImageUri] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [productsLoaded, setProductsLoaded] = useState<boolean>(false);
  const [showCart, setShowCart] = useState<boolean>(false);
  const [productPage, setProductPage] = useState<number>(0);
  const [cartPage, setCartPage] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [storeAddress, setStoreAddress] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');

  const cartScrollRef = useRef<ScrollView>(null);
  const productsListRef = useRef<FlatList<Product>>(null);


  const badgeBounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadProducts = async (): Promise<void> => {
      const saved = await AsyncStorage.getItem('sari-sari-products');
      if (saved) setProducts(JSON.parse(saved) as Product[]);
      setProductsLoaded(true);
    };
    void loadProducts();
  }, []);

  useEffect(() => {
    setProductPage(0);
  }, [category]);

  useEffect(() => {
    if (productsLoaded) {
      void AsyncStorage.setItem('sari-sari-products', JSON.stringify(products));
    }
  }, [products, productsLoaded]);

  const chooseImage = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const permanentUri = await makeImagePermanent(result.assets[0].uri);
      setImageUri(permanentUri);
    }
  };

  const addProduct = (): void => {
    const numberPrice = Number(price);
    if (!name.trim() || !price.trim() || Number.isNaN(numberPrice) || numberPrice <= 0) {
      setMessage('Enter a product name and valid price.');
      return;
    }
    const product: Product = {
      id: Date.now(),
      name: name.trim(),
      category,
      wholesalePrice: numberPrice,
      imageUri: imageUri || undefined,
    };
    setProducts([...products, product]);
    setName('');
    setPrice('');
    setImageUri('');
    setMessage('Product added.');
  };

  const setDraftQuantity = (product: Product, qty: number): void => {
    setDraftQuantities((prev) => ({ ...prev, [product.id]: Math.max(0, qty) }));
  };

  const setDraftUnit = (product: Product, unit: Unit): void => {
    setDraftUnits((prev) => ({ ...prev, [product.id]: unit }));
  };

  const animateBadge = (): void => {
    Animated.sequence([
      Animated.spring(badgeBounce, { toValue: 1.5, useNativeDriver: false, speed: 30 }),
      Animated.spring(badgeBounce, { toValue: 1, useNativeDriver: false, speed: 20 }),
    ]).start();
  };

  const addToCart = (product: Product): void => {
    const quantity = draftQuantities[product.id] || 0;
    const unit: Unit = draftUnits[product.id] || 'pcs';
    if (quantity === 0) {
      Alert.alert('Choose a quantity', `Set a quantity for "${product.name}" before adding to cart.`);
      return;
    }
    setCartQuantities((prev) => ({ ...prev, [product.id]: quantity }));
    setCartUnits((prev) => ({ ...prev, [product.id]: unit }));
    animateBadge();
    Alert.alert(
      '✅ Added to cart!',
      `${product.name} — ${quantity} ${unit}`,
      [{ text: 'OK' }]
    );
  };

  const removeProduct = (product: Product): void => {
    setProducts((prev) => prev.filter((item) => item.id !== product.id));
    setDraftQuantities((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    setDraftUnits((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    setCartQuantities((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    setCartUnits((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
  };

  const clearProductFromCart = (product: Product): void => {
    setCartQuantities((prev) => ({ ...prev, [product.id]: 0 }));
  };

  const adjustCartQuantity = (product: Product, amount: number): void => {
    const current = cartQuantities[product.id] || 0;
    const next = Math.max(0, current + amount);
    setCartQuantities((prev) => ({ ...prev, [product.id]: next }));
  };

  const setCartQuantityDirect = (product: Product, qty: number): void => {
    setCartQuantities((prev) => ({ ...prev, [product.id]: Math.max(0, qty) }));
  };

  const categoryProducts = products.filter((p) => p.category === category);
  const productPageCount = Math.ceil(categoryProducts.length / PRODUCT_PAGE_SIZE);
  const visibleProductPage = Math.min(productPage, Math.max(0, productPageCount - 1));
  const visibleCategoryProducts = categoryProducts.slice(
    visibleProductPage * PRODUCT_PAGE_SIZE,
    (visibleProductPage + 1) * PRODUCT_PAGE_SIZE
  );

  const orderItems: OrderItem[] = categoryProducts
    .map((product) => ({ product, quantity: cartQuantities[product.id] || 0 }))
    .filter((item) => item.quantity > 0);

  const cartPageCount = Math.ceil(orderItems.length / CART_PAGE_SIZE);
  const visibleCartPage = Math.min(cartPage, Math.max(0, cartPageCount - 1));
  const visibleOrderItems = orderItems.slice(
    visibleCartPage * CART_PAGE_SIZE,
    (visibleCartPage + 1) * CART_PAGE_SIZE
  );

  const total = orderItems.reduce(
    (sum, item) => sum + item.product.wholesalePrice * item.quantity,
    0
  );
  const cartCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const confirmOrder = async (): Promise<void> => {
    if (total === 0) {
      Alert.alert('Empty cart', 'Add items to the cart before checking out.');
      return;
    }
    if (!customerName.trim() || !storeName.trim() || !storeAddress.trim() || !mobileNumber.trim()) {
      Alert.alert('Missing customer details', 'Enter the customer name, store name, address, and mobile number.');
      return;
    }
    const checkout: CheckedOutOrder = {
      id: Date.now(),
      customerName: customerName.trim(),
      storeName: storeName.trim(),
      address: storeAddress.trim(),
      mobileNumber: mobileNumber.trim(),
      items: orderItems,
      total,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    try {
      const saved = await AsyncStorage.getItem('sari-sari-checked-out-orders');
      const orders = saved ? (JSON.parse(saved) as CheckedOutOrder[]) : [];
      await AsyncStorage.setItem(
        'sari-sari-checked-out-orders',
        JSON.stringify([checkout, ...orders])
      );
      setCartQuantities({});
      setCartUnits({});
      setDraftQuantities({});
      setCustomerName('');
      setStoreName('');
      setStoreAddress('');
      setMobileNumber('');
      setShowCart(false);
      Alert.alert(
        'Order Confirmed!',
        `Your order of PHP ${total.toFixed(2)} has been saved in Checked Out.`
      );
    } catch {
      Alert.alert('Checkout failed', 'The order could not be saved. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* ── Top bar with cart icon ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.eyebrow}>ORDER MANAGEMENT</Text>
          <Text style={styles.title}>{category}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCart(true)} style={styles.cartIconBtn}>
          <Text style={styles.cartIconEmoji}>🛒</Text>
          {cartCount > 0 && (
            <Animated.View style={[styles.cartBadge, { transform: [{ scale: badgeBounce }] }]}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/checked-out')} style={styles.historyBtn}>
          <Text style={styles.historyBtnText}>CHECKED OUT</Text>
        </TouchableOpacity>
      </View>

      {/* ── Product grid ── */}
      <FlatList
        key={`grid-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.list}
        data={visibleCategoryProducts}
        keyExtractor={(product) => String(product.id)}
        ListEmptyComponent={<Text style={styles.empty}>No products in this category yet.</Text>}
        ListHeaderComponent={
          <View style={styles.form}>
            <Text style={styles.formTitle}>Add a Product</Text>
            <TextInput
              onChangeText={setName}
              placeholder="Product name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={name}
            />
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(text) => {
                const sanitized = text.replace(/[^\d.]/g, '');
                const decimalIndex = sanitized.indexOf('.');
                setPrice(
                  decimalIndex === -1
                    ? sanitized
                    : `${sanitized.slice(0, decimalIndex + 1)}${sanitized
                        .slice(decimalIndex + 1)
                        .replace(/\./g, '')}`
                );
              }}
              placeholder="Wholesale price"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={price}
            />
            <TouchableOpacity onPress={chooseImage} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>
                {imageUri ? '✅ Photo selected' : '📷 Add product photo'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={addProduct} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Add Product</Text>
            </TouchableOpacity>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        }
        numColumns={numColumns}
        ref={productsListRef}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            quantity={draftQuantities[item.id] || 0}
            unit={draftUnits[item.id] || 'pcs'}
            onQuantityChange={(qty) => setDraftQuantity(item, qty)}
            onUnitChange={(unit) => setDraftUnit(item, unit)}
            onAddToCart={() => addToCart(item)}
            onToggleStock={() =>
              setProducts((prev) =>
                prev.map((product) =>
                  product.id === item.id
                    ? { ...product, outOfStock: !product.outOfStock }
                    : product
                )
              )
            }
            onRemoveProduct={() => removeProduct(item)}
          />
        )}
        style={styles.productListView}
      />
      {productPageCount > 1 && (
        <View style={styles.productPagination}>
          <TouchableOpacity
            accessibilityLabel="Previous product page"
            disabled={visibleProductPage === 0}
            onPress={() => {
              setProductPage(visibleProductPage - 1);
              productsListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={[styles.productPageButton, visibleProductPage === 0 && styles.productPageButtonDisabled]}
          >
            <Text style={styles.productPageButtonText}>‹ Previous</Text>
          </TouchableOpacity>
          <Text style={styles.productPageLabel}>Page {visibleProductPage + 1} of {productPageCount}</Text>
          <TouchableOpacity
            accessibilityLabel="Next product page"
            disabled={visibleProductPage === productPageCount - 1}
            onPress={() => {
              setProductPage(visibleProductPage + 1);
              productsListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={[styles.productPageButton, visibleProductPage === productPageCount - 1 && styles.productPageButtonDisabled]}
          >
            <Text style={styles.productPageButtonText}>Next ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Cart Modal ── */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowCart(false)}
        transparent={false}
        visible={showCart}
      >
        <SafeAreaView style={styles.modalScreen}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>YOUR SELECTION</Text>
              <Text style={styles.modalTitle}>Cart</Text>
            </View>
            <TouchableOpacity onPress={() => setShowCart(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {orderItems.length === 0 ? (
            <View style={styles.emptyCartContainer}>
              <Text style={styles.emptyCartEmoji}>🛒</Text>
              <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
              <Text style={styles.emptyCartSub}>Go back and add products to get started.</Text>
              <TouchableOpacity onPress={() => setShowCart(false)} style={styles.goShoppingBtn}>
                <Text style={styles.goShoppingText}>Browse Products</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView
                contentContainerStyle={styles.cartList}
                ref={cartScrollRef}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.customerForm}>
                  <Text style={styles.customerFormTitle}>Customer and store details</Text>
                  <TextInput
                    onChangeText={setCustomerName}
                    placeholder="Customer name"
                    placeholderTextColor="#94A3B8"
                    style={styles.cartInput}
                    value={customerName}
                  />
                  <TextInput
                    onChangeText={setStoreName}
                    placeholder="Store name"
                    placeholderTextColor="#94A3B8"
                    style={styles.cartInput}
                    value={storeName}
                  />
                  <TextInput
                    onChangeText={setStoreAddress}
                    placeholder="Store address"
                    placeholderTextColor="#94A3B8"
                    style={styles.cartInput}
                    value={storeAddress}
                  />
                  <TextInput
                    keyboardType="phone-pad"
                    onChangeText={(text) => setMobileNumber(text.replace(/\D/g, ''))}
                    placeholder="Mobile number"
                    placeholderTextColor="#94A3B8"
                    style={styles.cartInput}
                    value={mobileNumber}
                  />
                </View>
                {visibleOrderItems.map((item) => {
                  const itemUnit = cartUnits[item.product.id] || 'pcs';
                  return (
                    <View key={item.product.id} style={styles.cartRow}>
                      {/* Product info */}
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName} numberOfLines={2}>
                          {item.product.name}
                        </Text>
                        <Text style={styles.cartItemPrice}>
                          PHP {item.product.wholesalePrice.toFixed(2)} / {itemUnit}
                        </Text>
                      </View>

                      {/* Quantity stepper + manual input */}
                      <View style={styles.cartStepper}>
                        <TouchableOpacity
                          onPress={() => adjustCartQuantity(item.product, -1)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>−</Text>
                        </TouchableOpacity>
                        <TextInput
                          keyboardType="number-pad"
                          onChangeText={(t) => {
                            const digits = t.replace(/\D/g, '');
                            const n = parseInt(digits, 10);
                            setCartQuantityDirect(item.product, isNaN(n) ? 0 : n);
                          }}
                          style={styles.stepperInput}
                          value={String(item.quantity)}
                          selectTextOnFocus
                        />
                        <TouchableOpacity
                          onPress={() => adjustCartQuantity(item.product, 1)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperUnit}>{itemUnit}</Text>
                      </View>

                      {/* Row total + remove */}
                      <View style={styles.cartRowRight}>
                        <Text style={styles.cartRowTotal}>
                          PHP {(item.product.wholesalePrice * item.quantity).toFixed(2)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => clearProductFromCart(item.product)}
                          style={styles.removeBtn}
                        >
                          <Text style={styles.removeBtnText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {cartPageCount > 1 && (
                <View style={styles.cartPagination}>
                  <TouchableOpacity
                    accessibilityLabel="Previous cart page"
                    disabled={visibleCartPage === 0}
                    onPress={() => {
                      setCartPage(visibleCartPage - 1);
                      cartScrollRef.current?.scrollTo({ y: 0, animated: true });
                    }}
                    style={[
                      styles.cartPageButton,
                      visibleCartPage === 0 && styles.cartPageButtonDisabled,
                    ]}
                  >
                    <Text style={styles.cartPageButtonText}>‹ Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.cartPageLabel}>
                    Page {visibleCartPage + 1} of {cartPageCount}
                  </Text>
                  <TouchableOpacity
                    accessibilityLabel="Next cart page"
                    disabled={visibleCartPage === cartPageCount - 1}
                    onPress={() => {
                      setCartPage(visibleCartPage + 1);
                      cartScrollRef.current?.scrollTo({ y: 0, animated: true });
                    }}
                    style={[
                      styles.cartPageButton,
                      visibleCartPage === cartPageCount - 1 && styles.cartPageButtonDisabled,
                    ]}
                  >
                    <Text style={styles.cartPageButtonText}>Next ›</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Order summary + checkout */}
              <View style={styles.checkoutPanel}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items</Text>
                  <Text style={styles.summaryValue}>{orderItems.length} product(s)</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Amount</Text>
                  <Text style={styles.summaryTotal}>PHP {total.toFixed(2)}</Text>
                </View>
                <TouchableOpacity onPress={confirmOrder} style={styles.checkoutBtn}>
                  <Text style={styles.checkoutBtnText}>Checkout  →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#EEF2F7', flex: 1 },

  // ── Top bar ───────────────────────────────────────────────────────
  topBar: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  topBarLeft: { flex: 1 },
  eyebrow: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    marginTop: 4,
  },

  // ── Cart icon ─────────────────────────────────────────────────────
  cartIconBtn: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    marginLeft: 12,
    position: 'relative',
    width: 52,
  },
  cartIconEmoji: { fontSize: 28 },
  historyBtn: {
    borderColor: '#38BDF8',
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  historyBtnText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  cartBadge: {
    alignItems: 'center',
    backgroundColor: '#FF7A00',
    borderColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 3,
    position: 'absolute',
    right: 0,
    top: 2,
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  // ── Product grid ──────────────────────────────────────────────────
  list: { paddingBottom: 32, paddingHorizontal: 16, paddingTop: 16 },
  productListView: { flex: 1 },
  productPagination: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  productPageButton: {
    alignItems: 'center',
    backgroundColor: '#0369A1',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 96,
    paddingHorizontal: 12,
  },
  productPageButtonDisabled: { backgroundColor: '#94A3B8' },
  productPageButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  productPageLabel: { color: '#475569', fontSize: 13, fontWeight: '700' },
  // Center cards in each row; gap handled by card margin
  columnWrapper: {
    justifyContent: 'center',
    marginBottom: 0,
  },
  empty: { color: '#64748B', fontSize: 15, paddingTop: 32, textAlign: 'center' },

  // ── Add product form ──────────────────────────────────────────────
  form: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    padding: 18,
    shadowColor: '#1B263B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 14,
    marginBottom: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0369A1',
    borderBottomColor: '#024f7a',
    borderBottomWidth: 3,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 48,
    padding: 12,
  },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#0369A1',
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 48,
    padding: 12,
  },
  secondaryText: { color: '#0369A1', fontSize: 14, fontWeight: '700' },
  message: {
    color: '#0369A1',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },

  // ── Cart modal ────────────────────────────────────────────────────
  modalScreen: { backgroundColor: '#EEF2F7', flex: 1 },
  modalHeader: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  modalEyebrow: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  modalTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 4 },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // ── Empty cart ────────────────────────────────────────────────────
  emptyCartContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 40,
  },
  emptyCartEmoji: { fontSize: 64, marginBottom: 16 },
  emptyCartTitle: { color: '#0F172A', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyCartSub: { color: '#64748B', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  goShoppingBtn: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  goShoppingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // ── Cart rows ─────────────────────────────────────────────────────
  cartList: { padding: 16, paddingBottom: 8 },
  cartPagination: {
    alignItems: 'center',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cartPageButton: {
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 96,
    paddingHorizontal: 12,
  },
  cartPageButtonDisabled: { backgroundColor: '#94A3B8' },
  cartPageButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  cartPageLabel: { color: '#475569', fontSize: 13, fontWeight: '700' },
  customerForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    padding: 14,
  },
  customerFormTitle: { color: '#0F172A', fontSize: 14, fontWeight: '800', marginBottom: 10 },
  cartInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 13,
    marginBottom: 8,
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  cartRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    elevation: 3,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#1B263B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { color: '#0F172A', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  cartItemPrice: { color: '#64748B', fontSize: 12, marginTop: 3 },

  cartStepper: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  stepperBtn: {
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepperBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', lineHeight: 20 },
  stepperInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 6,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    height: 32,
    minWidth: 40,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  stepperUnit: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginLeft: 2,
  },

  cartRowRight: { alignItems: 'flex-end', gap: 6 },
  cartRowTotal: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
  removeBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeBtnText: { color: '#DC2626', fontSize: 11, fontWeight: '700' },

  // ── Checkout panel ────────────────────────────────────────────────
  checkoutPanel: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    elevation: 10,
    padding: 20,
    shadowColor: '#1B263B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: { color: '#64748B', fontSize: 14 },
  summaryValue: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  summaryTotal: { color: '#16A34A', fontSize: 20, fontWeight: '800' },
  checkoutBtn: {
    alignItems: 'center',
    backgroundColor: '#FF7A00',
    borderBottomColor: '#c45f00',
    borderBottomWidth: 3,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 54,
    paddingVertical: 14,
  },
  checkoutBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
