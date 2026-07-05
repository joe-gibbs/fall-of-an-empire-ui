import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { playSound } from '../../../hooks/useSound';
import { usePerson } from '../../../data-source/index';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import type { Character, PortraitLayerData } from '../../../data/types';
import { useQuickInteractionMenu } from '../interactions/useQuickInteractionMenu';
import { DEFAULT_PORTRAIT_LIGHT, portraitLightFromMouseEvent, type PortraitLight } from './portraitLighting';
import './Portrait.css';

type PortraitSize = 'sm' | 'row' | 'md' | 'lg' | 'xl' | 'hero';

export type PortraitBorderTier = 'gold' | 'silver' | 'bronze';
export type PortraitBadge = 'ruler' | 'heir' | 'family';

export interface PortraitHandle {
  relight: (light: PortraitLight) => void;
}

interface PortraitProps {
  /** PersonID. When set, the portrait fetches the character and uses their
   *  name + portrait path; the `src`/`name` props become fallbacks used while
   *  the query is in flight. */
  personId?: string;
  resolvePerson?: boolean;
  src?: string;
  bg?: string;
  layers?: PortraitLayerData;
  badge?: PortraitBadge;
  showBadge?: boolean;
  isAlive?: boolean;
  isImprisoned?: boolean;
  /** Required unless `personId` is given. Used as alt text and for the
   *  deterministic background pick. */
  name?: string;
  size?: PortraitSize;
  shape?: 'circle' | 'rect';
  onClick?: () => void;
  className?: string;
  showBorder?: boolean;
  borderTier?: PortraitBorderTier;
  activity?: string;
  commanderKind?: string;
  isPlayerCharacter?: boolean;
  isRuler?: boolean;
  isHeir?: boolean;
  isDesignatedHeir?: boolean;
  isPreviousRuler?: boolean;
}

const sizeMap: Record<PortraitSize, string> = {
  sm: '2.5rem',
  row: '2.82rem',
  md: '3.7rem',
  lg: '5.5rem',
  xl: '7.4rem',
  hero: '100%',
};

// Default backgrounds assigned by hash of name
const defaultBackgrounds = [
  '/assets/portraits/backgrounds/RephsianBackground1.png',
  '/assets/portraits/backgrounds/RephsianBackround2.png',
  '/assets/portraits/backgrounds/RephsianBackground3.png',
  '/assets/portraits/backgrounds/RephsianBackground4.png',
];

interface NormalLitPortraitLayerProps {
  className: string;
  src: string;
  normalSrc: string;
  alt: string;
  style?: React.CSSProperties;
  onError: () => void;
}

interface NormalLitPortraitLayerHandle {
  relight: (light: PortraitLight) => void;
}

interface CachedPortraitPixels {
  width: number;
  height: number;
  diffuse: Uint8ClampedArray;
  normals: Uint8ClampedArray;
}

function clampChannel(value: number): number {
  if (value <= 0) return 0;
  if (value >= 255) return 255;
  return value;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load portrait asset ${src}`));
    image.src = src;
  });
}

const NormalLitPortraitLayer = React.forwardRef<NormalLitPortraitLayerHandle, NormalLitPortraitLayerProps>(({
  className,
  src,
  normalSrc,
  alt,
  style,
  onError,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedPixelsRef = useRef<CachedPortraitPixels | null>(null);

  const renderLitPortrait = useCallback((nextLight: PortraitLight) => {
    const cachedPixels = cachedPixelsRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!cachedPixels || !canvas || !context) {
      return;
    }

    const { width, height, diffuse, normals } = cachedPixels;
    const lit = context.createImageData(width, height);
    const pixels = lit.data;
    pixels.set(diffuse);

    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] === 0) continue;

      const nx = normals[index] / 127.5 - 1;
      const ny = normals[index + 1] / 127.5 - 1;
      const nz = normals[index + 2] / 127.5 - 1;
      const normalLength = Math.hypot(nx, ny, nz) || 1;
      const dot = Math.max(
        0,
        (nx / normalLength) * nextLight.x
          + (ny / normalLength) * nextLight.y
          + (nz / normalLength) * nextLight.z
      );
      const shade = 0.58 + dot * 0.62;
      const warmth = dot * 14;

      pixels[index] = clampChannel(pixels[index] * shade + warmth);
      pixels[index + 1] = clampChannel(pixels[index + 1] * shade + warmth * 0.72);
      pixels[index + 2] = clampChannel(pixels[index + 2] * (shade - dot * 0.04));
    }

    context.putImageData(lit, 0, 0);
  }, []);

  useImperativeHandle(ref, () => ({
    relight: (light: PortraitLight) => {
      renderLitPortrait(light);
    },
  }), [renderLitPortrait]);

  useEffect(() => {
    let cancelled = false;

    async function loadPortraitPixels() {
      try {
        const [diffuseImage, normalImage] = await Promise.all([
          loadImage(src),
          loadImage(normalSrc),
        ]);
        if (cancelled) return;

        const width = diffuseImage.naturalWidth || diffuseImage.width;
        const height = diffuseImage.naturalHeight || diffuseImage.height;
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d', { willReadFrequently: true });
        if (!canvas || !context || width <= 0 || height <= 0) {
          onError();
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.drawImage(diffuseImage, 0, 0, width, height);
        const diffuse = context.getImageData(0, 0, width, height);

        const normalCanvas = document.createElement('canvas');
        normalCanvas.width = width;
        normalCanvas.height = height;
        const normalContext = normalCanvas.getContext('2d', { willReadFrequently: true });
        if (!normalContext) {
          onError();
          return;
        }

        normalContext.drawImage(normalImage, 0, 0, width, height);
        const normals = normalContext.getImageData(0, 0, width, height).data;
        cachedPixelsRef.current = {
          width,
          height,
          diffuse: new Uint8ClampedArray(diffuse.data),
          normals: new Uint8ClampedArray(normals),
        };
        renderLitPortrait(DEFAULT_PORTRAIT_LIGHT);
      } catch {
        if (!cancelled) {
          onError();
        }
      }
    }

    loadPortraitPixels();

    return () => {
      cancelled = true;
      cachedPixelsRef.current = null;
    };
  }, [normalSrc, onError, renderLitPortrait, src]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      style={style}
      draggable={false}
    />
  );
});

NormalLitPortraitLayer.displayName = 'NormalLitPortraitLayer';

function pickBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return defaultBackgrounds[Math.abs(hash) % defaultBackgrounds.length];
}

function badgeForCharacter(character: Character | null): PortraitBadge | undefined {
  if (!character) return undefined;
  if (character.isRuler || character.activity === 'RulingFaction' || character.isPlayerCharacter) return 'ruler';
  if (character.isHeir || character.isDesignatedHeir) return 'heir';
  if (character.isFamilyOfPlayer) return 'family';
  return undefined;
}

function badgeIcon(badge: PortraitBadge): string {
  return badge === 'ruler'
    ? '/assets/icons/I_Fame.png'
    : '/assets/icons/I_Family.png';
}

function resolvePortraitBorderTier(character?: {
  activity?: string;
  commanderKind?: string;
  isPlayerCharacter?: boolean;
  isRuler?: boolean;
  isHeir?: boolean;
  isDesignatedHeir?: boolean;
  isPreviousRuler?: boolean;
} | null): PortraitBorderTier {
  if (!character) {
    return 'gold';
  }

  if (
    character.isPlayerCharacter ||
    character.isRuler ||
    character.isHeir ||
    character.isDesignatedHeir ||
    character.isPreviousRuler ||
    character.activity === 'RulingFaction'
  ) {
    return 'gold';
  }

  if (
    character.commanderKind ||
    character.activity === 'CommandingArmy' ||
    character.activity === 'LeadingSettlement' ||
    character.activity === 'Diplomat' ||
    character.activity === 'Spy'
  ) {
    return 'silver';
  }

  return 'bronze';
}

const Portrait = React.forwardRef<PortraitHandle, PortraitProps>(({
  personId,
  resolvePerson = true,
  src,
  bg,
  layers,
  badge,
  showBadge = true,
  isAlive,
  isImprisoned,
  name,
  size = 'md',
  shape = 'circle',
  onClick,
  className = '',
  showBorder = true,
  borderTier,
  activity,
  commanderKind,
  isPlayerCharacter,
  isRuler,
  isHeir,
  isDesignatedHeir,
  isPreviousRuler,
}, ref) => {
  const [failedFaceKey, setFailedFaceKey] = useState<string | null>(null);
  const normalLayerRef = useRef<NormalLitPortraitLayerHandle | null>(null);
  const hasPortraitFallback = Boolean(src || layers?.portrait);
  const fetched = usePerson(resolvePerson && !hasPortraitFallback ? personId ?? null : null);
  const resolvedName = fetched?.name ?? name ?? '';
  const resolvedLayers = fetched?.portraitLayers ?? layers;
  const resolvedIsAlive = fetched?.isAlive ?? isAlive;
  const resolvedIsImprisoned = fetched?.isImprisoned ?? isImprisoned ?? false;
  const layerPortrait = FoaeCefUIAssetPath(resolvedLayers?.portrait);
  const layerBackground = FoaeCefUIAssetPath(resolvedLayers?.background);
  const layerBackHeadgear = FoaeCefUIAssetPath(resolvedLayers?.backHeadgear);
  const layerFaceMask = FoaeCefUIAssetPath(resolvedLayers?.faceMask);
  const layerFrontHeadgear = FoaeCefUIAssetPath(resolvedLayers?.frontHeadgear);
  const layerNormalMap = FoaeCefUIAssetPath(resolvedLayers?.normalMap);
  const resolvedSrc = FoaeCefUIAssetPath(layerPortrait || src || (fetched?.portrait ? fetched.portrait : undefined));

  const dim = sizeMap[size];
  const faceKey = resolvedSrc ?? '';
  const hasFace = resolvedSrc && failedFaceKey !== faceKey;
  const faceSrc = resolvedSrc ?? '';
  const bgUrl = FoaeCefUIAssetPath(layerBackground || bg || pickBg(resolvedName));
  const hasLayeredFace = Boolean(layerPortrait && hasFace);
  const isRect = shape === 'rect' || size === 'hero';
  const isHero = size === 'hero';
  const resolvedBadge = badge ?? badgeForCharacter(fetched);
  const hasBorderTierHints = Boolean(
    fetched ||
    activity ||
    commanderKind ||
    isPlayerCharacter !== undefined ||
    isRuler !== undefined ||
    isHeir !== undefined ||
    isDesignatedHeir !== undefined ||
    isPreviousRuler !== undefined
  );
  const borderSource = hasBorderTierHints ? {
    activity: activity ?? fetched?.activity,
    commanderKind: commanderKind ?? fetched?.commanderKind,
    isPlayerCharacter: isPlayerCharacter ?? fetched?.isPlayerCharacter,
    isRuler: isRuler ?? fetched?.isRuler,
    isHeir: isHeir ?? fetched?.isHeir,
    isDesignatedHeir: isDesignatedHeir ?? fetched?.isDesignatedHeir,
    isPreviousRuler,
  } : null;
  const resolvedBorderTier = borderTier ?? (
    borderSource
      ? resolvePortraitBorderTier(borderSource)
      : 'gold'
  );
  const shouldShowBadge = showBadge && !isHero && resolvedIsAlive !== false && resolvedBadge !== undefined;
  const imprisonedOverlayClass = `portrait-imprisoned-overlay${isHero ? ' portrait-imprisoned-overlay--hero' : ''}`;
  const faceMaskStyle: React.CSSProperties | undefined = layerFaceMask ? {
    maskImage: `url(${layerFaceMask})`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: '100% 100%',
  } : undefined;
  const handleFaceError = useCallback(() => {
    setFailedFaceKey(faceKey);
  }, [faceKey]);
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!hasLayeredFace || !layerNormalMap) return;
    const nextLight = portraitLightFromMouseEvent(event);
    normalLayerRef.current?.relight(nextLight);
  }, [hasLayeredFace, layerNormalMap]);
  useImperativeHandle(ref, () => ({
    relight: (light: PortraitLight) => {
      normalLayerRef.current?.relight(light);
    },
  }), []);
  const deadClass = resolvedIsAlive === false ? ' portrait--dead' : '';
  const quickMenu = useQuickInteractionMenu<HTMLDivElement>({
    kind: 'person',
    targetId: personId,
  });
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      if (event.button === 2 && quickMenu.onContextMenu) {
        event.stopPropagation();
      }
      return;
    }
    if (!onClick) return;
    playSound('click');
    onClick();
  };

  return (
    <>
      <div
        className={`portrait portrait--${size}${deadClass} ${isRect ? 'portrait--rect' : ''} ${isHero ? 'portrait--hero' : ''} ${showBorder ? `portrait--bordered${resolvedBorderTier !== 'gold' ? ` portrait--tier-${resolvedBorderTier}` : ''}` : ''} ${onClick ? 'portrait--clickable' : ''} ${className}`}
        style={isHero ? undefined : {
          width: dim,
          height: dim,
          minWidth: dim,
          minHeight: dim,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onContextMenu={quickMenu.onContextMenu}
      >
        <div className="portrait-clip">
          {hasLayeredFace ? (
            <>
              {bgUrl && (
                <img
                  className="portrait-layer portrait-layer--background"
                  src={bgUrl}
                  alt=""
                  draggable={false}
                />
              )}
              <div className="portrait-layer-stack">
                {layerBackHeadgear && (
                  <img
                    className="portrait-layer portrait-layer--headgear-back"
                    src={layerBackHeadgear}
                    alt=""
                    draggable={false}
                  />
                )}
                {layerNormalMap ? (
                  <NormalLitPortraitLayer
                    ref={normalLayerRef}
                    className="portrait-layer portrait-layer--face"
                    src={faceSrc}
                    normalSrc={layerNormalMap}
                    alt={resolvedName}
                    style={faceMaskStyle}
                    onError={handleFaceError}
                  />
                ) : (
                  <img
                    className="portrait-layer portrait-layer--face"
                    src={faceSrc}
                    alt={resolvedName}
                    style={faceMaskStyle}
                    onError={handleFaceError}
                    draggable={false}
                  />
                )}
                {layerFrontHeadgear && (
                  <img
                    className="portrait-layer portrait-layer--headgear-front"
                    src={layerFrontHeadgear}
                    alt=""
                    draggable={false}
                  />
                )}
              </div>
            </>
          ) : hasFace ? (
            <>
              {isRect && (
                <img
                  className="portrait-bg"
                  src={bgUrl}
                  alt=""
                  draggable={false}
                />
              )}
              <img
                className="portrait-img"
                src={faceSrc}
                alt={resolvedName}
                onError={handleFaceError}
                draggable={false}
              />
            </>
          ) : (
            <div className="portrait-placeholder">
              <img
                src="/assets/icons/I_PersonSilhouette.png"
                alt=""
                className="portrait-placeholder-icon"
                draggable={false}
              />
            </div>
          )}
          {resolvedIsImprisoned && (
            <img
              className={imprisonedOverlayClass}
              src="/assets/hud/Components/CharacterPortrait/T_JailBars.png"
              alt=""
              draggable={false}
            />
          )}
        </div>
        {shouldShowBadge && resolvedBadge && (
          <span className={`portrait-badge portrait-badge--${resolvedBadge}`}>
            <img src={badgeIcon(resolvedBadge)} alt="" draggable={false} />
          </span>
        )}
      </div>
      {quickMenu.node}
    </>
  );
});

Portrait.displayName = 'Portrait';
export default React.memo(Portrait);
