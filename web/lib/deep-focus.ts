type DeepFocusShortcutEvent = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey">;

export function isDeepFocusShortcut(event: DeepFocusShortcutEvent) {
  return event.key.toLowerCase() === "d" && event.shiftKey && (event.metaKey || event.ctrlKey);
}
