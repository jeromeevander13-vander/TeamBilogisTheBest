import React, { useEffect, useRef, useState } from 'react';
import { Image, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

type Category = { name: string; imageUri?: string };
const CATEGORY_PAGE_SIZE = 10;

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

export default function CategoryScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  // Category card is width:250 + 2×margin:8 = 266
  const numColumns = Math.max(1, Math.min(4, Math.floor(screenWidth / 266)));
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryPage, setCategoryPage] = useState<number>(0);
  const [name, setName] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [imageUri, setImageUri] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loaded, setLoaded] = useState<boolean>(false);
  const categoriesListRef = useRef<FlatList<Category>>(null);

  useEffect(() => {
    const loadCategories = async (): Promise<void> => {
      const saved = await AsyncStorage.getItem('sari-sari-categories');
      if (saved) {
        const oldData = JSON.parse(saved) as Array<string | Category>;
        setCategories(oldData.map((item) => typeof item === 'string' ? { name: item } : item));
      }
      setLoaded(true);
    };
    void loadCategories();
  }, []);

  useEffect(() => {
    if (loaded) void AsyncStorage.setItem('sari-sari-categories', JSON.stringify(categories));
  }, [categories, loaded]);

  const chooseImage = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) {
      const permanentUri = await makeImagePermanent(result.assets[0].uri);
      setImageUri(permanentUri);
    }
  };

  const addCategory = (): void => {
    const cleanName = name.trim();
    if (!cleanName) { setMessage('Enter a category name.'); return; }
    if (categories.some((category) => category.name.toLowerCase() === cleanName.toLowerCase())) { setMessage('Category already exists.'); return; }
    setCategories([...categories, { name: cleanName, imageUri: imageUri || undefined }]);
    setName(''); setImageUri(''); setMessage('Category added.');
  };

  const deleteCategory = (categoryName: string): void => {
    setCategories(categories.filter((category) => category.name !== categoryName));
    setMessage('Category deleted.');
  };

  const visibleCategories = categories.filter((category) => category.name.toLowerCase().includes(search.toLowerCase()));
  const categoryPageCount = Math.ceil(visibleCategories.length / CATEGORY_PAGE_SIZE);
  const visibleCategoryPage = Math.min(categoryPage, Math.max(0, categoryPageCount - 1));
  const pageCategories = visibleCategories.slice(
    visibleCategoryPage * CATEGORY_PAGE_SIZE,
    (visibleCategoryPage + 1) * CATEGORY_PAGE_SIZE
  );

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        key={`cat-grid-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.list}
        data={pageCategories}
        keyExtractor={(category) => category.name}
        ListEmptyComponent={<Text style={styles.empty}>No categories yet. Add your first category above.</Text>}
        ref={categoriesListRef}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>FIELD SALES</Text>
              <Text style={styles.title}>Product Categories</Text>
              <Text style={styles.description}>Select a category to manage products and take orders.</Text>
            </View>
            <TextInput onChangeText={(text) => { setSearch(text); setCategoryPage(0); categoriesListRef.current?.scrollToOffset({ offset: 0, animated: false }); }} placeholder="Search categories" placeholderTextColor="#94A3B8" style={styles.search} value={search} />
            <View style={styles.form}>
              <TextInput onChangeText={setName} placeholder="New category name" placeholderTextColor="#94A3B8" style={styles.input} value={name} />
              <TouchableOpacity onPress={chooseImage} style={styles.secondaryButton}><Text style={styles.secondaryText}>{imageUri ? 'Photo selected' : 'Add category photo'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={addCategory} style={styles.primaryButton}><Text style={styles.primaryText}>Add Category</Text></TouchableOpacity>
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
          </View>
        }
        numColumns={numColumns}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/order', params: { category: item.name } })} style={styles.categoryInfo}>
              {item.imageUri ? <Image resizeMode="contain" source={{ uri: item.imageUri }} style={styles.categoryImage} /> : <View style={styles.categoryImagePlaceholder} />}
              <View style={styles.categoryContent}>
                <Text style={styles.categoryName}>{item.name}</Text>
                <Text style={styles.categoryAction}>CATEGORY</Text>
                <View style={styles.viewButton}><Text style={styles.viewButtonText}>VIEW PRODUCTS</Text></View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={`Delete ${item.name}`} onPress={() => deleteCategory(item.name)} style={styles.deleteButton}>
              <Text style={styles.deleteText}>x</Text>
            </TouchableOpacity>
          </View>
        )}
        style={styles.listView}
      />
      {categoryPageCount > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            accessibilityLabel="Previous category page"
            disabled={visibleCategoryPage === 0}
            onPress={() => {
              setCategoryPage(visibleCategoryPage - 1);
              categoriesListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={[styles.paginationButton, visibleCategoryPage === 0 && styles.paginationButtonDisabled]}
          >
            <Text style={styles.paginationButtonText}>‹ Previous</Text>
          </TouchableOpacity>
          <Text style={styles.paginationLabel}>Page {visibleCategoryPage + 1} of {categoryPageCount}</Text>
          <TouchableOpacity
            accessibilityLabel="Next category page"
            disabled={visibleCategoryPage === categoryPageCount - 1}
            onPress={() => {
              setCategoryPage(visibleCategoryPage + 1);
              categoriesListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={[styles.paginationButton, visibleCategoryPage === categoryPageCount - 1 && styles.paginationButtonDisabled]}
          >
            <Text style={styles.paginationButtonText}>Next ›</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Screen ────────────────────────────────────────────────────────
  screen: { backgroundColor: '#EEF2F7', flex: 1 },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#0F172A',
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  eyebrow: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginTop: 6,
  },
  description: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },

  // ── Search ───────────────────────────────────────────────────────
  search: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 14,
    marginBottom: 12,
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: '#1B263B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── Add-category form ────────────────────────────────────────────
  form: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 20,
    padding: 18,
    shadowColor: '#1B263B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
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

  // ── Grid layout ───────────────────────────────────────────────────
  list: { paddingBottom: 32, paddingHorizontal: 16, paddingTop: 8 },
  listView: { flex: 1, width: '100%' },
  columnWrapper: { justifyContent: 'center' },
  pagination: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  paginationButton: {
    alignItems: 'center',
    backgroundColor: '#0369A1',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 96,
    paddingHorizontal: 12,
  },
  paginationButtonDisabled: { backgroundColor: '#94A3B8' },
  paginationButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  paginationLabel: { color: '#475569', fontSize: 13, fontWeight: '700' },

  // ── Category card ─────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 320,
    margin: 8,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#1B263B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 8,
    width: 250,
  },
  categoryInfo: { flex: 1 },

  // Image
  categoryImage: {
    backgroundColor: '#F1F5F9',
    height: 170,
    width: '100%',
  },
  categoryImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    height: 170,
    justifyContent: 'center',
    width: '100%',
  },

  // Text block
  categoryContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 14,
  },
  categoryName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  categoryAction: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '800',
    alignSelf: 'flex-start',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // CTA
  viewButton: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderBottomColor: '#000000',
    borderBottomWidth: 3,
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 42,
    padding: 10,
  },
  viewButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  // Delete button
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 30,
    zIndex: 2,
  },
  deleteText: { color: '#DC2626', fontSize: 16, fontWeight: '800', lineHeight: 18 },

  // Empty state
  empty: {
    color: '#64748B',
    fontSize: 15,
    paddingTop: 32,
    textAlign: 'center',
  },
});
