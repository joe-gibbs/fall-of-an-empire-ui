import React from 'react';
import { playSound } from '../../../hooks/useSound';
import { emblemAssetPath } from '../../../utils/factionEmblem';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import { resolveFactionBorderVariant, type FactionBorderVariant } from '../../../utils/factionBorder';
import { useFaction } from '../../../data-source/index';
import { useQuickInteractionMenu } from '../interactions/useQuickInteractionMenu';
import './FactionRoundel.css';

type RoundelSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface FactionRoundelProps {
  /** FactionID (or display name). When set, the roundel fetches its own
   *  colour/emblem/culture via the data-source hook and the explicit props
   *  below are used only as pre-load fallbacks. */
  factionId?: string;
  /** Faction primary colour hex, e.g. "#8B1A1A". Required unless `factionId` is given. */
  colour?: string;
  /** Faction secondary colour hex. */
  secondaryColour?: string;
  /** Faction emblem key (e.g. "Gwendic_1"). */
  emblem?: string;
  /** Culture family name (e.g. "Svaranic"). Used when `emblem` is missing. */
  cultureGroup?: string;
  /** Pre-computed symbol PNG path. Overrides emblem/cultureGroup — use only
   *  when you have a literal asset path rather than faction metadata. */
  symbol?: string;
  /** Set false when the parent has already supplied the display metadata. */
  resolveFaction?: boolean;
  /** Alt / accessible name. Falls back to the fetched faction name when
   *  `factionId` is given. */
  name?: string;
  size?: RoundelSize;
  /** Show the gold ring border (default true) */
  showRing?: boolean;
  borderVariant?: FactionBorderVariant;
  diplomaticStatus?: string;
  subjectSubtype?: string;
  isPlayer?: boolean;
  isRebel?: boolean;
  onClick?: () => void;
  className?: string;
}

const FactionRoundel: React.FC<FactionRoundelProps> = ({
  factionId,
  colour,
  secondaryColour,
  emblem,
  cultureGroup,
  symbol,
  resolveFaction = true,
  name,
  size = 'md',
  showRing = true,
  borderVariant,
  diplomaticStatus,
  subjectSubtype,
  isPlayer,
  isRebel,
  onClick,
  className = '',
}) => {
  // When a factionId is supplied, pull live data; explicit props become
  // placeholders used while the query is in flight.
  const hasVisualFallback = Boolean(colour || symbol || emblem || cultureGroup);
  const fetched = useFaction(resolveFaction && !hasVisualFallback ? factionId ?? null : null);
  const resolvedColour = fetched?.colour ?? colour ?? '#666666';
  const resolvedSecondary = fetched?.secondaryColour ?? secondaryColour;
  const resolvedEmblem = fetched?.emblem ?? emblem;
  const resolvedCultureGroup = fetched?.cultureGroup ?? cultureGroup;
  const resolvedName = fetched?.name ?? name ?? '';
  const resolvedBorderVariant = borderVariant ?? resolveFactionBorderVariant({
    diplomaticStatus: fetched?.diplomaticStatus ?? diplomaticStatus,
    subjectSubtype: fetched?.subjectSubtype ?? subjectSubtype,
    isPlayer: fetched?.isPlayer ?? isPlayer,
    isRebel: fetched?.isRebel ?? isRebel,
  });

  const emblemColour = resolveEmblemColour(resolvedColour, resolvedSecondary);
  const emblemLight = lighten(emblemColour, 0.15);
  const emblemDark = darken(emblemColour, 0.25);
  const symbolPath = FoaeCefUIAssetPath(symbol ?? emblemAssetPath(resolvedEmblem, resolvedCultureGroup));
  const symbolStyle: React.CSSProperties | undefined = symbolPath ? {
    backgroundImage: `linear-gradient(160deg, ${emblemLight}, ${emblemColour} 55%, ${emblemDark})`,
    maskImage: `url("${symbolPath}")`,
    maskPosition: 'center',
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
  } : undefined;
  const quickMenu = useQuickInteractionMenu<HTMLDivElement>({
    kind: 'faction',
    targetId: factionId,
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
        className={`faction-roundel faction-roundel--${size} faction-roundel--border-${resolvedBorderVariant} ${onClick ? 'faction-roundel--clickable' : ''} ${className}`}
        onMouseDown={handleMouseDown}
        onContextMenu={quickMenu.onContextMenu}
        role="img"
        aria-label={resolvedName}
      >
        {/* Faction colour background with subtle gradient */}
        <div
          className="faction-roundel-fill"
          style={{
            backgroundImage: `radial-gradient(circle at 40% 35%, ${lighten(resolvedColour, 0.2)}, ${resolvedColour} 70%, ${darken(resolvedColour, 0.3)} 100%)`,
          }}
        />

        {/* Vignette overlay for depth */}
        <div className="faction-roundel-vignette" />

        {/* Heraldic symbol, tinted with secondary colour through a packaged image mask. */}
        {symbolStyle && <div className="faction-roundel-symbol" style={symbolStyle} />}

        {/* Gold ring */}
        {showRing && <div className="faction-roundel-ring" />}
      </div>
      {quickMenu.node}
    </>
  );
};

/** Pick a readable emblem colour from the authored secondary, keeping the
 *  author's hue when it contrasts with the primary and shifting toward
 *  black/white when it doesn't. */
function resolveEmblemColour(primary: string, secondary?: string): string {
  const primaryL = luminance(primary);
  if (!secondary) {
    return primaryL < 0.5 ? '#f1e6c5' : '#1a1410';
  }
  const secondaryL = luminance(secondary);
  const delta = Math.abs(primaryL - secondaryL);
  if (delta >= 0.28) {
    return secondary;
  }
  const factor = 0.55;
  return primaryL < 0.5 ? lighten(secondary, factor) : darken(secondary, factor);
}

/** Lighten a hex colour by a factor (0-1) */
function lighten(hex: string, factor: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(
    Math.min(255, Math.round(r + (255 - r) * factor)),
    Math.min(255, Math.round(g + (255 - g) * factor)),
    Math.min(255, Math.round(b + (255 - b) * factor)),
  );
}

/** Darken a hex colour by a factor (0-1) */
function darken(hex: string, factor: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  );
}

/** Relative luminance (approx, on 0..1 in sRGB) for contrast decisions. */
function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

export default FactionRoundel;
