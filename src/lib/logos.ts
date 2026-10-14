import { siIntel, siNec } from 'simple-icons';

/**
 * Employer marks. Intel and NEC use their official single-color marks from Simple Icons,
 * cropped to the glyph's bounding box so they sit at a consistent height.
 * The others are set as type until official logo files are added.
 */
export type LogoKey = 'intel' | 'nec' | 'pge' | 'seeq' | 'kgh';

export type Logo =
  | { kind: 'svg'; label: string; viewBox: string; path: string }
  | { kind: 'word'; label: string; text: string; style: 'sans' | 'serif' | 'lower' };

export const logos: Record<LogoKey, Logo> = {
  intel: { kind: 'svg', label: 'Intel', viewBox: '-0.05 7.29 24.10 9.41', path: siIntel.path },
  nec: { kind: 'svg', label: 'NEC', viewBox: '-0.05 8.75 24.10 6.50', path: siNec.path },
  pge: { kind: 'word', label: 'Portland General Electric', text: 'PGE', style: 'sans' },
  seeq: { kind: 'word', label: 'Seeq', text: 'seeq', style: 'lower' },
  kgh: { kind: 'word', label: 'Kiernan Group Holdings', text: 'Kiernan Group', style: 'serif' },
};
