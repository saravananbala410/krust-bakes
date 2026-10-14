import type { Product } from "./types";

// Seed catalog transcribed from the Krust product catalog PDF. After first run
// the live catalog lives in the database and is edited from the admin panel.
export const seedCategories = [
  "Breads & Bun",
  "Flatbread & Puff Pastry",
  "Tea Cakes",
  "Biscuits",
  "Buns",
  "Cakes & Muffins",
  "Rolls",
  "Bruschetta",
  "Cookies",
];

// GST after the Sept 2025 rationalisation: plain breads and buns nil, other
// bakery goods 5%. Rates stay editable per product from the admin panel.
const nilRated = new Set(["Breads & Bun", "Buns"]);

const items: Array<[string, string, string, number]> = [
  ["Whole Wheat Bread", "Breads & Bun", "500g", 79], ["Olive Oil Bread", "Breads & Bun", "400g", 99], ["Multigrain Bread", "Breads & Bun", "400g", 75], ["Wheat Olive Oil", "Breads & Bun", "400g", 109], ["Classic Milk Bread", "Breads & Bun", "400g", 69], ["Garlic Bread", "Breads & Bun", "200g", 60], ["Burger", "Breads & Bun", "2 pcs", 45], ["Wheat Pav Bun", "Breads & Bun", "6 pcs", 70], ["Pizza", "Breads & Bun", "Pack", 70], ["Wheat Pizza", "Breads & Bun", "Pack", 70],
  ["Pita", "Flatbread & Puff Pastry", "100g", 99], ["Vol-au-Vents", "Flatbread & Puff Pastry", "Pack", 230], ["Mini Vol-au-Vents", "Flatbread & Puff Pastry", "Pack", 299],
  ["Golden Krust Cake", "Tea Cakes", "25g", 12], ["Lemon Tea Cake", "Tea Cakes", "200g", 160], ["Vanilla Tea Cake", "Tea Cakes", "200g", 160], ["Mix Berry Tea Cake", "Tea Cakes", "200g", 160],
  ["Hyderabad Osmania", "Biscuits", "250g", 79], ["Madras Butter", "Biscuits", "250g", 79], ["Punjabi Atta", "Biscuits", "250g", 79],
  ["Classic Bun", "Buns", "4 pcs", 79], ["Sugar & Raisin Bun", "Buns", "4 pcs", 89], ["Multi Seed Bun", "Buns", "4 pcs", 89],
  ["Muffins", "Cakes & Muffins", "4 pcs", 70], ["Brownies", "Cakes & Muffins", "50g", 90], ["Caramel Brownie", "Cakes & Muffins", "50g", 80], ["Nutella Brownie", "Cakes & Muffins", "50g", 80], ["Biscoff Brownie", "Cakes & Muffins", "50g", 80],
  ["Palm Sugar Roll", "Rolls", "Box", 20], ["Cream Roll", "Rolls", "Box", 15],
  ["Bruschetta Peri Peri", "Bruschetta", "100g", 99], ["Bruschetta Indspice", "Bruschetta", "100g", 99], ["Bruschetta Cheese", "Bruschetta", "100g", 99],
  ["Anzac Cookies", "Cookies", "200g", 120], ["Peanut Butter Cookies", "Cookies", "200g", 120], ["Walnut Brownies", "Cookies", "200g", 120], ["Granola Cookies", "Cookies", "200g", 120], ["Baklava Cookies", "Cookies", "200g", 120],
];

export const seedProducts: Product[] = items.map(([name, category, variant, price], index) => ({
  id: `p-${index + 1}`,
  name,
  description: "Freshly baked in small batches at our Guindy bakehouse.",
  category,
  eggless: !/milk|burger|muffin|brownie|cake|cream/i.test(name),
  hsn: "1905",
  gstRate: nilRated.has(category) ? 0 : 5,
  accent: "#f6c9c9",
  crop: `${40 + (index % 5) * 12}% ${40 + (index % 3) * 12}%`,
  imageUrl: "/brand/krust-hero.png",
  active: true,
  featured: [0, 1, 14, 24, 33, 30].includes(index),
  variants: [{ id: `v-${index + 1}`, name: variant, price }],
}));
