export type Category = string;

export type Variant = {
  id: string;
  name: string;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category: Category;
  eggless: boolean;
  hsn: string;
  gstRate: number;
  accent: string;
  crop: string;
  imageUrl?: string;
  active?: boolean;
  featured?: boolean;
  variants: Variant[];
};

export type CartLine = {
  key: string;
  productId: string;
  variantId: string;
  quantity: number;
};
