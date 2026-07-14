import type { EventEffect } from '../../data/types';
import { webUIText } from '../../localization/WebUITextContext';
import { FoaeCefUIAssetPath } from '../../utils/assets';
import './EventEffects.css';

function iconFor(effect: EventEffect): string | null {
  switch (effect.kind) {
    case 'money':     return '/assets/icons/I_Coins.png';
    case 'food':      return '/assets/icons/I_Food.png';
    case 'population': return '/assets/icons/I_Population.png';
    case 'unrest':    return '/assets/icons/I_Unrest.png';
    case 'settlement': return '/assets/icons/I_City.png';
    case 'fame':      return '/assets/icons/I_Fame.png';
    case 'opinion':
      if ((effect.amount ?? 0) > 0) return '/assets/icons/I_OpinionPositive.png';
      if ((effect.amount ?? 0) < 0) return '/assets/icons/I_OpinionNegative.png';
      return '/assets/icons/I_OpinionNeutral.png';
    case 'relationship': return '/assets/icons/I_Characters.png';
    case 'blocHappiness': return '/assets/icons/I_PowerBlocs.png';
    case 'characterStatus': return '/assets/icons/I_Characters.png';
    case 'army':      return '/assets/icons/I_Swords.png';
    case 'treaty':    return '/assets/icons/I_Diplomacy.png';
    case 'recruitment': return '/assets/icons/I_Characters.png';
    case 'role':      return '/assets/icons/I_Liege.png';
    case 'disease':   return '/assets/modifiers/DiseaseModifier.png';
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
  if (kind === 'removeTrait' || kind === 'characterDeath' || kind === 'disease') return 'ee--neg';
  if (amount === undefined) return '';
  if (kind === 'unrest') {
    if (amount > 0) return 'ee--neg';
    if (amount < 0) return 'ee--pos';
    return '';
  }
  if (amount > 0) return 'ee--pos';
  if (amount < 0) return 'ee--neg';
  return '';
}

export function EventEffectRow({ effect }: { effect: EventEffect }) {
  const icon = iconFor(effect);
  const cls = signClass(effect.amount, effect.kind);
  return (
    <div className={`event-effect ${cls}`}>
      <div className="event-effect-icon-frame" aria-hidden="true">
        {icon
          ? <img src={FoaeCefUIAssetPath(icon)} alt="" className="event-effect-icon" draggable={false} />
          : <span className="event-effect-marker" />}
      </div>
      <span className="event-effect-desc">{effect.description || effect.kind}</span>
    </div>
  );
}

export function EventEffectList({ effects }: { effects: EventEffect[] }) {
  if (effects.length === 0) return null;
  return (
    <div className="event-effects">
      <div className="event-effects-title">{webUIText('InteractionCard.Effects')}</div>
      <div className="event-effects-list">
        {effects.map((e, i) => <EventEffectRow key={i} effect={e} />)}
      </div>
    </div>
  );
}
