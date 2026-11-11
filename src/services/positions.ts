import type { Player, PreferredPosition } from '../types';

export const ALL_POSITIONS: PreferredPosition[] = ['GK', 'DEF', 'MID', 'FWD'];

export const POSITION_LABELS: Record<PreferredPosition, string> = {
  GK: 'Kaleci',
  DEF: 'Defans',
  MID: 'Orta Saha',
  FWD: 'Forvet',
};

/** Bir kartta gösterilebilecek azami mevki sayısı (ana + ek). */
export const MAX_POSITIONS = 3;

/** Ana mevki + ek mevkiler; tekrarsız ve en fazla MAX_POSITIONS adet. Ana mevki daima ilk sıradadır. */
export function getPlayerPositions(
  p: Pick<Player, 'position' | 'secondaryPositions'>
): PreferredPosition[] {
  const out: PreferredPosition[] = [p.position];
  for (const pos of p.secondaryPositions ?? []) {
    if (!out.includes(pos)) out.push(pos);
  }
  return out.slice(0, MAX_POSITIONS);
}

/** "MID / FWD" gibi metin gösterimi. */
export function formatPositions(p: Pick<Player, 'position' | 'secondaryPositions'>): string {
  return getPlayerPositions(p).join(' / ');
}
