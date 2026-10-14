"use client";

import { create } from "zustand";
import { seedConfig, type AdminAction, type AdminData, type AdminUser, type PublicConfig } from "./store-core";

export type { AdminUser, AuditEntry, CarouselSlide, Faq, StoreCategory, StoreOrder, Testimonial } from "./store-core";

type Snapshot = { config: PublicConfig; me: AdminUser | null; admin: AdminData | null };

type StoreState = Snapshot & {
  loaded: boolean;
  hydrate: (config: PublicConfig) => void;
  refresh: () => Promise<void>;
  dispatch: (action: AdminAction) => Promise<boolean>;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  upload: (file: File) => Promise<string | null>;
  error: string | null;
  clearError: () => void;
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${response.status})`);
  return body as T;
}

/** Shared state backed by the server database; nothing is kept in localStorage. */
export const useAppStore = create<StoreState>()((set, get) => ({
  config: seedConfig(),
  me: null,
  admin: null,
  loaded: false,
  error: null,
  clearError: () => set({ error: null }),
  hydrate: (config) => { if (!get().loaded) set({ config }); },
  refresh: async () => {
    try {
      set({ ...(await call<Snapshot>("/api/store")), loaded: true });
    } catch (error) {
      set({ loaded: true, error: (error as Error).message });
    }
  },
  dispatch: async (action) => {
    try {
      set({ ...(await call<Snapshot>("/api/store", { method: "POST", body: JSON.stringify(action) })), error: null });
      return true;
    } catch (error) {
      set({ error: (error as Error).message });
      if (/sign in/i.test((error as Error).message)) set({ me: null, admin: null });
      return false;
    }
  },
  login: async (username, password) => {
    try {
      await call("/api/auth", { method: "POST", body: JSON.stringify({ username, password }) });
      await get().refresh();
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  },
  logout: async () => {
    await call("/api/auth", { method: "DELETE" }).catch(() => undefined);
    set({ me: null, admin: null });
  },
  upload: async (file) => {
    try {
      const { mime, data } = await compressImage(file);
      const { url } = await call<{ url: string }>("/api/assets", { method: "POST", body: JSON.stringify({ mime, data }) });
      return url;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },
}));

// Server accepts up to 2,000,000 base64 chars (~1.5 MB); stay safely below.
const MAX_BASE64 = 1_800_000;
const UPLOADABLE = /^image\/(png|jpe?g|webp|gif)$/;

const fileToBase64 = (file: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => { const url = String(reader.result); resolve(url.slice(url.indexOf(",") + 1)); };
  reader.onerror = () => reject(new Error("Could not read the image"));
  reader.readAsDataURL(file);
});

/** Upload small images untouched; shrink larger ones until they fit the limit. */
async function compressImage(file: File): Promise<{ mime: string; data: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (UPLOADABLE.test(file.type) && file.size * 1.37 < MAX_BASE64) return { mime: file.type, data: await fileToBase64(file) };

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  // WebP keeps PNG transparency at a fraction of the size; JPEG for photos.
  const preferred = file.type === "image/png" || file.type === "image/gif" ? "image/webp" : "image/jpeg";
  for (const [maxSide, quality] of [[2000, 0.88], [1600, 0.82], [1400, 0.75], [1200, 0.7], [1000, 0.65], [800, 0.6]] as const) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let dataUrl = canvas.toDataURL(preferred, quality);
    // Browsers without WebP encoding silently return PNG; fall back to JPEG.
    if (!dataUrl.startsWith(`data:${preferred}`)) dataUrl = canvas.toDataURL("image/jpeg", quality);
    const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
    if (data.length < MAX_BASE64) return { mime: dataUrl.slice(5, dataUrl.indexOf(";")), data };
  }
  throw new Error("This image is too large even after compressing. Please choose a smaller one.");
}
