import type { CSSProperties } from 'react';
import {
  ListChecks,
  BookOpen,
  BookOpenCheck,
  Crown,
  GraduationCap,
  Heart,
  MessageSquareQuote,
  Scale,
  Sun,
  TextCursorInput,
  Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import type { Horse, ModeId } from '../engine/modes';

/** Line icons: one stroke weight across the app. */
export const STROKE = 1.6;

/** Custom line icon in the Lucide grid: a horse head. */
export function HorseHead({ size = 24, strokeWidth = STROKE, ...rest }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(rest as object)}
    >
      <path d="M6 21c-.6-3-.4-6 .8-8.6C8 9.6 10.4 7 13.4 6.6l.9-2.6 1.6 2.4c2.4.9 4 3 4.6 5.6.3 1.3-.6 2.4-1.9 2.4-1.2 0-2-.6-3-.6-.8 1.6-.6 4.4.4 7.2" />
      <path d="M8.6 10.2 6.4 9.6M7.6 13l-2.4-.2M7 15.8l-2.2.4" />
      <circle cx="15.4" cy="9.8" r=".6" fill="currentColor" />
    </svg>
  );
}

export const MODE_ICON: Record<ModeId, LucideIcon> = {
  classic: Crown,
  daily: Sun,
  truefalse: Scale,
  book: BookOpen,
  who: MessageSquareQuote,
  blank: TextCursorInput,
  study: GraduationCap,
  speed: Zap,
  survival: Heart,
  recall: BookOpenCheck,
  quiz: ListChecks,
};

/** Line icon on a tile tinted with its horse colour. */
export function IconTile({
  horse,
  icon: Icon,
  size = 44,
  iconSize,
  style,
}: {
  horse: Horse;
  icon: LucideIcon | typeof HorseHead;
  size?: number;
  iconSize?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`icon-tile horse-${horse}`}
      style={{ width: size, height: size, borderRadius: size * 0.32, ...style }}
      aria-hidden
    >
      <Icon size={iconSize ?? Math.round(size * 0.5)} strokeWidth={STROKE} />
    </span>
  );
}
