import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';

const PRODUCTS_STORAGE_KEY = '@honeychain_products_cache';

const INITIAL_DEFAULT_PRODUCTS = [
  {
    id: 'prod_cauvery_multi_500g',
    beekeeperUid: 'beekeeper_demo',
    apiaryName: 'Cauvery Honey Farm',
    sellerName: 'Ramesh Gowda',
    title: 'Raw Forest Multifloral Honey (500g)',
    honeyType: 'Multifloral',
    description: 'Cold-extracted, unprocessed raw honey harvested from Western Ghats flora. High pollen count and natural enzymes.',
    batchId: 'batch_demo_01',
    batchCode: 'HC-2026-8812',
    price: 380,
    currency: 'INR',
    packSize: '500g',
    unit: 'jar',
    stock: 24,
    isPublished: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.9,
    photoUrl: null,
    originLocation: 'Kodagu, Karnataka',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_mysuru_jamun_500g',
    beekeeperUid: 'beekeeper_demo',
    apiaryName: 'Mysuru Native Apiaries',
    sellerName: 'Suresh Kumar',
    title: 'Pure Jamun Blossom Honey (500g)',
    honeyType: 'Jamun',
    description: 'Mono-floral honey harvested during Jamun flowering season. Distinct dark color and mild bitter-sweet herbal profile.',
    batchId: 'batch_demo_02',
    batchCode: 'HC-2026-9430',
    price: 450,
    currency: 'INR',
    packSize: '500g',
    unit: 'jar',
    stock: 18,
    isPublished: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.8,
    photoUrl: null,
    originLocation: 'Mysuru, Karnataka',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_shimoga_mustard_1kg',
    beekeeperUid: 'beekeeper_demo',
    apiaryName: 'Malnad Organic Apiary',
    sellerName: 'Manjunath Hegde',
    title: 'Pure Mustard Honey Crystallized (1kg)',
    honeyType: 'Mustard',
    description: 'Naturally creamy and fast-crystallizing raw mustard honey. Harvested from pesticide-free organic mustard fields.',
    batchId: 'batch_demo_03',
    batchCode: 'HC-2026-5519',
    price: 680,
    currency: 'INR',
    packSize: '1kg',
    unit: 'jar',
    stock: 12,
    isPublished: true,
    deliveryAvailable: true,
    pickupAvailable: false,
    rating: 5.0,
    photoUrl: null,
    originLocation: 'Shimoga, Karnataka',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function getCachedProducts() {
  try {
    const raw = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

async function saveCachedProducts(products) {
  try {
    await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  } catch (_) {}
}

/**
 * Fetch all published honey products for customer exploration
 */
export async function getPublishedProducts() {
  const cached = await getCachedProducts();

  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('isPublished', '==', true));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const remote = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      await saveCachedProducts(remote);
      return remote;
    }
  } catch (err) {
    console.log('[ProductService] Cloud products fetch fallback to cached/default:', err?.message);
  }

  if (cached.length > 0) {
    return cached.filter((p) => p.isPublished);
  }

  // Seed default products into local cache
  await saveCachedProducts(INITIAL_DEFAULT_PRODUCTS);
  return INITIAL_DEFAULT_PRODUCTS;
}

/**
 * Real-time subscription to published products in marketplace
 */
export function subscribeToPublishedProducts(onUpdate, onError) {
  let isSubscribed = true;

  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('isPublished', '==', true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        if (list.length > 0) {
          saveCachedProducts(list);
          onUpdate(list);
        } else {
          // If Firestore collection empty, use local
          getCachedProducts().then((cached) => {
            const result = cached.length > 0 ? cached : INITIAL_DEFAULT_PRODUCTS;
            onUpdate(result);
          });
        }
      },
      (err) => {
        console.log('[ProductService] Snapshot notice, falling back to cache:', err?.message);
        getCachedProducts().then((cached) => {
          const result = cached.length > 0 ? cached : INITIAL_DEFAULT_PRODUCTS;
          onUpdate(result);
        });
        if (onError) onError(err);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  } catch (e) {
    getCachedProducts().then((cached) => {
      onUpdate(cached.length > 0 ? cached : INITIAL_DEFAULT_PRODUCTS);
    });
    return () => {};
  }
}

/**
 * Fetch products published by a specific beekeeper
 */
export async function getBeekeeperProducts(beekeeperUid) {
  if (!beekeeperUid) return [];

  const cached = await getCachedProducts();
  const beekeeperCached = cached.filter((p) => p.beekeeperUid === beekeeperUid);

  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('beekeeperUid', '==', beekeeperUid));
    const snap = await getDocs(q);

    if (!snap.empty) {
      return snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    }
  } catch (err) {
    console.log('[ProductService] Beekeeper products cloud fallback:', err?.message);
  }

  return beekeeperCached.length > 0
    ? beekeeperCached
    : INITIAL_DEFAULT_PRODUCTS.filter((p) => p.beekeeperUid === beekeeperUid || beekeeperUid === 'beekeeper_demo');
}

/**
 * Publish a new honey product listing from a harvest batch
 */
export async function publishProduct(beekeeperUid, productData) {
  if (!beekeeperUid) throw new Error('Beekeeper authentication required.');
  if (!productData.title || !productData.price) {
    throw new Error('Product title and price are required.');
  }

  const newId = `prod_${Date.now()}`;
  const payload = {
    id: newId,
    beekeeperUid,
    apiaryName: productData.apiaryName || 'My Apiary',
    sellerName: productData.sellerName || 'Verified Beekeeper',
    title: productData.title.trim(),
    honeyType: productData.honeyType || 'Pure Honey',
    description: productData.description?.trim() || '',
    batchId: productData.batchId || null,
    batchCode: productData.batchCode || 'HC-VERIFIED',
    price: Number(productData.price) || 0,
    currency: 'INR',
    packSize: productData.packSize || '500g',
    unit: 'jar',
    stock: Number(productData.stock) || 0,
    isPublished: productData.isPublished !== undefined ? Boolean(productData.isPublished) : true,
    deliveryAvailable: Boolean(productData.deliveryAvailable ?? true),
    pickupAvailable: Boolean(productData.pickupAvailable ?? true),
    rating: 5.0,
    photoUrl: productData.photoUrl || null,
    originLocation: productData.originLocation || 'Karnataka, India',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Update local cache immediately
  const currentCached = await getCachedProducts();
  const updatedList = [payload, ...currentCached];
  await saveCachedProducts(updatedList);

  // 2. Sync to cloud Firestore
  try {
    const docRef = doc(db, 'products', newId);
    await setDoc(docRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.log('[ProductService] Product saved locally (cloud sync deferred):', err?.message);
  }

  return payload;
}

/**
 * Update product inventory or publishing details
 */
export async function updateProduct(productId, updates) {
  if (!productId) throw new Error('Product ID is required.');

  const currentCached = await getCachedProducts();
  const updatedList = currentCached.map((p) =>
    p.id === productId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
  );
  await saveCachedProducts(updatedList);

  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.log('[ProductService] Product update saved locally:', err?.message);
  }

  return updatedList.find((p) => p.id === productId);
}

/**
 * Delete a product listing
 */
export async function deleteProduct(productId) {
  if (!productId) throw new Error('Product ID is required.');

  const currentCached = await getCachedProducts();
  const updatedList = currentCached.filter((p) => p.id !== productId);
  await saveCachedProducts(updatedList);

  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.log('[ProductService] Product delete locally updated:', err?.message);
  }

  return true;
}

export default {
  getPublishedProducts,
  subscribeToPublishedProducts,
  getBeekeeperProducts,
  publishProduct,
  updateProduct,
  deleteProduct,
};
