"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string;
  slug: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  icon: string;
  category: string;
  categoryLabel: string;
  gradient: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  // جایگزینی کل سبد (سفارش دوباره از یادآوری تمدید)
  replaceItems: (items: CartItem[]) => void;
  isHydrated: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  totalCount: number;
  totalAmount: number;
  totalDiscount: number;
  freeShippingThreshold: number;
  postShippingFee: number;
  remainingForFreeShipping: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// v2: cart lines are keyed by SKU (ProductVariant); older carts are dropped
const CART_STORAGE_KEY = "maya_cart_items_v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  // Shipping rules come from the store settings (editable by the super admin)
  const [shippingConfig, setShippingConfig] = useState({ freeShippingThreshold: 800000, postShippingFee: 45000 });

  useEffect(() => {
    fetch("/api/store/config")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) setShippingConfig(data.config);
      })
      .catch(() => {});
  }, []);

  // Load from localStorage safely on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
        setItems(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items, isHydrated]);

  const addItem = (product: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsOpen(true); // Automatically open cart drawer for rich feedback
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const totalAmount = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const totalCompareAtAmount = items.reduce(
    (acc, item) =>
      acc + (item.compareAtPrice || item.price) * item.quantity,
    0
  );

  const totalDiscount = Math.max(0, totalCompareAtAmount - totalAmount);

  const remainingForFreeShipping = Math.max(
    0,
    shippingConfig.freeShippingThreshold - totalAmount
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        replaceItems: (next: CartItem[]) => setItems(next),
        isHydrated,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
        totalCount,
        totalAmount,
        totalDiscount,
        freeShippingThreshold: shippingConfig.freeShippingThreshold,
        postShippingFee: shippingConfig.postShippingFee,
        remainingForFreeShipping,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
