import { seedCategories, seedProducts } from "./catalog";
import type { Product } from "./types";

export type StoreCategory = { id: string; name: string; active: boolean };
export type OrderLine = { productId?: string; productName: string; variantName: string; hsn?: string; quantity: number; unitPrice: number; gstRate: number };
export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type StoreOrder = {
  id: string; token: string; customer: string; phone: string; whatsapp: string; email?: string; address: string; pincode?: string;
  deliveryDate?: string; slot: string; total: number; items: number; status: string; paymentMethod: string; paymentStatus: string;
  createdAt: string; updatedAt?: string; deletedAt?: string; lines: OrderLine[]; note?: string; customerNote?: string;
};
export type AuditEntry = { id: string; at: string; actor: string; action: string; entity: string; detail: string };
export type AdminUser = { id: string; name: string; username: string; role: "ADMIN" | "SUPER_ADMIN"; active: boolean; createdAt?: string };
export type CarouselSlide = { id: string; eyebrow: string; title: string; copy: string; imageUrl: string; ctaLabel?: string; active: boolean };
export type Testimonial = { id: string; name: string; role: string; quote: string; active: boolean };
export type Faq = { id: string; question: string; answer: string; active: boolean };
export type SocialLinks = Record<"instagram" | "facebook" | "twitter" | "whatsapp", string>;
export type Branding = {
  storeName: string; tagline: string; logoUrl: string; wordmarkUrl: string; announcement: string;
  heroEyebrow: string; heroTitle: string; heroAccent: string; heroCopy: string; heroImage: string;
  phone: string; email: string; address: string; mapsUrl: string;
};
export type TeamMember = { id: string; name: string; role: string; photoUrl: string };
export type Story = {
  eyebrow: string; titleStart: string; titleAccent: string; titleEnd: string; paragraphs: string;
  imageUrl: string; statValue: string; statLabel: string; team: TeamMember[];
};
export type StoreSettings = { minimumOrder: number; deliveryFee: number; gstRates: number[]; gstin: string; fssai: string; legalName: string; placeOfSupply: string };

/** Catalogue and site content: everything a storefront visitor may read. */
export type PublicConfig = {
  products: Product[]; categories: StoreCategory[]; slides: CarouselSlide[]; testimonials: Testimonial[]; faqs: Faq[];
  settings: StoreSettings; socialLinks: SocialLinks; branding: Branding; story: Story;
};
/** Admin-only operational data, loaded after sign-in. */
export type AdminData = { orders: StoreOrder[]; recycleBin: StoreOrder[]; audit: AuditEntry[]; admins: AdminUser[] };

export type PlaceOrderInput = {
  customer: string; phone: string; whatsapp?: string; email?: string; address: string; landmark?: string; pincode: string;
  deliveryDate: string; slot: string; paymentMethod: "ONLINE" | "UPI" | "PAY_ON_DELIVERY"; note?: string;
  lines: Array<{ productId: string; variantId: string; quantity: number }>;
};

export type AdminAction =
  | { type: "product.save"; product: Product }
  | { type: "product.delete"; id: string }
  | { type: "category.add"; name: string }
  | { type: "category.update"; id: string; name?: string; active?: boolean }
  | { type: "category.delete"; id: string }
  | { type: "order.update"; id: string; patch: Partial<Pick<StoreOrder, "status" | "paymentStatus" | "note">> }
  | { type: "order.recycle"; id: string }
  | { type: "order.restore"; id: string }
  | { type: "order.purge"; id: string }
  | { type: "recycle.empty" }
  | { type: "settings.update"; patch: Partial<StoreSettings> }
  | { type: "social.update"; links: SocialLinks }
  | { type: "branding.update"; patch: Partial<Branding> }
  | { type: "story.update"; story: Story }
  | { type: "slide.save"; slide: CarouselSlide }
  | { type: "slide.delete"; id: string }
  | { type: "slide.move"; id: string; direction: -1 | 1 }
  | { type: "testimonial.save"; item: Testimonial }
  | { type: "testimonial.delete"; id: string }
  | { type: "faq.save"; item: Faq }
  | { type: "faq.delete"; id: string }
  | { type: "admin.create"; name: string; username: string; password: string; role: AdminUser["role"] }
  | { type: "admin.update"; id: string; active?: boolean; role?: AdminUser["role"]; password?: string }
  | { type: "admin.delete"; id: string }
  | { type: "admin.changeOwnPassword"; current: string; next: string };

export function seedConfig(): PublicConfig {
  return {
    products: seedProducts,
    categories: seedCategories.map((name) => ({ id: slug(name), name, active: true })),
    slides: [
      { id: "slide-1", eyebrow: "The Krust standard", title: "No shortcuts. Just better bread.", copy: "Long fermentation, honest ingredients and the quiet precision of sixteen years at the bench.", imageUrl: "/brand/krust-hero.png", ctaLabel: "Order today's bake", active: true },
      { id: "slide-2", eyebrow: "Made in Guindy", title: "Freshness you can hear.", copy: "Crackling crusts, shattering layers and warm batches moving from our oven to your door.", imageUrl: "/brand/krust-hero.png", ctaLabel: "Explore the menu", active: true },
      { id: "slide-3", eyebrow: "Tea-time, elevated", title: "Tea cakes worth slowing down for.", copy: "Lemon, vanilla and mixed berry loaves, baked soft and fragrant for the four o'clock pause.", imageUrl: "/brand/krust-hero.png", ctaLabel: "See tea cakes", active: true },
    ],
    testimonials: [
      { id: "t-1", name: "Ananya R.", role: "Adyar", quote: "The olive oil bread has ruined supermarket loaves for us forever. Delivery was warm and on time.", active: true },
      { id: "t-2", name: "Harish M.", role: "Velachery", quote: "Biscoff brownies are a weekly ritual now. Rich, fudgy and never too sweet.", active: true },
      { id: "t-3", name: "Chef Priya S.", role: "Hospitality partner", quote: "Consistent, precise and genuinely artisanal. Krust is the bakery we trust for our guests.", active: true },
    ],
    faqs: [
      { id: "f-1", question: "Where do you deliver?", answer: "We deliver across select Chennai zones from our Guindy bakehouse. Enter your pincode at checkout and we will confirm by WhatsApp.", active: true },
      { id: "f-2", question: "Is there a minimum order?", answer: "Home delivery starts at the minimum order value shown in your basket. All prices include GST.", active: true },
      { id: "f-3", question: "Do you have eggless options?", answer: "Yes. Every product is labelled eggless or contains egg, and eggless items are prepared separately.", active: true },
      { id: "f-4", question: "Can I get a GST invoice?", answer: "Every order comes with a downloadable GST tax invoice showing HSN codes, CGST and SGST.", active: true },
    ],
    story: {
      eyebrow: "From Melbourne to Madras", titleStart: "A baker's life,", titleAccent: "folded", titleEnd: "into every layer.",
      paragraphs: "Founder and Master Chef Karenbir Singh Suri trained at the William Angliss Institute in Melbourne. For more than sixteen years, he has pursued one standard: food that is technically precise, deeply comforting and always made fresh.\n\nToday, Krust serves homes and some of Chennai's most exacting hospitality partners, from Taj Hotels to neighbourhood favourites.",
      imageUrl: "/brand/krust-hero.png", statValue: "16+", statLabel: "Years at the bench",
      team: [{ id: "founder", name: "Karenbir Singh Suri", role: "Founder & Master Chef", photoUrl: "" }],
    },
    settings: { minimumOrder: 750, deliveryFee: 0, gstRates: [0, 5, 18], gstin: "", fssai: "", legalName: "Krust Artisan Bakes", placeOfSupply: "Tamil Nadu (33)" },
    socialLinks: { instagram: "https://instagram.com/", facebook: "https://facebook.com/", twitter: "https://x.com/", whatsapp: "https://wa.me/919840477330" },
    branding: {
      storeName: "Krust Artisan Bakes", tagline: "Where baking is a passion", logoUrl: "/brand/krust-mark.png", wordmarkUrl: "/brand/krust-wordmark.png",
      announcement: "Fresh from the oven · Same-day delivery in select Chennai zones",
      heroEyebrow: "Crafted in small batches, daily", heroTitle: "Baked with", heroAccent: "obsession.",
      heroCopy: "Honest ingredients, old-world technique and a little Melbourne spirit, made fresh every morning in the heart of Chennai.",
      heroImage: "/brand/krust-hero.png", phone: "+91 98404 77330", email: "krustbakes@gmail.com",
      address: "No. 7 (NP), Guindy Industrial Estate, Ekkattuthangal, Chennai 600032", mapsUrl: "https://maps.google.com/?q=Guindy+Industrial+Estate+Chennai",
    },
  };
}

export const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || crypto.randomUUID();
