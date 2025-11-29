import { VerseResponse } from "../interfaces/discover.interface";

export function extractSafeVerses(raw: string) {
  raw = raw.replace(/```json|```/g, '').trim();

  // Match all objects that contain "text" and "bibleVerse"
  const objectRegex =
    /\{[^{}]*"text"\s*:\s*"[^"]+"\s*,\s*"bibleVerse"\s*:\s*"[^"]+"\s*\}/g;
  const matches = raw.match(objectRegex);

  if (!matches || matches.length === 0) {
    throw new Error('No valid verse objects found');
  }

  // Wrap in brackets to make a valid JSON array
  const safeJson = `[${matches.join(',')}]`;

  return JSON.parse(safeJson) as VerseResponse[];;
}
