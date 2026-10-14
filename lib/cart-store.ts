"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "./types";

type CartState = {
  lines: CartLine[];
  checkoutOpen: boolean;
  add: (productId: string, variantId: string) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  remove: (productId: string, variantId: string) => void;
  clear: () => void;
  setCheckoutOpen: (open: boolean) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      checkoutOpen: false,
      add: (productId, variantId) =>
        set((state) => {
          const key = `${productId}:${variantId}`;
          const existing = state.lines.find((line) => line.key === key);
          return {
            lines: existing
              ? state.lines.map((line) =>
                  line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
                )
              : [...state.lines, { key, productId, variantId, quantity: 1 }],
          };
        }),
      setQuantity: (productId, variantId, quantity) =>
        set((state) => {
          const key = `${productId}:${variantId}`;
          if (quantity <= 0) return { lines: state.lines.filter((line) => line.key !== key) };
          const exists = state.lines.some((line) => line.key === key);
          return {
            lines: exists
              ? state.lines.map((line) => (line.key === key ? { ...line, quantity } : line))
              : [...state.lines, { key, productId, variantId, quantity }],
          };
        }),
      remove: (productId, variantId) =>
        set((state) => ({
          lines: state.lines.filter((line) => line.key !== `${productId}:${variantId}`),
        })),
      clear: () => set({ lines: [] }),
      setCheckoutOpen: (checkoutOpen) => set({ checkoutOpen }),
    }),
    { name: "krust-cart", partialize: (state) => ({ lines: state.lines }) },
  ),
);
