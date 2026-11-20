/** Festival themes the dev admin can switch the storefront to. Shared by server and browser. */

export type FestiveThemeId = "none" | "diwali" | "christmas" | "newyear" | "pongal" | "holi" | "eid" | "valentines";

/** The canvas effect a theme plays: crackers, falling snow, confetti, petals or lanterns. */
export type FestiveEffect = "fireworks" | "snow" | "confetti" | "petals" | "lanterns";

export type FestiveTheme = {
  id: FestiveThemeId;
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
  valentines: { "--krust-red": "#e0245e", "--krust-red-deep": "#a3123f", "--krust-cocoa": "#6e4a56", "--krust-petal": "#f6cfd9", "--krust-peach": "#ffe9ec", "--krust-lilac": "#fbe9f1", "--krust-mint": "#ffeef2", "--krust-butter": "#fff1f4", "--krust-gold": "#d99aa9" },
};

export const FESTIVE_THEMES: Record<FestiveThemeId, FestiveTheme> = {
  none: {
    id: "none", label: "No theme", emoji: "🍞", hamperLabel: "Gift hampers", defaultTitle: "Gift hampers", defaultSubtitle: "Handcrafted gift hampers for every occasion",
    effect: "confetti", colors: ["#EC2427", "#F5C542", "#FFFFFF"], from: "#ec2427", via: "#c81c22", to: "#8f1218", gold: "#f5c542", cream: "#fff8e7", blush: "#fde6df",
  },
  diwali: {
    id: "diwali", label: "Diwali", emoji: "🪔", hamperLabel: "Diwali hampers", defaultTitle: "Happy Diwali", defaultSubtitle: "Light up the festival with our handcrafted gift hampers",
    effect: "fireworks", colors: ["#EC2427", "#FFD45C", "#FFFFFF", "#FF8A3D", "#FFB3C1", "#F5C542"], from: "#ec2427", via: "#c81c22", to: "#8f1218", gold: "#f5c542", cream: "#fff8e7", blush: "#fde6df",
  },
  christmas: {
    id: "christmas", label: "Christmas", emoji: "🎄", hamperLabel: "Christmas hampers", defaultTitle: "Merry Christmas", defaultSubtitle: "Plum cakes, cookies and gift hampers baked for the season",
    effect: "snow", colors: ["#FFFFFF", "#E8F4FF", "#D9ECFF", "#FFFFFF"], from: "#1f6b3a", via: "#17552d", to: "#0e3a1e", gold: "#f2c14e", cream: "#fbfaf5", blush: "#fbe4e1",
  },
  newyear: {
    id: "newyear", label: "New Year", emoji: "🎆", hamperLabel: "New Year hampers", defaultTitle: "Happy New Year", defaultSubtitle: "Ring in the new year with something freshly baked",
    effect: "fireworks", colors: ["#FFD45C", "#FFFFFF", "#C9A2FF", "#7FD3FF", "#FF8AD8", "#F5C542"], from: "#1d1b4b", via: "#2b2470", to: "#120f33", gold: "#e8c25a", cream: "#fbf8f1", blush: "#f1e8fb",
  },
  pongal: {
    id: "pongal", label: "Pongal", emoji: "🌾", hamperLabel: "Pongal hampers", defaultTitle: "Happy Pongal", defaultSubtitle: "Celebrate the harvest with sweet, golden bakes",
    effect: "petals", colors: ["#F5A623", "#FFD45C", "#7CB342", "#EC2427", "#FF8A3D"], from: "#d9731a", via: "#c25e0e", to: "#8a3f06", gold: "#ffd45c", cream: "#fff8e3", blush: "#fdebd2",
  },
  holi: {
    id: "holi", label: "Holi", emoji: "🎨", hamperLabel: "Holi hampers", defaultTitle: "Happy Holi", defaultSubtitle: "A box full of colour for the festival of colours",
    effect: "confetti", colors: ["#FF3D7F", "#FFD23F", "#3DDC97", "#3A86FF", "#9B5DE5", "#FF8A3D"], from: "#d6336c", via: "#9b2ccf", to: "#3a3fc4", gold: "#ffd23f", cream: "#fffaf3", blush: "#fde4ef",
  },
  eid: {
    id: "eid", label: "Eid", emoji: "🌙", hamperLabel: "Eid hampers", defaultTitle: "Eid Mubarak", defaultSubtitle: "Share the joy of Eid with our festive gift hampers",
    effect: "lanterns", colors: ["#F2C14E", "#FFE8A3", "#FFFFFF", "#7FD1B9"], from: "#0f6b5c", via: "#0b5649", to: "#063a31", gold: "#f2c14e", cream: "#fbf8ef", blush: "#e4f2ec",
  },
  valentines: {
    id: "valentines", label: "Valentine's Day", emoji: "💝", hamperLabel: "Valentine hampers", defaultTitle: "Happy Valentine's Day", defaultSubtitle: "Say it with something sweet",
    effect: "petals", colors: ["#FF4D6D", "#FF8FA3", "#FFFFFF", "#C9184A", "#FFB3C1"], from: "#e0245e", via: "#c0134a", to: "#800f35", gold: "#ffc2d1", cream: "#fff7f8", blush: "#fde1e7",
  },
};

export const FESTIVE_THEME_IDS = Object.keys(FESTIVE_THEMES) as FestiveThemeId[];

export const isFestiveThemeId = (v: unknown): v is FestiveThemeId => typeof v === "string" && v in FESTIVE_THEMES;

/** Older saved settings have no theme; they were Diwali. */
export const themeOf = (id: unknown): FestiveTheme => FESTIVE_THEMES[isFestiveThemeId(id) ? id : "diwali"];

/** CSS variables a theme sets on the storefront root. */
export const themeStyle = (t: FestiveTheme): Record<string, string> => ({
  "--fest-from": t.from, "--fest-via": t.via, "--fest-to": t.to, "--fest-gold": t.gold,
  ...(t.id === "none" ? {} : { "--krust-cream": t.cream, "--krust-blush": t.blush, ...(PALETTES[t.id] ?? {}) }),
});
