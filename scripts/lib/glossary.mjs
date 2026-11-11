// Swaps Bible names and terms for their Tamil Bible spellings before machine
// translation, so the translation keeps them (e.g. David → தாவீது, God → தேவன்).
import { readFileSync } from 'node:fs';

const { terms } = JSON.parse(readFileSync(new URL('../../content/glossary/names-ta.json', import.meta.url), 'utf8'));
const keys = Object.keys(terms).sort((a, b) => b.length - a.length);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(`(?<![A-Za-z])(${keys.map(escape).join('|')})(?![A-Za-z])`, 'g');

export function protectNames(english) {
  return english.replace(pattern, (m) => terms[m]);
}
