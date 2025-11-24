// Utility to flatten content tree into verses
import { PassageContentNode } from 'src/shared/types/bible.types';

export function extractVerses(
  content: PassageContentNode[],
): Array<{ verseId: string; verse: string }> {
  const verses: Array<{ verseId: string; verse: string }> = [];
  let currentVerseId = '';
  let currentVerseText = '';
  const pushVerse = () => {
    if (currentVerseId && currentVerseText) {
      verses.push({ verseId: currentVerseId, verse: currentVerseText.trim() });
    }
  };
  for (const para of content) {
    if (!Array.isArray(para.items)) continue;
    for (const item of para.items) {
      if (
        item?.name === 'verse' &&
        (item.attrs as Record<string, unknown>)?.sid
      ) {
        pushVerse();
        // sid is like 'GEN 1:1', want 'GEN.1.1'
        const sidVal = (item.attrs as Record<string, unknown>).sid;
        if (typeof sidVal === 'string') {
          const sidStr = sidVal;
          const sidParts = sidStr.split(' ');
          currentVerseId =
            sidParts.length === 2
              ? sidParts[0] + '.' + sidParts[1].replace(':', '.')
              : sidStr.replace(':', '.');
        } else {
          currentVerseId = '';
        }
        currentVerseText = '';
      } else if (item?.type === 'text') {
        const verseIdAttr = (item.attrs as Record<string, unknown>)?.verseId;
        if (typeof verseIdAttr === 'string') {
          if (verseIdAttr.replace(':', '.') === currentVerseId) {
            currentVerseText += item.text || '';
          }
        }
      }
    }
  }
  pushVerse();
  return verses;
}
