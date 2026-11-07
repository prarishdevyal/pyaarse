export const ADMIN_NOTE_MAX = 1000;

/** Tidies an admin's order note: trimmed, Windows line breaks unified, capped in length. Empty removes it. */
export function cleanAdminNote(raw: unknown): string {
  return String(raw ?? "").replace(/\r\n?/g, "\n").trim().slice(0, ADMIN_NOTE_MAX);
}
