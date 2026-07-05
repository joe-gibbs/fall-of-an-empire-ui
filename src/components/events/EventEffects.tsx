import type { EventEffect } from '../../data/types';
import './EventEffects.css';

function iconFor(effect: EventEffect): string | null {
  switch (effect.kind) {
    case 'money':     return '/assets/icons/I_Coins.png';
    case 'fame':      return '/assets/icons/I_Fame.png';
    case 'opinion':
      if ((effect.amount ?? 0) > 0) return '/assets/icons/I_OpinionPositive.png';
      if ((effect.amount ?? 0) < 0) return '/assets/icons/I_OpinionNegative.png';
      return '/assets/icons/I_OpinionNeutral.png';
    case 'stat': {
      const stat = effect.parameter;
      if (!stat) return null;
      return `/assets/icons/StatIcons/I_${stat}.png`;
    }
    case 'addTrait':
    case 'removeTrait':
      if (!effect.parameter) return null;
      return `/assets/traits/${effect.parameter}.png`;
    case 'characterDeath':
      return '/assets/icons/I_Skull.png';
    default:
      return null;
  }
}

function signClass(amount: number | undefined, kind: string): string {
  if (kind === 'removeTrait' || kind === 'characterDeath') return 'ee--neg';
  if (amount === undefined) return '';
  if (amount > 0) return 'ee--pos';
  if (amount < 0) return 'ee--neg';
  return '';
}

export function EventEffectRow({ effect }: { effect: EventEffect }) {
  const icon = iconFor(effect);
  const cls = signClass(effect.amount, effect.kind);
  return (
    <div className={`event-effect ${cls}`}>
      {icon && <img src={icon} alt="" className="event-effect-icon" draggable={false} />}
      <span className="event-effect-desc">{effect.description || effect.kind}</span>
    </div>
  );
}

export function EventEffectList({ effects }: { effects: EventEffect[] }) {
  if (effects.length === 0) return null;
  return (
    <div className="event-effects">
      {effects.map((e, i) => <EventEffectRow key={i} effect={e} />)}
    </div>
  );
}
