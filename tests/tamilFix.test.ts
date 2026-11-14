import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS build script
import { fixTamil } from '../scripts/lib/tamil-fix.mjs';

describe('Tamil Bible word fixes', () => {
  it('turns Krishna for "Lord" into கர்த்தர், keeping the case ending', () => {
    expect(fixTamil('The word of the Lord', 'கிருஷ்ணரின் வார்த்தை')).toBe('கர்த்தரின் வார்த்தை');
    expect(fixTamil('Thank Yahweh', 'கிருஷ்ணருக்கு நன்றி')).toBe('கர்த்தருக்கு நன்றி');
    expect(fixTamil('Hope in the Lord', 'கிருத்துவத்தில் நம்பிக்கை')).toBe('கர்த்தரில் நம்பிக்கை');
  });
  it('turns Krishna for "Christ" into கிறிஸ்து', () => {
    expect(fixTamil('Raised with Christ', 'கிருஷ்ணருடன் எழுப்பப்பட்டது')).toBe('கிறிஸ்துவுடன் எழுப்பப்பட்டது');
  });
  it('fixes prophet, temple, Gentiles and leaves pagan temples alone', () => {
    expect(fixTamil('A prophet', 'ஒரு தேரோட்டம்')).toBe('ஒரு தீர்க்கதரிசி');
    expect(fixTamil('Rebuild the temple', 'கோயிலைக் கட்டு')).toBe('ஆலயத்தைக் கட்டு');
    expect(fixTamil('The temple of Dagon', 'தாகோனின் கோயில்')).toBe('தாகோனின் கோயில்');
    expect(fixTamil('Gentiles', 'பூஜையின் காலங்கள்')).toBe('புறஜாதியாரின் காலங்கள்');
  });
  it('no question pack calls the Lord Krishna', () => {
    for (const dir of ['public/packs/mcq/', 'public/packs/uw/']) {
      for (const f of readdirSync(dir)) expect(readFileSync(dir + f, 'utf8'), dir + f).not.toMatch(/கிருஷ்ண|தேரோட்டம்|பூஜை/u);
    }
  });
});
