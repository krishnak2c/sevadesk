/**
 * `notes` is stored server-side as an array of strings (max 20 × 500 chars),
 * while forms edit a single textarea. These two helpers are the translation.
 */

export function toNotesArray(text) {
  const trimmed = (text ?? '').trim();
  return trimmed ? [trimmed] : [];
}

export function notesText(notes) {
  if (typeof notes === 'string') return notes.trim();
  if (!Array.isArray(notes)) return '';
  return notes
    .filter((note) => typeof note === 'string' && note.trim())
    .join('\n')
    .trim();
}
