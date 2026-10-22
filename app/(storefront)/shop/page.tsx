import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { getConfig } from "@/lib/server/store";
import { seedConfig } from "@/lib/store-core";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop | Krust Artisan Bakes" };

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [config, { category }] = await Promise.all([getConfig().catch(() => seedConfig()), searchParams]);
  const known = config.categories.some((c) => c.active && c.name === category);
  return <Storefront initialConfig={config} page="shop" initialCategory={known ? category : undefined} />;
}
