import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext(null);
const CART_STORAGE_KEY = '@honeychain_customer_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Restore cached cart on app start
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (raw && isMounted) {
          try {
            setItems(JSON.parse(raw));
          } catch (_) {}
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveCart = async (newItems) => {
    setItems(newItems);
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
    } catch (_) {}
  };

  const addToCart = (product, quantity = 1) => {
    if (!product || !product.id) return { success: false, reason: 'Invalid product' };

    const maxStock = product.stock || 99;
    const existingIndex = items.findIndex((i) => i.product.id === product.id);

    let updated = [...items];
    if (existingIndex !== -1) {
      const newQty = updated[existingIndex].quantity + quantity;
      if (newQty > maxStock) {
        return {
          success: false,
          reason: `Only ${maxStock} jars available in inventory.`,
        };
      }
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
      };
    } else {
      if (quantity > maxStock) {
        return {
          success: false,
          reason: `Only ${maxStock} jars available in inventory.`,
        };
      }
      updated.push({
        product,
        quantity,
      });
    }

    saveCart(updated);
    return { success: true };
  };

  const updateQuantity = (productId, delta) => {
    const existingIndex = items.findIndex((i) => i.product.id === productId);
    if (existingIndex === -1) return;

    let updated = [...items];
    const current = updated[existingIndex];
    const maxStock = current.product.stock || 99;
    const newQty = current.quantity + delta;

    if (newQty <= 0) {
      updated = updated.filter((i) => i.product.id !== productId);
    } else if (newQty > maxStock) {
      return { success: false, reason: `Max stock of ${maxStock} reached.` };
    } else {
      updated[existingIndex] = { ...current, quantity: newQty };
    }

    saveCart(updated);
    return { success: true };
  };

  const removeFromCart = (productId) => {
    const updated = items.filter((i) => i.product.id !== productId);
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalAmount,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
