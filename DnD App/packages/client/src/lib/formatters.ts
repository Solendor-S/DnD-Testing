/** Display helpers for SRD data. */

export function formatCr(cr: number): string {
  if (cr === 0) return '0';
  if (cr === 0.125) return '1/8';
  if (cr === 0.25) return '1/4';
  if (cr === 0.5) return '1/2';
  return String(cr);
}

export function formatSpellLevel(level: number): string {
  if (level === 0) return 'Cantrip';
  const suffix = level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';
  return `${level}${suffix}-level`;
}

export function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : String(mod);
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatSpeed(speed: Record<string, string>): string {
  return Object.entries(speed)
    .map(([k, v]) => (k === 'walk' ? v : `${k} ${v}`))
    .join(', ');
}
