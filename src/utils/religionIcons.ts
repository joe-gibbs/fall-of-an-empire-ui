import { WebkilnAssetPath } from './assets';

const RELIGION_GROUP_HEADER_IDS = new Set([
  'borgutian',
  'pagan',
  'mystery',
]);

function assetPath(path: string): string {
  return WebkilnAssetPath(path) || path;
}

export function religionIconPath(id?: string | null): string {
  if (id) {
    return assetPath(`/assets/religions/${id}.png`);
  }
  return '/assets/icons/I_Religions.png';
}

export function religionHeaderImagePath(group?: string | null): string {
  const key = (group ?? '').trim().toLowerCase();
  if (RELIGION_GROUP_HEADER_IDS.has(key)) {
    return assetPath(`/assets/religions/headers/${key}.png`);
  }
  return '/assets/icons/I_Religions.png';
}
