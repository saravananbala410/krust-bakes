import type { Metadata } from "next";
import { Josefin_Sans, Pinyon_Script } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Licensed Brandon Grotesque / Aesthetic files in public/fonts take priority
// (see globals.css); these Google fonts are the closest free fallbacks.
const body = Josefin_Sans({ subsets: ["latin"], variable: "--font-body-fallback", weight: ["300", "400", "500", "600", "700"] });
const hero = Pinyon_Script({ subsets: ["latin"], variable: "--font-hero-fallback", weight: ["400"] });

export const metadata: Metadata = {
  title: "Krust Artisan Bakes | Baked fresh in Chennai",
  description: "Handcrafted artisan breads, tea cakes, cookies, brownies and savouries from our Guindy bakehouse.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${hero.variable}`}>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
