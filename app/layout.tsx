import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Krust Artisan Bakes | Baked fresh in Chennai",
  description: "Handcrafted artisan breads, tea cakes, cookies, brownies and savouries from our Guindy bakehouse.",
  metadataBase: new URL("https://www.krustbakes.com"),
  openGraph: { siteName: "Krust Artisan Bakes", type: "website", locale: "en_IN", images: ["/brand/krust-hero.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
