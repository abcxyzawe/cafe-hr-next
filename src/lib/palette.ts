export type PaletteId =
  | "cafe"
  | "ocean"
  | "rose"
  | "lavender"
  | "forest"
  | "wine";

export type Palette = {
  id: PaletteId;
  name: string;
  hint: string;
  /** HSL fragments — used inline in <html style="--primary: ..."> */
  light: {
    primary: string;
    primaryFg: string;
    accent: string;
    ring: string;
    chart1: string;
  };
  dark: {
    primary: string;
    primaryFg: string;
    accent: string;
    ring: string;
    chart1: string;
  };
};

export const PALETTES: Palette[] = [
  {
    id: "cafe",
    name: "Cà phê",
    hint: "Espresso brown — mặc định",
    light: {
      primary: "24 60% 35%",
      primaryFg: "36 50% 97%",
      accent: "32 60% 88%",
      ring: "24 60% 45%",
      chart1: "24 70% 45%",
    },
    dark: {
      primary: "32 70% 65%",
      primaryFg: "24 30% 14%",
      accent: "24 15% 22%",
      ring: "32 70% 55%",
      chart1: "32 70% 60%",
    },
  },
  {
    id: "ocean",
    name: "Xanh biển",
    hint: "Calming blue",
    light: {
      primary: "210 80% 40%",
      primaryFg: "210 50% 98%",
      accent: "200 60% 90%",
      ring: "210 80% 50%",
      chart1: "210 75% 50%",
    },
    dark: {
      primary: "205 80% 65%",
      primaryFg: "210 30% 14%",
      accent: "210 20% 22%",
      ring: "205 80% 55%",
      chart1: "205 75% 60%",
    },
  },
  {
    id: "rose",
    name: "Hồng đào",
    hint: "Warm pink",
    light: {
      primary: "340 65% 45%",
      primaryFg: "340 50% 98%",
      accent: "350 70% 92%",
      ring: "340 65% 55%",
      chart1: "340 70% 55%",
    },
    dark: {
      primary: "340 70% 65%",
      primaryFg: "340 30% 14%",
      accent: "340 20% 22%",
      ring: "340 70% 55%",
      chart1: "340 75% 60%",
    },
  },
  {
    id: "lavender",
    name: "Tím lavender",
    hint: "Soft violet",
    light: {
      primary: "270 55% 50%",
      primaryFg: "270 50% 98%",
      accent: "270 60% 93%",
      ring: "270 60% 55%",
      chart1: "270 65% 55%",
    },
    dark: {
      primary: "270 70% 70%",
      primaryFg: "270 30% 14%",
      accent: "270 20% 22%",
      ring: "270 70% 55%",
      chart1: "270 75% 65%",
    },
  },
  {
    id: "forest",
    name: "Xanh lá",
    hint: "Fresh green",
    light: {
      primary: "150 55% 35%",
      primaryFg: "150 50% 98%",
      accent: "150 60% 88%",
      ring: "150 60% 45%",
      chart1: "150 65% 45%",
    },
    dark: {
      primary: "150 60% 60%",
      primaryFg: "150 30% 14%",
      accent: "150 20% 22%",
      ring: "150 60% 50%",
      chart1: "150 65% 55%",
    },
  },
  {
    id: "wine",
    name: "Đỏ rượu",
    hint: "Deep burgundy",
    light: {
      primary: "0 60% 40%",
      primaryFg: "0 50% 98%",
      accent: "0 60% 90%",
      ring: "0 60% 50%",
      chart1: "0 65% 50%",
    },
    dark: {
      primary: "0 65% 65%",
      primaryFg: "0 30% 14%",
      accent: "0 20% 22%",
      ring: "0 65% 55%",
      chart1: "0 70% 60%",
    },
  },
];

export const PALETTE_COOKIE = "cafe-hr-palette";
export const DEFAULT_PALETTE: PaletteId = "cafe";

export function getPaletteById(id: string | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/**
 * Build inline CSS overriding both light and dark mode tokens.
 * Light vars on :root, dark vars under .dark — emitted as a single style block.
 */
export function paletteCSS(p: Palette): string {
  return `
:root {
  --primary: ${p.light.primary};
  --primary-foreground: ${p.light.primaryFg};
  --accent: ${p.light.accent};
  --ring: ${p.light.ring};
  --chart-1: ${p.light.chart1};
}
.dark {
  --primary: ${p.dark.primary};
  --primary-foreground: ${p.dark.primaryFg};
  --accent: ${p.dark.accent};
  --ring: ${p.dark.ring};
  --chart-1: ${p.dark.chart1};
}
`.trim();
}
