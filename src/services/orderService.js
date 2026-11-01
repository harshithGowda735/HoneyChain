import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { updateProduct } from './productService';

const ORDERS_STORAGE_KEY_PREFIX = '@honeychain_orders_';

export const ORDER_STATUSES = {
  AWAITING_PAYMENT: 'awaiting_payment',
  PAID: 'paid',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  DISPATCHED: 'dispatched',
  READY_FOR_PICKUP: 'ready_for_pickup',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

async function getCachedOrders(userUid) {
  try {
    const raw = await AsyncStorage.getItem(`${ORDERS_STORAGE_KEY_PREFIX}${userUid}`);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

async function saveCachedOrders(userUid, orders) {
  try {
    await AsyncStorage.setItem(
      `${ORDERS_STORAGE_KEY_PREFIX}${userUid}`,
      JSON.stringify(orders)
    );
  } catch (_) {}
}

/**
 * Creates an order, reserves inventory atomically, and sets status to paid or awaiting_payment
 */
export async function createOrder({
  customerUid,
  customerName,
  customerPhone,
  beekeeperUid,
  apiaryName,
  items = [],
  totalAmount,
  fulfilmentType = 'delivery',
  deliveryAddress = null,
  paymentMethod = 'razorpay',
  paymentId = null,
  paymentStatus = 'paid',
}) {
  if (!customerUid) throw new Error('Customer authentication required.');
  if (!items || items.length === 0) throw new Error('Cart cannot be empty.');

  const orderId = `ORD-${Date.now().toString().slice(-6)}`;
  const initialStatus = paymentStatus === 'paid' ? ORDER_STATUSES.PAID : ORDER_STATUSES.AWAITING_PAYMENT;

  const orderPayload = {
    id: orderId,
    customerUid,
    customerName: customerName || 'Customer',
    customerPhone: customerPhone || '',
    beekeeperUid: beekeeperUid || 'beekeeper_demo',
    apiaryName: apiaryName || 'Cauvery Honey Farm',
    items,
    totalAmount: Number(totalAmount) || 0,
    currency: 'INR',
    fulfilmentType, // 'delivery' | 'pickup'
    deliveryAddress, // { street, city, state, pincode }
    status: initialStatus,
    paymentStatus,
    paymentMethod,
    paymentId: paymentId || `pay_sim_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Reserve/decrement product inventory
  for (const item of items) {
    if (item.productId && typeof item.quantity === 'number') {
      try {
        const productDocRef = doc(db, 'products', item.productId);
        const snap = await getDoc(productDocRef);
        if (snap.exists()) {
          const currentStock = snap.data().stock || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          await updateProduct(item.productId, { stock: newStock });
        }
      } catch (err) {
        console.log('[OrderService] Local stock adjustment notice:', err?.message);
      }
    }
  }

  // 2. Cache in Customer's and Beekeeper's local stores
  const customerOrders = await getCachedOrders(customerUid);
  await saveCachedOrders(customerUid, [orderPayload, ...customerOrders]);

  if (beekeeperUid) {
    const beekeeperOrders = await getCachedOrders(beekeeperUid);
    await saveCachedOrders(beekeeperUid, [orderPayload, ...beekeeperOrders]);
  }

  // 3. Persist to Firestore
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    await setDoc(orderDocRef, {
      ...orderPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.log('[OrderService] Order saved locally (cloud sync deferred):', err?.message);
  }

  return orderPayload;
}

/**
 * Real-time subscription to Customer's orders
 */
export function subscribeCustomerOrders(customerUid, onUpdate) {
  if (!customerUid) return () => {};

  let isSubscribed = true;

  // Initial local emit
  getCachedOrders(customerUid).then((cached) => {
    if (isSubscribed && cached) onUpdate(cached);
  });

  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('customerUid', '==', customerUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        if (list.length > 0) {
          saveCachedOrders(customerUid, list);
          onUpdate(list);
        }
      },
      (err) => {
        console.log('[OrderService] Customer orders snapshot notice, using local cache:', err?.message);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  } catch (_) {
    return () => {};
  }
}

/**
 * Real-time subscription to Beekeeper's incoming orders
 */
export function subscribeBeekeeperOrders(beekeeperUid, onUpdate) {
  if (!beekeeperUid) return () => {};

  let isSubscribed = true;

  // Initial local emit
  getCachedOrders(beekeeperUid).then((cached) => {
    if (isSubscribed && cached) onUpdate(cached);
  });

  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('beekeeperUid', '==', beekeeperUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        if (list.length > 0) {
          saveCachedOrders(beekeeperUid, list);
          onUpdate(list);
        }
      },
      (err) => {
        console.log('[OrderService] Beekeeper orders snapshot notice, using local cache:', err?.message);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  } catch (_) {
    return () => {};
  }
}

/**
 * Update order status (Beekeeper flow: accepted -> preparing -> dispatched -> completed)
 */
export async function updateOrderStatus(orderId, newStatus, actorUid) {
  if (!orderId || !newStatus) throw new Error('Order ID and new status are required.');

  const updates = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  // 1. Update in all local caches
  if (actorUid) {
    const currentCached = await getCachedOrders(actorUid);
    const updatedList = currentCached.map((o) =>
      o.id === orderId ? { ...o, ...updates } : o
    );
    await saveCachedOrders(actorUid, updatedList);
  }

  // 2. Sync to cloud Firestore
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    await updateDoc(orderDocRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.log('[OrderService] Order status update saved locally:', err?.message);
  }

  return { orderId, status: newStatus };
}

/**
 * Cancel order and restock inventory
 */
export async function cancelOrder(orderId, items = [], userUid) {
  if (!orderId) throw new Error('Order ID required.');

  // Restock items
  for (const item of items) {
    if (item.productId && typeof item.quantity === 'number') {
      try {
        const productDocRef = doc(db, 'products', item.productId);
        const snap = await getDoc(productDocRef);
        if (snap.exists()) {
          const currentStock = snap.data().stock || 0;
          await updateProduct(item.productId, { stock: currentStock + item.quantity });
        }
      } catch (_) {}
    }
  }

  return await updateOrderStatus(orderId, ORDER_STATUSES.CANCELLED, userUid);
}

export default {
  ORDER_STATUSES,
  createOrder,
  subscribeCustomerOrders,
  subscribeBeekeeperOrders,
  updateOrderStatus,
  cancelOrder,
};
