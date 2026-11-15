import { useMemo, useState, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import { parseMarkdown, type Inline } from '../engine/markdown';
import { STROKE } from './icons';

/** A picture in a post. Offline (or if it was deleted) its description is shown instead. */
export function PostImage({ url, alt, className = 'md-img' }: { url: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`${className} is-missing`} role="img" aria-label={alt}>
        <ImageOff size={18} strokeWidth={STROKE} aria-hidden />
        {alt && <span>{alt}</span>}
      </span>
    );
  }
  return <img className={className} src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

function inline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return n.v;
      case 'br':
        return <br key={i} />;
      case 'bold':
        return <strong key={i}>{inline(n.c)}</strong>;
      case 'italic':
        return <em key={i}>{inline(n.c)}</em>;
      case 'image':
        return <PostImage key={i} url={n.url} alt={n.alt} className="md-img is-inline" />;
    }
  });
}

/**
 * Shows text written with the small formatting language of engine/markdown.ts.
 * Everything becomes React elements (text is escaped by React); no HTML from
 * the author is ever put on the page.
 */
export function Markdown({ text, lang }: { text: string; lang?: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <div className="md" lang={lang}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return <p key={i}>{inline(b.c)}</p>;
          case 'ul':
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} start={b.start}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            );
          case 'image':
            return (
              <figure key={i} className="md-figure">
                <PostImage url={b.url} alt={b.alt} />
              </figure>
            );
        }
      })}
    </div>
  );
}
