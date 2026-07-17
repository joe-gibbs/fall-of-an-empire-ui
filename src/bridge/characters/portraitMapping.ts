import type { PortraitLayerData } from '../../data/types';
import { WebkilnAssetPath } from '../../utils/assets';

interface RawPortraitLayers {
  background?: string;
  backHeadgear?: string;
  portrait?: string;
  normalMap?: string;
  faceMask?: string;
  frontHeadgear?: string;
}

export function mapPortraitLayers(layers?: RawPortraitLayers | null): PortraitLayerData | undefined {
  if (!layers) return undefined;

  const background = WebkilnAssetPath(layers.background) ?? '';
  const backHeadgear = WebkilnAssetPath(layers.backHeadgear) ?? '';
  const portrait = WebkilnAssetPath(layers.portrait) ?? '';
  const normalMap = WebkilnAssetPath(layers.normalMap) ?? '';
  const faceMask = WebkilnAssetPath(layers.faceMask) ?? '';
  const frontHeadgear = WebkilnAssetPath(layers.frontHeadgear) ?? '';

  if (!background && !backHeadgear && !portrait && !normalMap && !faceMask && !frontHeadgear) {
    return undefined;
  }

  return {
    background,
    backHeadgear,
    portrait,
    normalMap,
    faceMask,
    frontHeadgear,
  };
}

export function mapPortraitPath(path?: string | null): string {
  return WebkilnAssetPath(path) ?? '';
}
