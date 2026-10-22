import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { getConfig } from "@/lib/server/store";
import { seedConfig } from "@/lib/store-core";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Our story | Krust Artisan Bakes" };

export default async function Page() {
  const config = await getConfig().catch(() => seedConfig());
  return <Storefront initialConfig={config} page="story" />;
}
