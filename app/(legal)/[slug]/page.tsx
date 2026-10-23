import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { getConfig } from "@/lib/server/store";
import { seedConfig, type PublicConfig } from "@/lib/store-core";

export const dynamic = "force-dynamic";

type Section = { heading: string; body: string[] };
type Policy = { title: string; intro: string; sections: (c: PublicConfig) => Section[] };

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Policy pages required by Razorpay and Indian e-commerce rules; business details come from admin settings. */
const POLICIES: Record<string, Policy> = {
  terms: {
    title: "Terms & Conditions",
    intro: "These terms apply when you browse our website or place an order with us.",
    sections: (c) => [
      { heading: "About us", body: [`This website is operated by ${c.settings.legalName}, ${c.branding.address}.`, c.settings.gstin ? `GSTIN: ${c.settings.gstin}.` : ""] },
      { heading: "Orders", body: ["You must sign in with Google to place an order. An order is confirmed once we accept it; we may contact you on the phone or WhatsApp number you provide to confirm details.", "We may decline or cancel an order if an item is unavailable, the delivery address is outside our service area, or the order details appear incorrect. If you have already paid, you will receive a full refund."] },
      { heading: "Prices and payment", body: ["All prices are in Indian Rupees and include GST. A GST tax invoice is available for every order.", "Online payments are processed securely by Razorpay. We never see or store your card, UPI or bank details. Pay on delivery may be offered where available."] },
      { heading: "Delivery", body: [`Home delivery is available in select areas of Chennai for orders of ${inr(c.settings.minimumOrder)} or more. See our Shipping & Delivery Policy for details.`] },
      { heading: "Products", body: ["Our products are freshly baked and best consumed soon after delivery. Each product is labelled eggless or contains egg; please check allergen information before ordering and contact us with any questions.", "Product photos are for illustration; handmade items may vary slightly in look."] },
      { heading: "Liability", body: ["We are responsible for delivering what you ordered in good condition. We are not liable for delays caused by events outside our control, such as extreme weather or incorrect address details."] },
      { heading: "Changes", body: ["We may update these terms from time to time. The version on this page applies to orders placed after it is published."] },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "We collect only what we need to take and deliver your order, and we never sell your data.",
    sections: (c) => [
      { heading: "What we collect", body: ["Your name and email from Google sign-in; the phone number, WhatsApp number, delivery address and pincode you enter at checkout; and your order history.", "Payment details are entered on Razorpay's secure checkout. We receive only the payment status and a payment reference number, never your card, UPI or bank details."] },
      { heading: "How we use it", body: ["To prepare, deliver and support your orders; to send order updates on WhatsApp or phone; to issue GST invoices; and to keep business and tax records as required by law."] },
      { heading: "Who we share it with", body: ["Razorpay, to process payments; our delivery staff, to deliver your order; and authorities only when required by law. We do not sell or rent your personal information."] },
      { heading: "Cookies", body: ["We use essential cookies to keep you signed in and to remember your basket. We do not use advertising cookies."] },
      { heading: "Your choices", body: [`You can ask us to correct or delete your account details by emailing ${c.branding.email}. Order and invoice records may be kept as required for tax purposes.`] },
    ],
  },
  "refund-policy": {
    title: "Refund & Cancellation Policy",
    intro: "Our bakes are freshly made to order, so cancellations and refunds work as below.",
    sections: (c) => [
      { heading: "Cancelling an order", body: [`You can cancel an order free of charge before we start preparing it. Call or WhatsApp us on ${c.branding.phone} with your order number.`, "Once your order is being prepared or is out for delivery, it cannot be cancelled because the items are perishable."] },
      { heading: "Problems with your order", body: ["If an item arrives damaged, is missing or is not what you ordered, contact us within 24 hours of delivery with your order number and a photo. We will replace the item or refund it."] },
      { heading: "Refunds", body: ["Approved refunds are made to your original payment method. Razorpay refunds usually reach your account within 5–7 working days, depending on your bank.", "If we cancel an order (for example because an item is unavailable), you receive a full refund."] },
      { heading: "Returns", body: ["Because our products are food, we cannot accept returns of items that were delivered correctly and in good condition."] },
    ],
  },
  "shipping-policy": {
    title: "Shipping & Delivery Policy",
    intro: "We deliver fresh from our Guindy bakehouse across select areas of Chennai.",
    sections: (c) => [
      { heading: "Where we deliver", body: ["Select areas of Chennai. Enter your pincode at checkout; if your area is outside our delivery zone, we will contact you before preparing the order and refund any payment."] },
      { heading: "Minimum order and charges", body: [`The minimum order for delivery is ${inr(c.settings.minimumOrder)}.`, c.settings.deliveryFee > 0 ? `A delivery fee of ${inr(c.settings.deliveryFee)} is added at checkout.` : "Delivery is free."] },
      { heading: "Delivery time", body: ["You choose the delivery date at checkout. Same-day delivery is available in select zones for orders confirmed in time. We will confirm the delivery time with you by phone or WhatsApp."] },
      { heading: "Tracking", body: ["Signed-in customers can follow each order's status under My orders. You can also track an order with its order number and phone number."] },
      { heading: "Failed delivery", body: ["If we cannot reach you at the address provided, we will call you to rearrange. Perishable orders that cannot be delivered after reasonable attempts may not be refundable."] },
    ],
  },
  contact: {
    title: "Contact Us",
    intro: "We're happy to help with orders, bulk and custom requests, or anything else.",
    sections: () => [],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const policy = POLICIES[(await params).slug];
  return { title: policy ? `${policy.title} | Krust Artisan Bakes` : "Krust Artisan Bakes" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const policy = POLICIES[(await params).slug];
  if (!policy) notFound();
  const config = await getConfig().catch(() => seedConfig());
  const { branding, settings } = config;
  const sections = policy.sections(config);
  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-petal bg-white">
        <div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3"><img src={branding.logoUrl} alt="" className="h-11 w-11 rounded-xl object-contain" /><img src={branding.wordmarkUrl} alt={branding.storeName} className="h-auto w-[150px]" /></Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.14em] text-cocoa hover:text-krust"><ArrowLeft size={14} /> Back to shop</Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-14">
        <p className="eyebrow">{settings.legalName}</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{policy.title}</h1>
        <p className="mt-4 text-base leading-7 text-cocoa">{policy.intro}</p>
        <p className="mt-2 text-xs text-cocoa">Last updated: 23 October 2026</p>
        {policy === POLICIES.contact ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[{ icon: Phone, label: "Phone / WhatsApp", value: branding.phone, href: `tel:${branding.phone.replace(/\s/g, "")}` }, { icon: Mail, label: "Email", value: branding.email, href: `mailto:${branding.email}` }, { icon: MapPin, label: "Bakehouse", value: branding.address, href: branding.mapsUrl }].map(({ icon: Icon, label, value, href }) => (
              <a key={label} href={href} className="rounded-2xl border border-petal bg-white p-5 transition hover:border-krust"><span className="grid h-10 w-10 place-items-center rounded-full bg-krust text-white"><Icon size={17} /></span><p className="mt-3 text-xs font-bold uppercase tracking-wider text-cocoa">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></a>
            ))}
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            {sections.map((s) => (
              <section key={s.heading}><h2 className="text-2xl">{s.heading}</h2>{s.body.filter(Boolean).map((p, i) => <p key={i} className="mt-3 text-sm leading-7 text-ink/85">{p}</p>)}</section>
            ))}
          </div>
        )}
        <div className="mt-12 rounded-2xl bg-white p-5 text-sm leading-6 text-cocoa">Questions? Contact {settings.legalName} at <a href={`mailto:${branding.email}`} className="font-semibold text-krust">{branding.email}</a> or <a href={`tel:${branding.phone.replace(/\s/g, "")}`} className="font-semibold text-krust">{branding.phone}</a>, {branding.address}.</div>
        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-petal pt-6 text-xs font-semibold text-cocoa">{LINKS.map(([href, label]) => <Link key={href} href={href} className="hover:text-krust">{label}</Link>)}</nav>
      </article>
    </main>
  );
}

const LINKS: Array<[string, string]> = [["/terms", "Terms & Conditions"], ["/privacy", "Privacy Policy"], ["/refund-policy", "Refund & Cancellation"], ["/shipping-policy", "Shipping & Delivery"], ["/contact", "Contact Us"]];
