import { WebkilnAssetPath } from './assets';

/** Specific culture icon when an id is known; generic cultures icon otherwise. */
export function cultureIconPath(id?: string | null): string {
  if (id) {
    return WebkilnAssetPath(`/assets/cultures/${id}.png`) || `/assets/cultures/${id}.png`;
  }
  return '/assets/icons/I_Cultures.png';
}
