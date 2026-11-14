// Fixes words the machine translator got wrong in a Bible setting. It mostly
// reached for Hindu words:
//   Lord / LORD / Yahweh  -> கிருஷ்ணர் (Krishna), or garbled கிருத்தர் / கிருத்து / கிருத்திரம்
//   prophet               -> தேரோட்டி / தேரோட்டம் (charioteer)
//   temple                -> கோயில்
//   Gentiles              -> பூஜை,  ram -> ராமர்,  Sivan (the month) -> சிவன்
// The English next to each Tamil string decides the right word (BSI Tamil Bible
// words), and the Tamil case ending is kept (கிருஷ்ணருக்கு -> கர்த்தருக்கு).
//
// Used when merging translations into the packs (so new translations are fixed
// too) and by scripts/fix-tamil.mjs to clean the translation files.

const TA = '[\\u0B80-\\u0BFF]';
/** A Tamil word made of `stem` + the rest of the word (its case ending). */
const word = (stem) => new RegExp(`(?<!${TA})${stem}(${TA}*)`, 'gu');
/** Vowel signs and the pulli (்) that can follow a consonant. */
const SIGN = /^[ா-்]/u;

/** Puts the case ending of a "…ர"-type noun onto a new word. */
function inflect(rest, plain, joiner) {
  // rest starts with ் (கிருஷ்ணர்) or a vowel sign (கிருஷ்ணரின் -> ின்)
  if (!rest || rest === '்') return plain;
  if (rest.startsWith('்')) return plain + rest.slice(1); // ர்கள் etc.
  return joiner + rest;
}

// The garbled spellings of "the Lord". Longest first. Each gives the ending
// after the final consonant, so it can be put back on கர்த்தர / கிறிஸ்துவ.
const LORD_STEMS = [
  ['கிருத்திரத்திற்', (r) => 'ு' + r.replace(/^கு/u, 'க்கு')], // கிருத்திரத்திற்கு -> …ருக்கு
  ['கிருத்திரத்த', (r) => r], // கிருத்திரத்தில் -> …ரில்
  ['கிருத்திரம', (r) => r],
  ['கிருத்திரர', (r) => r],
  ['கிருத்திரன', (r) => r],
  ['கிருத்துவர', (r) => r],
  ['கிருத்துவன', (r) => r],
  ['கிருத்துவ', (r) => r], // கிருத்துவுக்கு -> …ருக்கு
  ['கிருத்தவர', (r) => r],
  ['கிருத்தவ', (r) => r],
  ['கிருஷ்ணர', (r) => r],
  ['கிருத்தர', (r) => r],
];

function fixLord(en, ta) {
  const christOnly = /\bChrist\b/.test(en) && !/\b(Lord|LORD|Yahweh|Jehovah)\b/.test(en);
  // English says both Christ and Lord: if the Tamil already has one of them, the
  // garbled word is the other.
  const asChrist = christOnly || (/\bChrist\b/.test(en) && /கர்த்த/u.test(ta) && !/கிறிஸ்து/u.test(ta));
  const put = (rest) =>
    asChrist ? inflect(rest, 'கிறிஸ்து', 'கிறிஸ்துவ') : inflect(rest, 'கர்த்தர்', 'கர்த்தர');
  for (const [stem, ending] of LORD_STEMS) {
    ta = ta.replace(word(stem), (m, rest) => {
      const r = ending(rest);
      return SIGN.test(r) || !r ? put(r) : m;
    });
  }
  // a bare கிருத்து (no ending)
  ta = ta.replace(new RegExp(`(?<!${TA})கிருத்து(?!${TA})`, 'gu'), asChrist ? 'கிறிஸ்து' : 'கர்த்தர்');
  // Rarer garbled spellings (கிருஷ்ணன், கிருத்திரா, கிருத்தாரிடமிருந்து, …): read the
  // case ending off the end of the word.
  if (!/\b(Lord|LORD|Yahweh|Jehovah|Christ)\b/.test(en)) return ta;
  return ta.replace(new RegExp(`(?<!${TA})(?:கிருஷ்ண|கிருத்)${TA}*`, 'gu'), (w) => {
    const [, lord, christ] = ENDINGS.find(([end]) => w.endsWith(end)) ?? ['', 'கர்த்தர்', 'கிறிஸ்து'];
    return asChrist ? christ : lord;
  });
}

const ENDINGS = [
  ['டமிருந்து', 'கர்த்தரிடமிருந்து', 'கிறிஸ்துவிடமிருந்து'],
  ['லிருந்து', 'கர்த்தரிடமிருந்து', 'கிறிஸ்துவிலிருந்து'],
  ['டம்', 'கர்த்தரிடம்', 'கிறிஸ்துவிடம்'],
  ['க்கும்', 'கர்த்தருக்கும்', 'கிறிஸ்துவுக்கும்'],
  ['கு', 'கர்த்தருக்கு', 'கிறிஸ்துவுக்கு'],
  ['ின்', 'கர்த்தரின்', 'கிறிஸ்துவின்'],
  ['ில்', 'கர்த்தரில்', 'கிறிஸ்துவில்'],
  ['ால்', 'கர்த்தரால்', 'கிறிஸ்துவால்'],
  ['ை', 'கர்த்தரை', 'கிறிஸ்துவை'],
  ['ப்', 'கர்த்தரைப்', 'கிறிஸ்துவைப்'],
];

function fixProphet(en, ta) {
  if (!/தேரோட்ட/u.test(ta)) return ta;
  if (/prophet/i.test(en)) {
    return ta
      .replace(word('தேரோட்டக்காரர்'), (m, r) => 'தீர்க்கதரிசி' + r)
      .replace(word('தேரோட்டங்க'), (m, r) => 'தீர்க்கதரிசிக' + r)
      .replace(word('தேரோட்டத்திற்கு'), (m, r) => 'தீர்க்கதரிசிக்கு' + r)
      .replace(word('தேரோட்டத்த'), (m, r) => 'தீர்க்கதரிசிய' + r)
      .replace(word('தேரோட்டம்'), (m, r) => 'தீர்க்கதரிசி' + r)
      .replace(word('தேரோட்டி'), (m, r) => 'தீர்க்கதரிசி' + r);
  }
  if (/proph(ec|es)/i.test(en)) {
    return ta.replace(word('தேரோட்டம்'), (m, r) => 'தீர்க்கதரிசனம்' + r).replace(word('தேரோட்டத்த'), (m, r) => 'தீர்க்கதரிசனத்த' + r);
  }
  if (/chariot/i.test(en) && !/charioteer/i.test(en)) {
    return ta
      .replace(word('தேரோட்டங்க'), (m, r) => 'இரதங்க' + r)
      .replace(word('தேரோட்டத்த'), (m, r) => 'இரதத்த' + r)
      .replace(word('தேரோட்டம்'), (m, r) => 'இரதம்' + r)
      .replace(new RegExp(`(?<!${TA})தேரோட்ட(?!${TA})`, 'gu'), 'இரத');
  }
  return ta;
}

const PAGAN = /\b(Baal|Dagon|Ashtoreth|Rimmon|Nisroch|Artemis|Diana|Chemosh|Molech|idols?|gods|goddess|Bel|Zeus)\b/i;

function fixTemple(en, ta) {
  if (!/கோயில/u.test(ta)) return ta;
  if (!/\b(temple|sanctuary|house)/i.test(en) || PAGAN.test(en)) return ta;
  return ta
    .replace(word('கோயில்க'), (m, r) => 'ஆலயங்க' + r)
    .replace(word('கோயிலுக்'), (m, r) => 'ஆலயத்திற்' + r)
    .replace(word('கோயில'), (m, r) => (r === '்' ? 'ஆலயம்' : SIGN.test(r) ? 'ஆலயத்த' + r : m));
}

/** தெய்வம் for "God" (the one God) -> தேவன். Left alone for "gods". */
function fixGod(en, ta) {
  if (!/தெய்வ/u.test(ta) || !/\bGod\b/.test(en) || /\bgods\b/i.test(en)) return ta;
  return ta
    .replace(word('தெய்வத்திற்கு'), (m, r) => 'தேவனுக்கு' + r)
    .replace(word('தெய்வத்தை'), (m, r) => 'தேவனை' + r)
    .replace(word('தெய்வத்தின்'), (m, r) => 'தேவனின்' + r)
    .replace(word('தெய்வத்தால்'), (m, r) => 'தேவனால்' + r)
    .replace(word('தெய்வமான'), (m, r) => 'தேவனாகிய' + r)
    .replace(word('தெய்வமாக'), (m, r) => 'தேவனாக' + r)
    .replace(word('தெய்வமும்'), (m, r) => 'தேவனும்' + r)
    .replace(word('தெய்வம்'), (m, r) => 'தேவன்' + r);
}

function fixSmall(en, ta) {
  if (/\bSivan\b/.test(en)) ta = ta.replace(word('சிவன்'), (m, r) => 'சீவான்' + r);
  if (/\bGentiles?\b/.test(en)) {
    ta = ta
      .replace(word('பூஜாதியார'), (m, r) => 'புறஜாதியார' + r)
      .replace(word('பூஜையாளர'), (m, r) => 'புறஜாதியார' + r)
      .replace(word('பூஜையிலும்'), (m, r) => 'புறஜாதியார்மேலும்' + r)
      .replace(word('பூஜைய'), (m, r) => 'புறஜாதியார' + r)
      .replace(word('பூஜை'), (m, r) => (r ? m : 'புறஜாதியார்'));
  }
  if (/\bram\b/.test(en)) ta = ta.replace(word('ராமர்'), (m, r) => 'ஆட்டுக்கடா' + r);
  if (/\bRam\b/.test(en)) ta = ta.replace(word('ராமர்'), (m, r) => 'ராம்' + r);
  return ta;
}

/** The Tamil with the known wrong words replaced. `en` is the English it was translated from. */
export function fixTamil(en, ta) {
  if (!ta || !en) return ta;
  return fixSmall(en, fixGod(en, fixTemple(en, fixProphet(en, fixLord(en, ta)))));
}

/** Words that should never be left in Bible Tamil (a check for tests and reports). */
export const NOT_BIBLE = /கிருஷ்ண|தேரோட்டம்|பூஜை/u;
