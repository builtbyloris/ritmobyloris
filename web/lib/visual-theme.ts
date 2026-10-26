export type RitmoPalette = "ritmo" | "nordic" | "ocean" | "cherry" | "espresso" | "graphite";

export const RITMO_PALETTES: ReadonlyArray<{
  value: RitmoPalette;
  label: string;
  description: string;
  colors: readonly [string, string, string];
}> = [
  { value: "ritmo", label: "Ritmo", description: "Lavanda e ambra", colors: ["#8379ee", "#f6b943", "#171c29"] },
  { value: "nordic", label: "Nordico", description: "Ghiaccio e perla", colors: ["#6e98c8", "#d8d5ca", "#101923"] },
  { value: "ocean", label: "Oceano", description: "Blu e acqua", colors: ["#4d8ef7", "#45d2ca", "#091a26"] },
  { value: "cherry", label: "Ciliegio", description: "Rosa e prugna", colors: ["#b45f8d", "#e7a2bc", "#21101a"] },
  { value: "espresso", label: "Espresso", description: "Moka e crema", colors: ["#8b6752", "#d2ad78", "#1d1512"] },
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
