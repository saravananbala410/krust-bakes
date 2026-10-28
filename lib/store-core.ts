import { seedCategories, seedProducts } from "./catalog";
import type { Product } from "./types";

export type StoreCategory = { id: string; name: string; active: boolean };
export type OrderLine = { productId?: string; productName: string; variantName: string; hsn?: string; quantity: number; unitPrice: number; gstRate: number };
export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type StoreOrder = {
  id: string; token: string; customer: string; phone: string; whatsapp: string; email?: string; address: string; pincode?: string;
  deliveryDate?: string; slot: string; total: number; items: number; status: string; paymentMethod: string; paymentStatus: string;
  createdAt: string; updatedAt?: string; deletedAt?: string; customerId?: string; lines: OrderLine[];
  /** Razorpay order created for this order, and the captured payment once verified. */
  razorpayOrderId?: string; paymentId?: string; paidAt?: string; note?: string; customerNote?: string;
};
export type AuditEntry = { id: string; at: string; actor: string; actorRole?: AdminRole | "CUSTOMER"; action: string; entity: string; detail: string };
/** DEV_ADMIN: head of the site, full access. SUPER_ADMIN: business owner view. SALES_ADMIN: orders and payments only. */
export type AdminRole = "DEV_ADMIN" | "SUPER_ADMIN" | "SALES_ADMIN";
export const ROLE_LABELS: Record<AdminRole, string> = { DEV_ADMIN: "Dev admin", SUPER_ADMIN: "Super admin", SALES_ADMIN: "Sales admin" };
export type AdminTab = "Overview" | "Orders" | "Recycle bin" | "Products" | "Categories" | "Hampers" | "GST" | "Customers & payments" | "Content studio" | "Social links" | "Settings" | "Admin users" | "History" | "Visitors";
export const ROLE_TABS: Record<AdminRole, AdminTab[]> = {
  DEV_ADMIN: ["Overview", "Visitors", "Orders", "Recycle bin", "Products", "Categories", "Hampers", "GST", "Customers & payments", "Content studio", "Social links", "Settings", "Admin users", "History"],
  SUPER_ADMIN: ["Overview", "Orders", "Hampers", "GST", "Customers & payments", "Settings", "History"],
  SALES_ADMIN: ["Orders", "Customers & payments"],
};
export type AdminUser = { id: string; name: string; username: string; role: AdminRole; active: boolean; createdAt?: string };
export type CarouselSlide = { id: string; eyebrow: string; title: string; copy: string; imageUrl: string; ctaLabel?: string; active: boolean };
export type Testimonial = { id: string; name: string; role: string; quote: string; rating?: number; active: boolean };
export type Faq = { id: string; question: string; answer: string; active: boolean };
export type SocialLinks = Record<"instagram" | "facebook" | "twitter" | "whatsapp", string>;
export type Branding = {
  storeName: string; tagline: string; logoUrl: string; wordmarkUrl: string; announcement: string;
  heroEyebrow: string; heroTitle: string; heroAccent: string; heroCopy: string; heroImage: string;
  phone: string; email: string; address: string; mapsUrl: string; mapsEmbedUrl: string;
  whatsappNote: string; ratingValue: string; ratingCount: string;
};
export type TeamMember = { id: string; name: string; role: string; photoUrl: string };
export type Story = {
  eyebrow: string; titleStart: string; titleAccent: string; titleEnd: string; paragraphs: string;
  imageUrl: string; statValue: string; statLabel: string; team: TeamMember[];
};
/** A festive gift hamper: sold as one basket item at a fixed price. */
export type Hamper = { id: string; name: string; description: string; imageUrl: string; images?: string[]; price: number; gstRate: number; contents: string[]; badge?: string; active: boolean };
/** Festive mode: the hamper popup and the fireworks. */
export type Festive = { enabled: boolean; fireworks: boolean; title: string; subtitle: string; popupDelaySeconds: number; repeatMinutes: number };
export type StoreSettings = { minimumOrder: number; deliveryFee: number; gstRates: number[]; gstin: string; fssai: string; legalName: string; placeOfSupply: string; googleClientId: string };

/** Catalogue and site content: everything a storefront visitor may read. */
export type PublicConfig = {
  products: Product[]; categories: StoreCategory[]; slides: CarouselSlide[]; testimonials: Testimonial[]; faqs: Faq[];
  settings: StoreSettings; socialLinks: SocialLinks; branding: Branding; story: Story;
  hampers: Hamper[]; festive: Festive;
  /** Computed on each request from server secrets; never stored. */
  payments?: { razorpay: boolean };
};
/** Admin-only operational data, loaded after sign-in. */
/** A shopper signed in with Google. */
export type Customer = { id: string; email: string; name: string; picture?: string; phone?: string; createdAt: string; lastLoginAt: string };
export type CustomerOrder = Pick<StoreOrder, "id" | "token" | "createdAt" | "deliveryDate" | "status" | "paymentStatus" | "paymentMethod" | "total" | "items" | "lines" | "address" | "paymentId" | "paidAt">;
export type AdminData = { orders: StoreOrder[]; recycleBin: StoreOrder[]; audit: AuditEntry[]; admins: AdminUser[] };

export type PlaceOrderInput = {
  customer: string; phone: string; whatsapp?: string; email?: string; address: string; landmark?: string; pincode: string;
  deliveryDate: string; slot?: string; paymentMethod: "ONLINE" | "UPI" | "PAY_ON_DELIVERY" | "RAZORPAY"; note?: string;
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
  | { type: "hamper.save"; hamper: Hamper }
  | { type: "hamper.delete"; id: string }
  | { type: "festive.update"; festive: Festive }
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
  | { type: "admin.changeOwnPassword"; current: string; next: string }
  | { type: "admin.updateOwnProfile"; current: string; name: string; username: string };

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
      { id: "f-4", question: "Do you use artificial colours?", answer: "No. We never add artificial colours. Every colour in our bakes comes from real ingredients like butter, cocoa, fruit and a properly baked crust.", active: true },
    ],
    story: {
      eyebrow: "From Melbourne to Madras", titleStart: "A baker's life,", titleAccent: "folded", titleEnd: "into every layer.",
      paragraphs: "Founder and Master Chef Karenbir Singh Suri trained at the William Angliss Institute in Melbourne. For more than sixteen years, he has pursued one standard: food that is technically precise, deeply comforting and always made fresh.\n\nToday, Krust serves homes and some of Chennai's most exacting hospitality partners, from Taj Hotels to neighbourhood favourites.",
      imageUrl: "/brand/krust-hero.png", statValue: "16+", statLabel: "Years at the bench",
      team: [{ id: "founder", name: "Karenbir Singh Suri", role: "Founder & Master Chef", photoUrl: "" }],
    },
    hampers: [
      { id: "diwali-classic", name: "Festive Classic Hamper", description: "A warm little celebration box for family and friends.", imageUrl: "/brand/krust-hero.png", price: 999, gstRate: 5, badge: "Bestseller", active: true,
        contents: ["Lemon Tea Cake (200g)", "Anzac Cookies (200g)", "Madras Butter Biscuits (250g)", "Brownies (2 pcs)", "Festive gift box with greeting card"] },
      { id: "diwali-grand", name: "Grand Diwali Hamper", description: "Our most generous box, made for gifting to clients and big families.", imageUrl: "/brand/krust-hero.png", price: 1999, gstRate: 5, badge: "Premium", active: true,
        contents: ["Mix Berry Tea Cake (200g)", "Vanilla Tea Cake (200g)", "Peanut Butter Cookies (200g)", "Baklava Cookies (200g)", "Biscoff Brownie (2 pcs)", "Hyderabad Osmania Biscuits (250g)", "Premium wooden gift box"] },
      { id: "diwali-mini", name: "Sweet Little Hamper", description: "A small, thoughtful treat that fits every budget.", imageUrl: "/brand/krust-hero.png", price: 599, gstRate: 5, active: true,
        contents: ["Vanilla Tea Cake (200g)", "Walnut Brownies (200g)", "Golden Krust Cakes (4 pcs)", "Festive gift pouch"] },
    ],
    festive: { enabled: true, fireworks: true, title: "Happy Diwali", subtitle: "Light up the festival with our handcrafted gift hampers", popupDelaySeconds: 4, repeatMinutes: 10 },
    settings: { minimumOrder: 750, deliveryFee: 0, gstRates: [0, 5, 18], gstin: "", fssai: "", legalName: "Krust Artisan Bakes", placeOfSupply: "Tamil Nadu (33)", googleClientId: "" },
    socialLinks: { instagram: "https://instagram.com/", facebook: "https://facebook.com/", twitter: "https://x.com/", whatsapp: "https://wa.me/919840477330" },
    branding: {
      storeName: "Krust Artisan Bakes", tagline: "Where baking is a passion", logoUrl: "/brand/krust-mark.png", wordmarkUrl: "/brand/krust-wordmark.png",
      announcement: "Fresh from the oven · Same-day delivery in select Chennai zones",
      heroEyebrow: "Crafted in small batches, daily", heroTitle: "Baked with", heroAccent: "obsession.",
      heroCopy: "Honest ingredients, old-world technique and a little Melbourne spirit, made fresh every morning in the heart of Chennai.",
      heroImage: "/brand/krust-hero.png", phone: "+91 98404 77330", email: "krustbakes@gmail.com",
      address: "No. 7 (NP), Guindy Industrial Estate, Ekkattuthangal, Chennai 600032", mapsUrl: "https://maps.google.com/?q=Guindy+Industrial+Estate+Chennai", mapsEmbedUrl: "",
      whatsappNote: "For bulk & customised orders, chat with us on WhatsApp", ratingValue: "4.9", ratingCount: "1,200+ happy homes",
    },
  };
}

export const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || crypto.randomUUID();

export const HAMPER_CATEGORY = "Hampers";
export const HAMPER_VARIANT = "hamper";
export const hamperProductId = (hamperId: string) => `hamper-${hamperId}`;

/** Every sellable item: products plus active hampers shaped as products, so cart, checkout and pricing treat them alike. */
export function sellableCatalog(config: Pick<PublicConfig, "products" | "hampers">): Product[] {
  return [
    ...config.products,
    ...(config.hampers ?? []).filter((h) => h.active).map((h): Product => ({
      id: hamperProductId(h.id), name: h.name, description: h.description, category: HAMPER_CATEGORY, eggless: false, hsn: "1905",
      gstRate: h.gstRate, accent: "#f6c9c9", crop: "50% 50%", imageUrl: h.imageUrl, images: galleryOf(h), active: true, featured: false,
      variants: [{ id: HAMPER_VARIANT, name: "Gift hamper", price: h.price }],
    })),
  ];
}

export const MAX_PHOTOS = 8;
/** All photos of a product or hamper, main photo first, without duplicates or blanks. */
export function galleryOf(item: { imageUrl?: string; images?: string[] }): string[] {
  return [...new Set([item.imageUrl, ...(item.images ?? [])].filter((u): u is string => !!u && !!u.trim()))].slice(0, MAX_PHOTOS);
}
