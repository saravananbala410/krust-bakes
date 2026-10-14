import { Storefront } from "@/components/storefront";
import { getConfig } from "@/lib/server/store";
import { seedConfig } from "@/lib/store-core";

export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  const config = await getConfig().catch((error) => {
    console.error("Falling back to seed catalogue:", error);
    return seedConfig();
  });
  return <Storefront initialConfig={config} />;
}
