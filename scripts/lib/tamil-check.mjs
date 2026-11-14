// Spots machine translations that went wrong: the translator sometimes gets
// stuck repeating itself ("யார் யார் யார் …", "சி. இ. சி. இ. …") or runs on far
// longer than the English.
const REPEAT = /(.{2,15}?)\1{3,}/u;
const INITIALS = /(\S{1,3}\.\s){5,}/u;

export function looksBroken(en, ta) {
  if (!ta?.trim()) return true;
  if (REPEAT.test(ta.replace(/\s+/g, ''))) return true;
  if (INITIALS.test(ta)) return true;
  return ta.length > 2.5 * en.length + 30;
}
