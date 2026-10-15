import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const heading = Playfair_Display({ subsets: ["latin"], variable: "--font-heading", weight: ["600", "700", "800", "900"], style: ["normal", "italic"] });
const text = Manrope({ subsets: ["latin"], variable: "--font-text", weight: ["400", "500", "600", "700", "800"] });

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
    <html lang="en" className={`${heading.variable} ${text.variable}`}>
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
