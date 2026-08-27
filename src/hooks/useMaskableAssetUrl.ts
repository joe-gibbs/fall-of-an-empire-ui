import type { CSSProperties } from 'react';
import { isSameOriginGameAssetUrl, WebkilnAssetPath } from '../utils/assets';

export function resolveRoundelEmblem(path?: string | null): {
  src: string;
  useImage: boolean;
} | undefined {
  const src = WebkilnAssetPath(path);
  if (!src) {
    return undefined;
  }
  return {
    src,
    useImage: !isSameOriginGameAssetUrl(src),
  };
}

export function emblemMaskStyle(maskUrl: string): CSSProperties {
  const mask = `url("${maskUrl}")`;
  return {
    maskImage: mask,
    WebkitMaskImage: mask,
    maskMode: 'alpha',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  };
}
