import type { PortraitLayerData } from '../../data/types';
import { FoaeCefUIAssetPath } from '../../utils/assets';

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

  const background = FoaeCefUIAssetPath(layers.background) ?? '';
  const backHeadgear = FoaeCefUIAssetPath(layers.backHeadgear) ?? '';
  const portrait = FoaeCefUIAssetPath(layers.portrait) ?? '';
  const normalMap = FoaeCefUIAssetPath(layers.normalMap) ?? '';
  const faceMask = FoaeCefUIAssetPath(layers.faceMask) ?? '';
  const frontHeadgear = FoaeCefUIAssetPath(layers.frontHeadgear) ?? '';

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
  return FoaeCefUIAssetPath(path) ?? '';
}
