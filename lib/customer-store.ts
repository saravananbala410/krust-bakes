"use client";

import { create } from "zustand";
import type { Customer, CustomerOrder } from "./store-core";

type LastDetails = { name: string; phone: string; whatsapp: string; address: string; pincode: string } | null;
type Snapshot = { customer: Customer | null; orders: CustomerOrder[]; lastDetails: LastDetails };

type CustomerState = Snapshot & {
  loaded: boolean;
  accountOpen: boolean;
  setAccountOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  signIn: (credential: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

async function call<T>(init?: RequestInit): Promise<T> {
  const response = await fetch("/api/customer", { cache: "no-store", credentials: "same-origin", ...init, headers: { "Content-Type": "application/json" } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${response.status})`);
  return body as T;
}

/** Signed-in shopper (Google) and their order history, held on the server. */
export const useCustomerStore = create<CustomerState>()((set) => ({
  customer: null,
  orders: [],
  lastDetails: null,
  loaded: false,
  accountOpen: false,
  setAccountOpen: (accountOpen) => set({ accountOpen }),
  refresh: async () => {
    try { set({ ...(await call<Snapshot>()), loaded: true }); } catch { set({ loaded: true }); }
  },
  signIn: async (credential) => {
    try { set({ ...(await call<Snapshot>({ method: "POST", body: JSON.stringify({ credential }) })), loaded: true }); return null; } catch (error) { return (error as Error).message; }
  },
  signOut: async () => {
    await call({ method: "DELETE" }).catch(() => undefined);
    set({ customer: null, orders: [], lastDetails: null });
  },
}));
