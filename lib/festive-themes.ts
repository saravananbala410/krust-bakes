/** Festival and season themes the dev admin can switch the storefront to. Shared by server and browser. */

export type FestiveThemeId = "none" | "diwali" | "christmas" | "newyear" | "pongal" | "holi" | "eid" | "valentines" | "spring" | "summer" | "autumn" | "winter";

/** The canvas effect a theme plays: crackers, falling snow, confetti, petals, lanterns, blossoms, sun sparkles or leaves. */
export type FestiveEffect = "fireworks" | "snow" | "confetti" | "petals" | "lanterns" | "blossoms" | "sparkles" | "leaves";

export type FestiveTheme = {
  id: FestiveThemeId;
  /** Festivals and seasons are grouped separately in the admin picker. */
  kind: "none" | "festival" | "season";
  label: string;
  emoji: string;
  /** Text on the floating gift button, e.g. "Diwali hampers". */
  hamperLabel: string;
  defaultTitle: string;
  defaultSubtitle: string;
  effect: FestiveEffect;
  /** Particle colours for the effect and the header garland. */
  colors: string[];
  /** Banner gradient (from, via, to) and the gold trim colour. */
  from: string; via: string; to: string; gold: string;
  /** Soft page tints: cream background and blush highlight. */
  cream: string; blush: string;
  /** Site-wide colour overrides (Krust brand tokens) while this theme is on. */
  palette?: Record<string, string>;
};

/** Brand-token overrides per theme: buttons, accents, cards and backgrounds all follow these. */
const PALETTES: Partial<Record<FestiveThemeId, Record<string, string>>> = {
  christmas: { "--krust-red": "#c8102e", "--krust-red-deep": "#8b0a1f", "--krust-cocoa": "#4f5d4f", "--krust-petal": "#d6e6d2", "--krust-peach": "#fbeee0", "--krust-lilac": "#eef5ec", "--krust-mint": "#dcefdc", "--krust-butter": "#fff4d1", "--krust-gold": "#d4a72c" },
  newyear: { "--krust-red": "#4b33c9", "--krust-red-deep": "#2c1f8a", "--krust-cocoa": "#5a5476", "--krust-petal": "#ddd6f3", "--krust-peach": "#f3eefe", "--krust-lilac": "#ebe5fb", "--krust-mint": "#e3f1fb", "--krust-butter": "#fff4d1", "--krust-gold": "#d4a72c" },
  pongal: { "--krust-red": "#d9561a", "--krust-red-deep": "#a03a08", "--krust-cocoa": "#6e5233", "--krust-petal": "#f0d7a2", "--krust-peach": "#fde9c8", "--krust-lilac": "#fbf1d6", "--krust-mint": "#e4f1d2", "--krust-butter": "#fff0b3", "--krust-gold": "#d9a520" },
  holi: { "--krust-red": "#d6246e", "--krust-red-deep": "#9c1550", "--krust-cocoa": "#6a4a64", "--krust-petal": "#f1d4ea", "--krust-peach": "#fff0d6", "--krust-lilac": "#efe3fb", "--krust-mint": "#d9f6ea", "--krust-butter": "#fff6c2", "--krust-gold": "#e0a800" },
  eid: { "--krust-red": "#0f7a64", "--krust-red-deep": "#0a5546", "--krust-cocoa": "#4e5f58", "--krust-petal": "#e3dbc0", "--krust-peach": "#f5efdc", "--krust-lilac": "#eef4ee", "--krust-mint": "#dcefe7", "--krust-butter": "#fbf0cf", "--krust-gold": "#c9a13b" },
  spring: { "--krust-red": "#c93f73", "--krust-red-deep": "#962a55", "--krust-cocoa": "#62545a", "--krust-petal": "#f3d6e2", "--krust-peach": "#fdeef3", "--krust-lilac": "#f2ecfa", "--krust-mint": "#e4f3e0", "--krust-butter": "#fff6d9", "--krust-gold": "#9cc26a" },
  summer: { "--krust-red": "#0c8494", "--krust-red-deep": "#07606c", "--krust-cocoa": "#4b5a5c", "--krust-petal": "#cfe9e7", "--krust-peach": "#fff2d4", "--krust-lilac": "#e6f5f5", "--krust-mint": "#dcf4ea", "--krust-butter": "#fff2bf", "--krust-gold": "#f0b429" },
  autumn: { "--krust-red": "#b2461d", "--krust-red-deep": "#7c2d10", "--krust-cocoa": "#6b4e3a", "--krust-petal": "#ecd3b6", "--krust-peach": "#f9e6d1", "--krust-lilac": "#f6ece1", "--krust-mint": "#eef0dc", "--krust-butter": "#fbecc6", "--krust-gold": "#c98a2b" },
  winter: { "--krust-red": "#2f6caf", "--krust-red-deep": "#1d4a7d", "--krust-cocoa": "#4c5b6b", "--krust-petal": "#d6e3f0", "--krust-peach": "#eef4fb", "--krust-lilac": "#eaf0fa", "--krust-mint": "#e3f1f5", "--krust-butter": "#f4f7fc", "--krust-gold": "#9fb8d1" },
  valentines: { "--krust-red": "#e0245e", "--krust-red-deep": "#a3123f", "--krust-cocoa": "#6e4a56", "--krust-petal": "#f6cfd9", "--krust-peach": "#ffe9ec", "--krust-lilac": "#fbe9f1", "--krust-mint": "#ffeef2", "--krust-butter": "#fff1f4", "--krust-gold": "#d99aa9" },
};

export const FESTIVE_THEMES: Record<FestiveThemeId, FestiveTheme> = {
  none: {
    id: "none", kind: "none", label: "No theme", emoji: "🍞", hamperLabel: "Gift hampers", defaultTitle: "Gift hampers", defaultSubtitle: "Handcrafted gift hampers for every occasion",
    effect: "confetti", colors: ["#EC2427", "#F5C542", "#FFFFFF"], from: "#ec2427", via: "#c81c22", to: "#8f1218", gold: "#f5c542", cream: "#fff8e7", blush: "#fde6df",
  },
  diwali: {
    id: "diwali", kind: "festival", label: "Diwali", emoji: "🪔", hamperLabel: "Diwali hampers", defaultTitle: "Happy Diwali", defaultSubtitle: "Light up the festival with our handcrafted gift hampers",
    effect: "fireworks", colors: ["#EC2427", "#FFD45C", "#FFFFFF", "#FF8A3D", "#FFB3C1", "#F5C542"], from: "#ec2427", via: "#c81c22", to: "#8f1218", gold: "#f5c542", cream: "#fff8e7", blush: "#fde6df",
  },
  christmas: {
    id: "christmas", kind: "festival", label: "Christmas", emoji: "🎄", hamperLabel: "Christmas hampers", defaultTitle: "Merry Christmas", defaultSubtitle: "Plum cakes, cookies and gift hampers baked for the season",
    effect: "snow", colors: ["#FFFFFF", "#E8F4FF", "#D9ECFF", "#FFFFFF"], from: "#1f6b3a", via: "#17552d", to: "#0e3a1e", gold: "#f2c14e", cream: "#fbfaf5", blush: "#fbe4e1",
  },
  newyear: {
    id: "newyear", kind: "festival", label: "New Year", emoji: "🎆", hamperLabel: "New Year hampers", defaultTitle: "Happy New Year", defaultSubtitle: "Ring in the new year with something freshly baked",
    effect: "fireworks", colors: ["#FFD45C", "#FFFFFF", "#C9A2FF", "#7FD3FF", "#FF8AD8", "#F5C542"], from: "#1d1b4b", via: "#2b2470", to: "#120f33", gold: "#e8c25a", cream: "#fbf8f1", blush: "#f1e8fb",
  },
  pongal: {
    id: "pongal", kind: "festival", label: "Pongal", emoji: "🌾", hamperLabel: "Pongal hampers", defaultTitle: "Happy Pongal", defaultSubtitle: "Celebrate the harvest with sweet, golden bakes",
    effect: "petals", colors: ["#F5A623", "#FFD45C", "#7CB342", "#EC2427", "#FF8A3D"], from: "#d9731a", via: "#c25e0e", to: "#8a3f06", gold: "#ffd45c", cream: "#fff8e3", blush: "#fdebd2",
  },
  holi: {
    id: "holi", kind: "festival", label: "Holi", emoji: "🎨", hamperLabel: "Holi hampers", defaultTitle: "Happy Holi", defaultSubtitle: "A box full of colour for the festival of colours",
    effect: "confetti", colors: ["#FF3D7F", "#FFD23F", "#3DDC97", "#3A86FF", "#9B5DE5", "#FF8A3D"], from: "#d6336c", via: "#9b2ccf", to: "#3a3fc4", gold: "#ffd23f", cream: "#fffaf3", blush: "#fde4ef",
  },
  eid: {
    id: "eid", kind: "festival", label: "Eid", emoji: "🌙", hamperLabel: "Eid hampers", defaultTitle: "Eid Mubarak", defaultSubtitle: "Share the joy of Eid with our festive gift hampers",
    effect: "lanterns", colors: ["#F2C14E", "#FFE8A3", "#FFFFFF", "#7FD1B9"], from: "#0f6b5c", via: "#0b5649", to: "#063a31", gold: "#f2c14e", cream: "#fbf8ef", blush: "#e4f2ec",
  },
  valentines: {
    id: "valentines", kind: "festival", label: "Valentine's Day", emoji: "💝", hamperLabel: "Valentine hampers", defaultTitle: "Happy Valentine's Day", defaultSubtitle: "Say it with something sweet",
    effect: "petals", colors: ["#FF4D6D", "#FF8FA3", "#FFFFFF", "#C9184A", "#FFB3C1"], from: "#e0245e", via: "#c0134a", to: "#800f35", gold: "#ffc2d1", cream: "#fff7f8", blush: "#fde1e7",
  },
  spring: {
    id: "spring", kind: "season", label: "Spring", emoji: "🌸", hamperLabel: "Spring hampers", defaultTitle: "Hello, Spring", defaultSubtitle: "Fresh bakes and blossom-pretty gift boxes for the new season",
    effect: "blossoms", colors: ["#FFB7CE", "#FF8FB1", "#FFFFFF", "#FFD1E0", "#F7A8C4"], from: "#e0679a", via: "#c94a7e", to: "#8f2f5c", gold: "#c6e59b", cream: "#fffafc", blush: "#fde8f0",
  },
  summer: {
    id: "summer", kind: "season", label: "Summer", emoji: "☀️", hamperLabel: "Summer hampers", defaultTitle: "Sunny Summer Bakes", defaultSubtitle: "Light, bright treats for long sunny days",
    effect: "sparkles", colors: ["#FFD23F", "#FFFFFF", "#FFE58A", "#FFB347"], from: "#12a4b3", via: "#0c8696", to: "#075f6b", gold: "#ffd23f", cream: "#fffdf6", blush: "#e2f5f3",
  },
  autumn: {
    id: "autumn", kind: "season", label: "Autumn", emoji: "🍁", hamperLabel: "Autumn hampers", defaultTitle: "Cosy Autumn Bakes", defaultSubtitle: "Warm spices, toasted nuts and golden crusts for the cosy season",
    effect: "leaves", colors: ["#C0561E", "#E08A2E", "#B33A1F", "#D9A13B", "#8A4B1E"], from: "#c0561e", via: "#9a3d12", to: "#5e230a", gold: "#f2b84b", cream: "#fdf8f0", blush: "#f8e4d4",
  },
  winter: {
    id: "winter", kind: "season", label: "Winter", emoji: "❄️", hamperLabel: "Winter hampers", defaultTitle: "Warm Winter Treats", defaultSubtitle: "Fresh-baked comfort for chilly days",
    effect: "snow", colors: ["#FFFFFF", "#EAF4FF", "#D6E8FA", "#FFFFFF"], from: "#3b7fc4", via: "#2c62a0", to: "#1a3d6b", gold: "#dcecff", cream: "#f8fbff", blush: "#e3eefa",
  },
};

export const FESTIVE_THEME_IDS = Object.keys(FESTIVE_THEMES) as FestiveThemeId[];

export const isFestiveThemeId = (v: unknown): v is FestiveThemeId => typeof v === "string" && Object.hasOwn(FESTIVE_THEMES, v);

/** Older saved settings have no theme; they were Diwali. */
export const themeOf = (id: unknown): FestiveTheme => FESTIVE_THEMES[isFestiveThemeId(id) ? id : "diwali"];

/** CSS variables a theme sets on the storefront root. */
export const themeStyle = (t: FestiveTheme): Record<string, string> => ({
  "--fest-from": t.from, "--fest-via": t.via, "--fest-to": t.to, "--fest-gold": t.gold,
  ...(t.id === "none" ? {} : { "--krust-cream": t.cream, "--krust-blush": t.blush, ...(PALETTES[t.id] ?? {}) }),
});
