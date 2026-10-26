type CommandPaletteShortcutEvent = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey">;

export function isCommandPaletteShortcut(event: CommandPaletteShortcutEvent) {
  return event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
}
