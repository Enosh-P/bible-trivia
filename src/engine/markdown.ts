/**
 * The small formatting language of Daily Thoughts (and later Gospel answers):
 * paragraphs, **bold**, *italic*, "- " and "1. " lists, and pictures
 * ![what the picture shows](https://…). Parsed into a tree that
 * src/components/Markdown.tsx turns into React elements, so text written by an
 * author is never put on the page as raw HTML.
 */
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; c: Inline[] }
  | { t: 'italic'; c: Inline[] }
  | { t: 'image'; alt: string; url: string }
  | { t: 'br' };

export type Block =
  | { t: 'p'; c: Inline[] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; start: number; items: Inline[][] }
  | { t: 'image'; alt: string; url: string };

/** Only ordinary web addresses may be used for pictures (no javascript:, data: …). */
export function safeImageUrl(url: string): string | null {
  const u = url.trim();
  if (!/^https?:\/\/[^\s"'<>]+$/i.test(u)) return null;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

const IMAGE = /!\[([^\]\n]*)\]\(([^)\s]+)\)/;
const BOLD = /\*\*(?=\S)([\s\S]*?\S)\*\*/;
const ITALIC = /(?<![*\w])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?!\*)|(?<![_\w])_(?=[^\s_])([^_\n]*?[^\s_])_(?![_\w])/;

function push(out: Inline[], text: string) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last?.t === 'text') last.v += text;
  else out.push({ t: 'text', v: text });
}

/** Bold, italic and pictures inside one line of text. */
export function parseInline(text: string, depth = 0): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  while (rest) {
    const found = (
      [
        ['image', IMAGE.exec(rest)],
        ['bold', BOLD.exec(rest)],
        ['italic', ITALIC.exec(rest)],
      ] as const
    )
      .filter((f): f is readonly ['image' | 'bold' | 'italic', RegExpExecArray] => f[1] !== null)
      .sort((a, b) => a[1].index - b[1].index)[0];
    if (!found || depth > 3) {
      push(out, rest);
      break;
    }
    const [kind, m] = found;
    push(out, rest.slice(0, m.index));
    if (kind === 'image') {
      const url = safeImageUrl(m[2]);
      if (url) out.push({ t: 'image', alt: m[1].trim(), url });
      else push(out, m[0]); // not a web address: shown as typed
    } else {
      out.push({ t: kind, c: parseInline(m[1] ?? m[2], depth + 1) });
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const IMAGE_LINE = /^\s*!\[[^\]\n]*\]\([^)\s]+\)\s*$/;

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (!para.length) return;
    const c: Inline[] = [];
    para.forEach((line, i) => {
      if (i) c.push({ t: 'br' });
      c.push(...parseInline(line));
    });
    // A picture on a line of its own is shown full width.
    if (c.length === 1 && c[0].t === 'image') blocks.push({ t: 'image', alt: c[0].alt, url: c[0].url });
    else blocks.push({ t: 'p', c });
    para = [];
  };

  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const bullet = BULLET.exec(line);
    const number = bullet ? null : NUMBER.exec(line);
    if (!line.trim()) {
      flush();
    } else if (bullet) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.t === 'ul') last.items.push(parseInline(bullet[1]));
      else blocks.push({ t: 'ul', items: [parseInline(bullet[1])] });
    } else if (number) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.t === 'ol') last.items.push(parseInline(number[2]));
      else blocks.push({ t: 'ol', start: Number(number[1]), items: [parseInline(number[2])] });
    } else if (IMAGE_LINE.test(line)) {
      // A picture line always stands alone, even without a blank line around it.
      flush();
      para.push(line.trim());
      flush();
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

function inlineText(c: Inline[]): string {
  return c.map((n) => (n.t === 'text' ? n.v : n.t === 'br' ? ' ' : n.t === 'image' ? '' : inlineText(n.c))).join('');
}

/** The words only (no stars, bullets or pictures), for previews and search. */
export function plainText(src: string): string {
  return parseMarkdown(src)
    .map((b) => (b.t === 'p' ? inlineText(b.c) : b.t === 'image' ? '' : b.items.map(inlineText).join(' ')))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The first words of a text, cut at a word and ended with "…". */
export function excerpt(src: string, max = 140): string {
  const text = plainText(src);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}
