export type RitmoPalette = "ritmo" | "ocean" | "graphite" | "paper" | "canvas" | "constellation";
export type RitmoPaletteKind = "gradient" | "texture";

export const RITMO_PALETTES: ReadonlyArray<{
  value: RitmoPalette;
  kind: RitmoPaletteKind;
  label: string;
  description: string;
  colors: readonly [string, string, string];
}> = [
  { value: "ritmo", kind: "gradient", label: "Ritmo", description: "Lavanda e ambra", colors: ["#8379ee", "#f6b943", "#171c29"] },
  { value: "ocean", kind: "gradient", label: "Oceano", description: "Blu e acqua", colors: ["#4d8ef7", "#45d2ca", "#091a26"] },
  { value: "graphite", kind: "gradient", label: "Grafite", description: "Ardesia e argento", colors: ["#7d8ca8", "#c2a976", "#14171d"] },
  { value: "paper", kind: "texture", label: "Carta", description: "Fibre morbide", colors: ["#677c99", "#d1b47c", "#1a1a18"] },
  { value: "canvas", kind: "texture", label: "Tela", description: "Intreccio sottile", colors: ["#946f8b", "#cab88f", "#1d171c"] },
  { value: "constellation", kind: "texture", label: "Costellazione", description: "Punti luminosi", colors: ["#667eea", "#82c7d9", "#0c1020"] },
] as const;

const paletteValues = new Set<RitmoPalette>(RITMO_PALETTES.map(({ value }) => value));

export function normalizePalette(value: unknown): RitmoPalette {
  return typeof value === "string" && paletteValues.has(value as RitmoPalette) ? value as RitmoPalette : "ritmo";
}

export function paletteStorageKey(userId: string) {
  return `ritmo:palette:${userId}:v1`;
}

export function readPalette(userId: string, storage: Pick<Storage, "getItem"> = localStorage) {
  return normalizePalette(storage.getItem(paletteStorageKey(userId)));
}

export function writePalette(userId: string, palette: RitmoPalette, storage: Pick<Storage, "setItem"> = localStorage) {
  storage.setItem(paletteStorageKey(userId), palette);
}
