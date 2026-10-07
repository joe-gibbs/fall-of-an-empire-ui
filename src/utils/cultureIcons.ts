import { WebkilnAssetPath } from './assets';
import type { CultureInfo } from '../bridge-types.generated';

const CULTURE_GROUP_HEADER_IDS = new Set([
  'rephsian',
  'neutarnic',
  'svaranic',
  'tarhanic',
  'imerassian',
  'hybrid',
]);

function assetPath(path: string): string {
  return WebkilnAssetPath(path) || path;
}

/** Specific culture icon when an id is known; generic cultures icon otherwise. */
export function cultureIconPath(culture?: string | Pick<CultureInfo, 'iconId'> | null): string {
  const id = typeof culture === 'string' ? culture : culture?.iconId;
  if (id) {
    return assetPath(`/assets/cultures/${id}.png`);
  }
  return '/assets/icons/I_Cultures.png';
}

/** Wide header painting for a culture group, used in the culture details modal. */
export function cultureHeaderImagePath(group?: string | null): string {
  const key = (group ?? '').trim().toLowerCase();
  if (CULTURE_GROUP_HEADER_IDS.has(key)) {
    return assetPath(`/assets/cultures/headers/${key}.png`);
  }
  return assetPath('/assets/warpath/CultureDevelopment.png');
}
