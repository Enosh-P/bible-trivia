import data from '../../content/gospel.json';
import type { Horse } from './modes';

type L = { en: string; ta: string };

export interface GospelStep {
  id: string;
  icon: string;
  horse: Horse;
  verses: string[];
  title: L;
  body: L;
  prayer?: L;
  next?: L;
}

export interface Faq {
  id: string;
  verses: string[];
  reading: string[];
  q: L;
  a: L;
}

export interface Source {
  id: string;
  author: L;
  title: string;
}

export const GOSPEL_STEPS = data.steps as GospelStep[];
export const FAQS = data.faqs as Faq[];
export const SOURCES = data.sources as Source[];
export const SOURCE_BY_ID: Record<string, Source> = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
