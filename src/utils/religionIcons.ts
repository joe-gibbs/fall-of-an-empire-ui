import { WebkilnAssetPath } from './assets';

/** Specific religion icon when an id is known; generic religions icon otherwise. */
export function religionIconPath(id?: string | null): string {
  if (id) {
    return WebkilnAssetPath(`/assets/religions/${id}.png`) || `/assets/religions/${id}.png`;
  }
  return '/assets/icons/I_Religions.png';
}
