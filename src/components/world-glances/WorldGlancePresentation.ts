import { webUIText } from '../../localization/WebUITextContext';
import type { FactionRelation } from './WorldGlanceTypes';
export { readableFactionTextColour } from '../../utils/colorFormatters';

export function relationDisplayLabel(relation: FactionRelation, atWar?: boolean): string {
  if (atWar || relation === 'enemy') return webUIText('WorldGlances.Relation.Hostile');
  if (relation === 'own') return webUIText('WorldGlances.Relation.Own');
  if (relation === 'ally') return webUIText('WorldGlances.Relation.Allied');
  return webUIText('WorldGlances.Relation.Neutral');
}

export function relationDisplayColour(relation: FactionRelation, atWar?: boolean): string {
  if (atWar || relation === 'enemy') return 'var(--red-light)';
  if (relation === 'own') return 'var(--gold-light)';
  if (relation === 'ally') return 'var(--green-light)';
  return 'var(--text-bright)';
}
