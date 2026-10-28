import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront";
import { getConfig } from "@/lib/server/store";
import { seedConfig } from "@/lib/store-core";

export const dynamic = "force-dynamic";

async function findProduct(id: string) {
  const config = await getConfig().catch(() => seedConfig());
  const active = new Set(config.categories.filter((c) => c.active).map((c) => c.name));
  const product = config.products.find((p) => p.id === id && p.active !== false && active.has(p.category));
  return { config, product };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { product } = await findProduct((await params).id);
  return product ? { title: `${product.name} | Krust Artisan Bakes`, description: product.description } : { title: "Krust Artisan Bakes" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { config, product } = await findProduct(id);
  if (!product) notFound();
  return <Storefront initialConfig={config} page="product" productId={product.id} />;
}
