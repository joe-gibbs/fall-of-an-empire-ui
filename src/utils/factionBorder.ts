export type FactionBorderVariant = 'default' | 'province' | 'foederati' | 'external';

export interface FactionBorderSource {
  diplomaticStatus?: string;
  subjectSubtype?: string;
  overlordBaseName?: string;
  isPlayer?: boolean;
  isRebel?: boolean;
  playable?: boolean;
  relation?: string;
}

export interface FactionRoundelDiplomacyProps {
  diplomaticStatus?: string;
  subjectSubtype?: string;
  isPlayer?: boolean;
  isRebel?: boolean;
}

export function roundelDiplomacyProps(source?: FactionBorderSource | null): FactionRoundelDiplomacyProps {
  if (!source) {
    return {};
  }

  const relation = (source.relation ?? '').trim().toLowerCase();
  const diplomaticStatus = source.diplomaticStatus
    ?? (relation === 'own' ? 'player' : relation === 'subject' ? 'subject' : (relation || undefined));

  return {
    diplomaticStatus,
    subjectSubtype: source.subjectSubtype,
    isPlayer: source.isPlayer ?? (relation === 'own' ? true : undefined),
    isRebel: source.isRebel,
  };
}

export function resolveFactionBorderVariant(source?: FactionBorderSource | null): FactionBorderVariant {
  if (!source) {
    return 'default';
  }

  const subjectSubtype = (source.subjectSubtype ?? '').trim().toLowerCase();
  if (subjectSubtype === 'foederati') {
    return 'foederati';
  }
  if (subjectSubtype === 'province') {
    return 'province';
  }
  if (subjectSubtype === 'protectorate') {
    return 'external';
  }
  if (source.overlordBaseName) {
    return 'province';
  }
  if (source.isRebel) {
    return 'external';
  }
  if (source.isPlayer) {
    return 'default';
  }

  const diplomaticStatus = (source.diplomaticStatus ?? '').trim().toLowerCase();
  if (diplomaticStatus === 'subject' || diplomaticStatus === 'vassal') {
    return 'province';
  }
  if (diplomaticStatus && diplomaticStatus !== 'player' && diplomaticStatus !== 'identical') {
    return 'external';
  }
  if (source.playable === false) {
    return 'external';
  }

  return 'default';
}
