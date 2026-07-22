/**
 * Turn a faction emblem key (e.g. "Gwendic_1") into the matching
 * `/assets/factions/{group}_symbol_{variant}.png` asset path.
 *
 * Falls back to the cultureGroup when no emblem is provided (e.g. "Svaranic"
 * -> Svaranic_symbol_1.png), and finally to the Rephsian default.
 */
export function emblemAssetPath(emblem?: string, cultureGroup?: string): string {
  const source = emblem || (cultureGroup ? `${cultureGroup}_1` : '');
  if (source.startsWith('/') || source.startsWith('gameui://')) return source;
  if (!source) return '/assets/factions/Rephsian_symbol_1.png';
  const idx = source.lastIndexOf('_');
  if (idx <= 0) return `/assets/factions/${source}_symbol_1.png`;
  const group = source.slice(0, idx);
  const variant = source.slice(idx + 1);
  return `/assets/factions/${group}_symbol_${variant}.png`;
}
