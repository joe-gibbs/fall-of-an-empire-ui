import { webUIText } from '../../localization/WebUITextContext';
import type { FactionRelation } from './WorldGlanceTypes';
export { readableFactionTextColour } from '../../utils/colorFormatters';

export function relationDisplayLabel(relation: FactionRelation, atWar?: boolean): string {
  if (atWar || relation === 'enemy') return webUIText('WorldGlances.Relation.Hostile');
  if (relation === 'own') return webUIText('WorldGlances.Relation.Own');
  if (relation === 'subject') return webUIText('WorldGlances.Relation.Subject');
  if (relation === 'ally') return webUIText('WorldGlances.Relation.Allied');
  return webUIText('WorldGlances.Relation.Neutral');
}

export function relationDisplayColour(relation: FactionRelation, atWar?: boolean): string {
  if (atWar || relation === 'enemy') return 'var(--diplo-relation-war)';
  if (relation === 'own') return 'var(--diplo-relation-own)';
  if (relation === 'subject') return 'var(--diplo-relation-subject)';
  if (relation === 'ally') return 'var(--diplo-relation-ally)';
  return 'var(--diplo-relation-neutral)';
}

export function glanceBadgeBackgroundColour(relation: FactionRelation, atWar?: boolean): string {
  if (atWar || relation === 'enemy') return 'var(--diplo-relation-war)';
  if (relation === 'neutral') return 'var(--glance-relation-neutral)';
  return 'var(--glance-relation-garrisonable)';
}

export function relationTextVars(relation: FactionRelation, atWar?: boolean): { '--relation-text': string } {
  return { '--relation-text': relationDisplayColour(relation, atWar) };
}

export function isHostileGlance(relation: FactionRelation, atWar?: boolean): boolean {
  return atWar === true || relation === 'enemy';
}
