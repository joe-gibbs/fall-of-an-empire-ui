import './TraitIcon.css';
import type { CharacterTrait } from '../../../data/types';

const FALLBACK_TRAIT_ICON = '/assets/traits/UnknownTrait.png';
const TRAIT_PROGRESS_SEGMENTS = 40;

interface Props {
  trait: CharacterTrait;
  /** Sizing class - e.g. "char-trait-icon" or "ptt-trait-icon" */
  className: string;
}

export function TraitIcon({ trait, className }: Props) {
  const isTemporary = trait.isTemporary
    && trait.totalDurationDays !== undefined
    && trait.totalDurationDays > 0
    && trait.remainingDays !== undefined;
  const remainingProgress = isTemporary ? trait.remainingDays! / trait.totalDurationDays! : 0;
  const activeSegments = isTemporary ? Math.ceil(remainingProgress * TRAIT_PROGRESS_SEGMENTS) : 0;

  return (
    <span className={`trait-icon-slot ${className}${isTemporary ? ' trait-icon-slot--temp' : ''}`}>
      <img
        src={`/assets/traits/${trait.icon}.png`}
        alt={trait.name}
        className="trait-icon-img"
        draggable={false}
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src.endsWith(FALLBACK_TRAIT_ICON)) return;
          img.src = FALLBACK_TRAIT_ICON;
        }}
      />
      {isTemporary && (
        <TraitProgressWheel activeSegments={activeSegments} />
      )}
    </span>
  );
}

function TraitProgressWheel({ activeSegments }: { activeSegments: number }) {
  const segments = [];
  for (let index = 0; index < TRAIT_PROGRESS_SEGMENTS; index += 1) {
    const angle = (index * 360) / TRAIT_PROGRESS_SEGMENTS;
    segments.push(
      <span
        key={index}
        className={`trait-icon-wheel-segment${index < activeSegments ? ' trait-icon-wheel-segment--active' : ''}`}
        style={{ transform: `rotate(${angle}deg) translateY(-385%)` }}
      />,
    );
  }

  return (
    <span className="trait-icon-wheel" aria-hidden="true">
      {segments}
    </span>
  );
}
