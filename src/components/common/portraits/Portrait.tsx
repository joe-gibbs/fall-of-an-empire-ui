import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { playSound } from '../../../hooks/useSound';
import { zoomToCharacterCapital } from '../../../bridge/app/usePinnedItemsBridge';
import { usePerson } from '../../../data-source/index';
import { WebkilnAssetPath } from '../../../utils/assets';
import type { Character, PortraitLayerData } from '../../../data/types';
import { useQuickInteractionMenu } from '../interactions/useQuickInteractionMenu';
import {
  use3DPortraitsEnabled,
  useGeneratedPortrait,
  type PortraitExpression,
} from '../../../bridge/characters/useGeneratedPortrait';
import { DEFAULT_PORTRAIT_LIGHT, portraitLightFromMouseEvent, type PortraitLight } from './portraitLighting';
import './Portrait.css';

type PortraitSize = 'sm' | 'row' | 'md' | 'lg' | 'xl' | 'hero';

export type PortraitBorderTier = 'gold' | 'silver' | 'bronze';
export type PortraitBadge = 'ruler' | 'heir' | 'family';

export interface PortraitHandle {
  relight: (light: PortraitLight) => void;
}

interface PortraitProps {
  /** PersonID. Used to resolve character data and, when enabled, request a 3D render. */
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
  expression?: PortraitExpression;
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
  expression = 'neutral',
}, ref) => {
  const [failedFaceKey, setFailedFaceKey] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const normalLayerRef = useRef<NormalLitPortraitLayerHandle | null>(null);
  const hasSuppliedPortrait = Boolean(src || layers);
  const fetched = usePerson(resolvePerson && !hasSuppliedPortrait ? personId ?? null : null);
  const resolvedName = fetched?.name ?? name ?? '';
  const resolvedLayers = fetched?.portraitLayers ?? layers;
  const resolvedIsAlive = fetched?.isAlive ?? isAlive;
  const resolvedIsImprisoned = fetched?.isImprisoned ?? isImprisoned ?? false;
  const use3DPortraits = use3DPortraitsEnabled() && Boolean(personId);
  const requestPriority = size === 'hero' || size === 'xl' ? 3 : size === 'lg' || size === 'md' ? 2 : 1;
  const refreshToken = `${fetched?.age ?? ''}|${activity ?? fetched?.activity ?? ''}|${commanderKind ?? fetched?.commanderKind ?? ''}`;
  const generatedPortrait = useGeneratedPortrait(
    personId,
    expression,
    requestPriority,
    isVisible && use3DPortraits,
    refreshToken,
  );
  const generatedColour = WebkilnAssetPath(generatedPortrait.colourUrl);
  const generatedNormal = WebkilnAssetPath(generatedPortrait.normalUrl);
  const layerBackground = WebkilnAssetPath(resolvedLayers?.background);
  const layerBackHeadgear = WebkilnAssetPath(resolvedLayers?.backHeadgear);
  const layerPortrait = WebkilnAssetPath(resolvedLayers?.portrait);
  const layerNormalMap = WebkilnAssetPath(resolvedLayers?.normalMap);
  const layerFaceMask = WebkilnAssetPath(resolvedLayers?.faceMask);
  const layerFrontHeadgear = WebkilnAssetPath(resolvedLayers?.frontHeadgear);
  const activeLayerPortrait = use3DPortraits ? generatedColour : layerPortrait;
  const activeNormalMap = use3DPortraits ? generatedNormal : layerNormalMap;
  const resolvedSrc = use3DPortraits
    ? generatedColour
    : WebkilnAssetPath(layerPortrait || src || fetched?.portrait);

  const dim = sizeMap[size];
  const faceKey = resolvedSrc ?? '';
  const hasFace = resolvedSrc && failedFaceKey !== faceKey;
  const faceSrc = resolvedSrc ?? '';
  const bgUrl = use3DPortraits
    ? undefined
    : WebkilnAssetPath(layerBackground || bg || pickBg(personId || resolvedName));
  const hasLayeredFace = Boolean(activeLayerPortrait && hasFace);
  const showLayeredScene = use3DPortraits || hasLayeredFace;
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
  const faceMaskStyle: React.CSSProperties | undefined = !use3DPortraits && layerFaceMask ? {
    maskImage: `url(${layerFaceMask})`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: '100% 100%',
  } : undefined;
  const handleFaceError = useCallback(() => {
    setFailedFaceKey(faceKey);
  }, [faceKey]);
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!hasLayeredFace || !activeNormalMap) return;
    const nextLight = portraitLightFromMouseEvent(event);
    normalLayerRef.current?.relight(nextLight);
  }, [activeNormalMap, hasLayeredFace]);
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
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      setIsVisible(entries.some(entry => entry.isIntersecting));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (!onClick) return;
    playSound('click');
    onClick();
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (quickMenu.onContextMenu) {
      event.stopPropagation();
      quickMenu.onContextMenu(event);
    }
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!personId) return;
    event.preventDefault();
    event.stopPropagation();
    zoomToCharacterCapital(personId);
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`portrait portrait--${size}${deadClass} ${isRect ? 'portrait--rect' : ''} ${isHero ? 'portrait--hero' : ''} ${showBorder ? `portrait--bordered${resolvedBorderTier !== 'gold' ? ` portrait--tier-${resolvedBorderTier}` : ''}` : ''} ${onClick ? 'portrait--clickable' : ''} ${className}`}
        data-webkiln-hit={isRect ? undefined : 'alpha'}
        style={isHero ? undefined : {
          width: dim,
          height: dim,
          minWidth: dim,
          minHeight: dim,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      >
        <div className="portrait-clip">
          {showLayeredScene ? (
            <>
              {bgUrl && (
                <img
                  className="portrait-layer portrait-layer--background"
                  src={bgUrl}
                  alt=""
                  draggable={false}
                />
              )}
              {hasLayeredFace && (
                <div className="portrait-layer-stack">
                  {!use3DPortraits && layerBackHeadgear && (
                    <img
                      className="portrait-layer portrait-layer--headgear-back"
                      src={layerBackHeadgear}
                      alt=""
                      draggable={false}
                    />
                  )}
                  {activeNormalMap ? (
                    <NormalLitPortraitLayer
                      ref={normalLayerRef}
                      className="portrait-layer portrait-layer--face"
                      src={faceSrc}
                      normalSrc={activeNormalMap}
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
                  {!use3DPortraits && layerFrontHeadgear && (
                    <img
                      className="portrait-layer portrait-layer--headgear-front"
                      src={layerFrontHeadgear}
                      alt=""
                      draggable={false}
                    />
                  )}
                </div>
              )}
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
