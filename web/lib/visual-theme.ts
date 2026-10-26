export type RitmoPalette = "ritmo" | "aurora" | "ocean" | "forest" | "sunset" | "graphite";

export const RITMO_PALETTES: ReadonlyArray<{
  value: RitmoPalette;
  label: string;
  description: string;
  colors: readonly [string, string, string];
}> = [
  { value: "ritmo", label: "Ritmo", description: "Lavanda e ambra", colors: ["#8379ee", "#f6b943", "#171c29"] },
  { value: "aurora", label: "Aurora", description: "Viola e corallo", colors: ["#a76cf2", "#ff7e79", "#1c1428"] },
  { value: "ocean", label: "Oceano", description: "Blu e acqua", colors: ["#4d8ef7", "#45d2ca", "#091a26"] },
  { value: "forest", label: "Bosco", description: "Verde e miele", colors: ["#4fa980", "#e4ad45", "#101d18"] },
  { value: "sunset", label: "Tramonto", description: "Terracotta e rosa", colors: ["#d86f67", "#ef9a72", "#251518"] },
  { value: "graphite", label: "Grafite", description: "Ardesia e argento", colors: ["#7d8ca8", "#c2a976", "#14171d"] },
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
