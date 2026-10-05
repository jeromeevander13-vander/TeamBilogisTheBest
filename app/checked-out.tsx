import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CheckedOutOrder } from '../types/sales';

const ORDERS_KEY = 'sari-sari-checked-out-orders';
const PAGE_SIZE = 5;

const formatDate = (date: string): string =>
  new Date(date).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function CheckedOutScreen() {
  const [orders, setOrders] = useState<CheckedOutOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async (): Promise<void> => {
    const saved = await AsyncStorage.getItem(ORDERS_KEY);
    setOrders(saved ? (JSON.parse(saved) as CheckedOutOrder[]) : []);
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const refreshOrders = async (): Promise<void> => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const toggleDelivered = async (orderId: number): Promise<void> => {
    const updatedOrders = orders.map((order) =>
      order.id === orderId
        ? { ...order, status: order.status === 'delivered' ? 'pending' as const : 'delivered' as const }
        : order
    );
    setOrders(updatedOrders);
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
  };

  const pageCount = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const visibleOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.list}
        data={visibleOrders}
        keyExtractor={(order) => String(order.id)}
        refreshControl={<RefreshControl onRefresh={refreshOrders} refreshing={refreshing} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No checked-out orders</Text>
            <Text style={styles.emptyText}>Completed orders will appear here.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isExpanded = expandedOrderId === item.id;
          const orderNumber = orders.length - ((page - 1) * PAGE_SIZE + index);

          return (
            <View style={styles.orderCard}>
              <TouchableOpacity
                accessibilityLabel={`Order ${orderNumber}`}
                onPress={() => setExpandedOrderId(isExpanded ? null : item.id)}
                style={styles.orderHeader}
              >
                <View>
                  <Text style={styles.orderNumber}>ORDER #{orderNumber}</Text>
                  <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                  <Text style={styles.customerPreview}>{item.customerName} · {item.storeName}</Text>
                </View>
                <View style={styles.orderHeaderRight}>
                  <Text style={styles.total}>PHP {item.total.toFixed(2)}</Text>
                  <Text style={[styles.status, item.status === 'delivered' && styles.deliveredStatus]}>
                    {item.status === 'delivered' ? 'DELIVERED' : 'PENDING'}
                  </Text>
                  <Text style={styles.expandIcon}>{isExpanded ? '▴' : '▾'}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View>
                  <View style={styles.details}>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                    <Text style={styles.detail}>{item.storeName}</Text>
                    <Text style={styles.detail}>{item.address}</Text>
                    <Text style={styles.detail}>{item.mobileNumber}</Text>
                  </View>

                  <View style={styles.productsSection}>
                    <Text style={styles.productsTitle}>Products ordered</Text>
                    {item.items.map((orderItem) => (
                      <View key={`${item.id}-${orderItem.product.id}`} style={styles.productRow}>
                        <Text numberOfLines={2} style={styles.productName}>
                          {orderItem.product.name}
                        </Text>
                        <Text style={styles.productQuantity}>
                          {orderItem.quantity} x PHP {orderItem.product.wholesalePrice.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => void toggleDelivered(item.id)}
                    style={[styles.deliveryButton, item.status === 'delivered' && styles.undoDeliveryButton]}
                  >
                    <Text style={styles.deliveryButtonText}>
                      {item.status === 'delivered' ? 'Mark as not delivered' : 'Mark as delivered'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          pageCount > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                disabled={page === 1}
                onPress={() => {
                  setPage((current) => Math.max(1, current - 1));
                  setExpandedOrderId(null);
                }}
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageLabel}>Page {page} of {pageCount}</Text>
              <TouchableOpacity
                disabled={page === pageCount}
                onPress={() => {
                  setPage((current) => Math.min(pageCount, current + 1));
                  setExpandedOrderId(null);
                }}
                style={[styles.pageButton, page === pageCount && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#EEF2F7', flex: 1 },
  list: { padding: 16, paddingBottom: 32 },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  orderHeader: {
    alignItems: 'flex-start',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  orderNumber: { color: '#0369A1', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  date: { color: '#64748B', fontSize: 11, marginTop: 4 },
  total: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  orderHeaderRight: { alignItems: 'flex-end', gap: 8 },
  expandIcon: { color: '#0369A1', fontSize: 18, fontWeight: '800' },
  customerPreview: { color: '#64748B', fontSize: 11, marginTop: 5 },
  status: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    color: '#92400E',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  deliveredStatus: { backgroundColor: '#DCFCE7', color: '#166534' },
  details: { paddingVertical: 14 },
  customerName: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  detail: { color: '#475569', fontSize: 13, marginTop: 4 },
  productsSection: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  productsTitle: { color: '#0F172A', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  productRow: {
    alignItems: 'center',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  productName: { color: '#334155', flex: 1, fontSize: 13, paddingRight: 8 },
  productQuantity: { color: '#0369A1', fontSize: 12, fontWeight: '700' },
  deliveryButton: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 9,
    marginTop: 12,
    paddingVertical: 12,
  },
  undoDeliveryButton: { backgroundColor: '#64748B' },
  deliveryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  pageButton: {
    backgroundColor: '#0369A1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pageButtonDisabled: { backgroundColor: '#CBD5E1' },
  pageButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pageLabel: { color: '#475569', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  emptyText: { color: '#64748B', fontSize: 14, marginTop: 8 },
});
