import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import Panel from '../../common/layout/shell/Panel';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import Portrait from '../../common/portraits/Portrait';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import NumberStepper from '../../common/forms/NumberStepper';
import { usePeaceNegotiationBridge, type PeaceNegotiationState, type PeaceTermDraft } from '../../../bridge/diplomacy/usePeaceNegotiationBridge';
import { onBridgeEvent } from '../../../bridge-types.generated.ts';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { renderRichText, stripRichTags } from '../../../utils/richText';
import { registerScreen } from '../../../registry/index';
import { UI_MOTION } from '../../../config/motion';
import './PeaceNegotiationScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface PeaceNegotiationScreenProps {
  screenId?: string | null;
  targetFactionId?: string | null;
  onClose: () => void;
}

interface PeaceNegotiationScreenSelection {
  targetFactionId: string | null;
  sourceOfferSelector: string | null;
}

type PeaceFaction = PeaceNegotiationState['playerFaction'];
type Participant = PeaceNegotiationState['ourParticipants'][number];
type TermOption = PeaceNegotiationState['availableTerms'][number];
type TermEntry = PeaceNegotiationState['terms'][number];
type ReplacementCandidate = TermOption['replacementCandidates'][number];
type AcceptabilityTone = 'green' | 'gold' | 'red';
type ParticipantRoleKind = 'leader' | 'subject' | null;

const TRIBUTE_DURATION_YEAR_LABELS = ['1', '2', '5', '10'] as const;

const TERM_ICONS: Record<string, string> = {
  onetime_tribute: '/assets/icons/I_OfferTribute.png',
  ongoing_tribute: '/assets/icons/I_OfferTribute.png',
  annex_territory: '/assets/icons/I_Domain.png',
  impose_peace: '/assets/icons/I_Peace.png',
  release_vassal: '/assets/icons/I_DependentFactions.png',
  demand_vassalization: '/assets/icons/I_Vassal.png',
  annex_faction: '/assets/icons/I_Domain.png',
  rebel_conquest: '/assets/icons/I_War.png',
  migration_settlement: '/assets/icons/I_Resettle.png',
  replace_ruler: '/assets/icons/I_Liege.png',
  white_peace: '/assets/icons/I_Peace.png',
  tribute: '/assets/icons/I_OfferTribute.png',
};

const roleIconMeta: Record<Exclude<ParticipantRoleKind, null>, { icon: string; title: string; body: string }> = {
  leader: {
    icon: '/assets/icons/I_Liege.png',
    get title() { return webUIText('Auto.TopProp.ComponentsScreensPeaceNegotiationScreen.53.1'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensPeaceNegotiationScreen.54.2'); },
  },
  subject: {
    icon: '/assets/icons/I_DependentFactions.png',
    get title() { return webUIText('Auto.TopProp.ComponentsScreensPeaceNegotiationScreen.58.3'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensPeaceNegotiationScreen.59.4'); },
  },
};

function fmt(value: number | undefined | null): string {
  return formatNumber(value);
}

function fmtSigned(value: number | undefined | null): string {
  return formatSignedNumber(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function termKey(term: Pick<PeaceTermDraft, 'direction' | 'type' | 'targetFactionId' | 'vassalFactionId' | 'targetSettlementIds'>): string {
  return `${term.direction}:${term.type}:${term.targetFactionId ?? ''}:${term.vassalFactionId ?? ''}:${(term.targetSettlementIds ?? []).join(',')}`;
}

function termIcon(type: string): string {
  return TERM_ICONS[type] ?? '/assets/icons/I_Diplomacy.png';
}

function draftFromOption(option: TermOption): PeaceTermDraft {
  return {
    termId: option.optionId,
    type: option.type,
    direction: option.direction,
    targetFactionId: option.targetFactionId,
    vassalFactionId: option.vassalFactionId,
    targetSettlementIds: option.targetSettlementIds,
    settlementSummary: option.settlementSummary,
    settlementCount: option.settlementCount,
    tributeAmount: option.defaultTributeAmount,
    tributeDurationDays: option.defaultTributeDurationDays,
    replacementRulerId: option.replacementRulerId,
    replacementCandidates: option.replacementCandidates,
  };
}

function draftFromEntry(entry: TermEntry): PeaceTermDraft {
  return {
    termId: entry.termId,
    type: entry.type,
    direction: entry.direction,
    targetFactionId: entry.targetFactionId,
    vassalFactionId: entry.vassalFactionId,
    targetSettlementIds: entry.targetSettlementIds,
    settlementSummary: entry.settlementSummary,
    settlementCount: entry.settlementCount,
    tributeAmount: entry.tributeAmount,
    tributeDurationDays: entry.tributeDurationDays,
    replacementRulerId: entry.replacementRulerId,
    replacementCandidates: entry.replacementCandidates,
  };
}

function termFallbackLabel(term: PeaceTermDraft): string {
  switch (term.type) {
    case 'onetime_tribute':
      return term.direction === 'demand'
        ? webUIText('PeaceNegotiation.Term.DemandOnetimeTribute')
        : webUIText('PeaceNegotiation.Term.OfferOnetimeTribute');
    case 'ongoing_tribute':
      return term.direction === 'demand'
        ? webUIText('PeaceNegotiation.Term.DemandOngoingTribute')
        : webUIText('PeaceNegotiation.Term.OfferOngoingTribute');
    case 'annex_territory':
      return term.direction === 'demand' ? webUIText('PeaceNegotiation.Term.DemandTerritory') : webUIText('PeaceNegotiation.Term.OfferTerritory');
    case 'impose_peace':
      return webUIText("Auto.Return.componentsscreensPeaceNegotiationScreen.114.1");
    case 'release_vassal':
      return webUIText("Auto.Return.componentsscreensPeaceNegotiationScreen.116.1");
    case 'demand_vassalization':
      return webUIText("Auto.Return.componentsscreensPeaceNegotiationScreen.118.1");
    case 'annex_faction':
      return term.direction === 'demand' ? webUIText('PeaceNegotiation.Term.AnnexFaction') : webUIText('PeaceNegotiation.Term.SurrenderFaction');
    case 'rebel_conquest':
      return term.direction === 'demand' ? webUIText('PeaceNegotiation.Term.TotalConquest') : webUIText('PeaceNegotiation.Term.TotalSurrender');
    case 'migration_settlement':
      return term.direction === 'demand' ? webUIText('PeaceNegotiation.Term.MigrationDemand') : webUIText('PeaceNegotiation.Term.MigrationConcession');
    case 'replace_ruler':
      return webUIText('PeaceNegotiation.Term.ReplaceRuler');
    case 'white_peace':
      return webUIText("Auto.Return.componentsscreensPeaceNegotiationScreen.120.1");
    default:
      return webUIText("Auto.Return.componentsscreensPeaceNegotiationScreen.122.1");
  }
}

function tributeAmountFromText(value: string): number {
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function isConcession(term: Pick<PeaceTermDraft, 'direction'> | Pick<TermOption, 'direction'> | Pick<TermEntry, 'direction'>): boolean {
  return term.direction === 'concession';
}

function isConquestType(type: string): boolean {
  return type === 'annex_territory' || type === 'annex_faction' || type === 'rebel_conquest';
}

function isMigrationType(type: string): boolean {
  return type === 'migration_settlement';
}

function isTerritorySelectionTerm(term: Pick<PeaceTermDraft, 'type'>): boolean {
  return term.type === 'annex_territory' || term.type === 'migration_settlement';
}

function termsConflict(existing: PeaceTermDraft, incoming: PeaceTermDraft): boolean {
  if (isConquestType(incoming.type)) {
    if (existing.direction === incoming.direction) return true;
    return isConquestType(existing.type) || isMigrationType(existing.type);
  }

  if (isMigrationType(incoming.type)) {
    return isMigrationType(existing.type) || isConquestType(existing.type);
  }

  if (isConquestType(existing.type) && existing.direction === incoming.direction) {
    return true;
  }

  return false;
}

function optionAppliesToSelectedTarget(option: TermOption, selectedId: string | null | undefined): boolean {
  if (!selectedId || !option.targetFactionId) return true;
  return option.targetFactionId === selectedId;
}

function termFingerprint(term: PeaceTermDraft): string {
  const settlements = [...(term.targetSettlementIds ?? [])].sort().join(',');
  return [
    term.type || '',
    term.direction || '',
    term.targetFactionId || '',
    term.vassalFactionId || '',
    settlements,
    String(term.tributeAmount || 0),
    String(term.tributeDurationDays || 0),
    term.replacementRulerId || '',
  ].join('|');
}

function sameTerms(left: PeaceTermDraft[], right: PeaceTermDraft[]): boolean {
  if (left.length !== right.length) return false;

  const leftKeys = left.map(termFingerprint).sort();
  const rightKeys = right.map(termFingerprint).sort();
  return leftKeys.every((key, index) => key === rightKeys[index]);
}

function formatTermCost(cost: number | undefined, direction: string): string {
  if (cost === undefined) return '-';
  const signedCost = direction === 'concession' ? cost : -cost;
  return fmtSigned(signedCost);
}

function parsePeaceScreenSelection(screenId?: string | null, targetFactionId?: string | null): PeaceNegotiationScreenSelection {
  const raw = targetFactionId ?? screenId ?? null;
  if (!raw) {
    return { targetFactionId: null, sourceOfferSelector: null };
  }

  if (!raw.startsWith('offer:')) {
    return { targetFactionId: raw, sourceOfferSelector: null };
  }

  const parts = raw.split(':');
  return {
    targetFactionId: parts[2] || null,
    sourceOfferSelector: raw,
  };
}

function acceptanceTone(score: number | undefined | null): AcceptabilityTone {
  const value = score ?? 0;
  if (value > 0) return 'green';
  if (value > -20) return 'gold';
  return 'red';
}

function normaliseBreakdownLine(line: string): string {
  return line.replace(/<bold>([^<>]*)<\/>:/gi, '<bold>$1:</>');
}

function isBoldOnlyLine(line: string): boolean {
  return /^<bold>[^<>]+<\/>$/.test(line.trim());
}

function renderBreakdownLine(line: string, index: number) {
  const normalised = normaliseBreakdownLine(line.trim());
  if (!normalised) return null;
  if (normalised === '<hr></>' || normalised === '<hr/>') {
    return <div key={index} className="pns-acceptability-rule" />;
  }

  const resultMatch = normalised.match(/^<bold>([^<>]+):<\/>\s*(.*)$/i);
  if (resultMatch) {
    const label = stripRichTags(resultMatch[1]);
    const value = resultMatch[2];
    const isOutcome = label.toLowerCase() === 'outcome' || stripRichTags(value).length > 34;
    return (
      <div key={index} className={`pns-acceptability-result${isOutcome ? ' pns-acceptability-result--outcome' : ''}`}>
        <span className="pns-acceptability-result-label">{label}</span>
        <span className="pns-acceptability-result-value">{renderRichText(value)}</span>
      </div>
    );
  }

  if (isBoldOnlyLine(normalised)) {
    return (
      <div key={index} className="pns-acceptability-section">
        {renderRichText(normalised)}
      </div>
    );
  }

  return (
    <div key={index} className="pns-acceptability-line">
      {renderRichText(normalised, { blockBullets: true })}
    </div>
  );
}

function renderAcceptabilityBreakdown(input: string): ReactNode {
  const lines = input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length > 1 && isBoldOnlyLine(lines[0])) {
    lines.shift();
  }

  return (
    <div className="pns-acceptability-tooltip-body">
      {lines.map(renderBreakdownLine)}
    </div>
  );
}

function fmtWarScore(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const formatted = fmtSigned(rounded);
  if (value > 0) return `${formatted} (Winning)`;
  if (value < 0) return `${formatted} (Losing)`;
  return `${formatted} (Stalemate)`;
}

function fmtWarDuration(days: number | undefined, daysInYear: number, daysInMonth: number): string {
  const totalDays = Math.max(0, Math.round(days ?? 0));
  const years = Math.floor(totalDays / daysInYear);
  const remainingDays = totalDays % daysInYear;
  const months = Math.floor(remainingDays / daysInMonth);
  const daysLeft = remainingDays % daysInMonth;

  if (years > 0 && months > 0) {
    return webUIText('Common.YearMonthDuration', {
      Years: fmt(years),
      YearUnit: webUIText(years === 1 ? 'Common.Year' : 'Common.Years'),
      Months: fmt(months),
      MonthUnit: webUIText(months === 1 ? 'Common.Month' : 'Common.Months'),
    });
  }
  if (years > 0) {
    return webUIText('Common.CountWithUnit', { Count: fmt(years), Unit: webUIText(years === 1 ? 'Common.Year' : 'Common.Years') });
  }
  if (months > 0) {
    return webUIText('Common.CountWithUnit', { Count: fmt(months), Unit: webUIText(months === 1 ? 'Common.Month' : 'Common.Months') });
  }

  const shownDays = Math.max(1, daysLeft);
  return webUIText('Common.CountWithUnit', { Count: fmt(shownDays), Unit: webUIText(shownDays === 1 ? 'Common.Day' : 'Common.Days') });
}

function fmtStrength(value: number | undefined): string {
  const strength = Math.round(value ?? 0);
  if (strength >= 1000) {
    return `${formatNumber(strength / 1000, { maximumFractionDigits: 1 })}k`;
  }
  return fmt(strength);
}

function sideStrength(participants: Participant[]): number {
  return participants.reduce((total, participant) => total + participant.faction.strength, 0);
}

function findLeader(participants: Participant[]): Participant | null {
  return participants.find(participant => participant.isLeader) ?? participants[0] ?? null;
}

function orderParticipants(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => Number(b.isLeader) - Number(a.isLeader));
}

function getParticipantRoleKind(participant: Participant): ParticipantRoleKind {
  return participant.isLeader ? 'leader' : null;
}

function selectedTargetLabel(entry: TermEntry | undefined, option?: TermOption): string {
  return entry?.vassalFactionName
    || entry?.targetFactionName
    || option?.vassalFactionName
    || option?.targetFactionName
    || '';
}

function settlementDetail(entry?: TermEntry, option?: TermOption, draft?: PeaceTermDraft): string {
  return entry?.settlementSummary
    || option?.settlementSummary
    || draft?.settlementSummary
    || '';
}

function termDetail(entry: TermEntry | undefined, draft: PeaceTermDraft): string {
  return settlementDetail(entry, undefined, draft) || entry?.description || selectedTargetLabel(entry);
}

function replacementCandidates(term: PeaceTermDraft, live?: TermEntry): ReplacementCandidate[] {
  return live?.replacementCandidates?.length ? live.replacementCandidates : term.replacementCandidates ?? [];
}

function selectedReplacementCandidate(term: PeaceTermDraft, live?: TermEntry): ReplacementCandidate | undefined {
  const candidates = replacementCandidates(term, live);
  return candidates.find(candidate => candidate.id === (term.replacementRulerId || live?.replacementRulerId)) ?? candidates[0];
}

function replaceRulerDetail(entry: TermEntry | undefined, draft: PeaceTermDraft): string {
  const candidate = selectedReplacementCandidate(draft, entry);
  return candidate?.name || entry?.replacementRulerName || '';
}

function optionGroupKey(option: TermOption): string {
  return `${option.direction}:${option.type}`;
}

function optionGroupLabel(option: TermOption): string {
  switch (option.type) {
    case 'release_vassal':
      return isConcession(option)
        ? webUIText('PeaceNegotiation.Group.ReleaseOurSubjects')
        : webUIText('PeaceNegotiation.Group.ReleaseTheirSubjects');
    case 'onetime_tribute':
    case 'tribute':
      return isConcession(option)
        ? webUIText('PeaceNegotiation.Group.OfferGold')
        : webUIText('PeaceNegotiation.Group.DemandGold');
    case 'ongoing_tribute':
      return isConcession(option)
        ? webUIText('PeaceNegotiation.Group.OfferTribute')
        : webUIText('PeaceNegotiation.Group.DemandTribute');
    case 'annex_territory':
      return isConcession(option) ? webUIText('PeaceNegotiation.Group.OfferTerritory') : webUIText('PeaceNegotiation.Group.DemandTerritory');
    case 'impose_peace':
      return webUIText("Auto.Return.componentsscreensPeaceNegotiationScreen.227.1");
    case 'demand_vassalization':
      return webUIText("Auto.Return.componentsscreensPeaceNegotiationScreen.229.1");
    case 'annex_faction':
      return isConcession(option) ? webUIText('PeaceNegotiation.Group.Surrender') : webUIText('PeaceNegotiation.Group.Annexation');
    case 'rebel_conquest':
      return isConcession(option) ? webUIText('PeaceNegotiation.Group.TotalSurrender') : webUIText('PeaceNegotiation.Group.TotalConquest');
    case 'migration_settlement':
      return isConcession(option) ? webUIText('PeaceNegotiation.Group.OfferMigration') : webUIText('PeaceNegotiation.Group.DemandMigration');
    case 'replace_ruler':
      return isConcession(option) ? webUIText('PeaceNegotiation.Group.ReplaceOurRuler') : webUIText('PeaceNegotiation.Group.ReplaceTheirRuler');
    case 'white_peace':
      return webUIText("Auto.Return.componentsscreensPeaceNegotiationScreen.231.1");
    default:
      return option.label;
  }
}

function shouldGroupOptions(options: TermOption[]): boolean {
  if (options.length > 1) return true;
  return options[0]?.type === 'release_vassal';
}

function buildWarSummary(state: PeaceNegotiationState, daysInYear: number, daysInMonth: number): string {
  const parts = [fmtWarDuration(state.warDurationDays, daysInYear, daysInMonth)];
  if (state.battlesFought > 0) {
    parts.push(webUIText(
      state.battlesFought === 1 ? 'PeaceNegotiation.WarSummary.Battle' : 'PeaceNegotiation.WarSummary.Battles',
      { Count: fmt(state.battlesFought) },
    ));
  }
  if (state.settlementsCaptured > 0) {
    parts.push(webUIText(
      state.settlementsCaptured === 1 ? 'PeaceNegotiation.WarSummary.SettlementTaken' : 'PeaceNegotiation.WarSummary.SettlementsTaken',
      { Count: fmt(state.settlementsCaptured) },
    ));
  }
  return parts.join(' - ');
}

function ParticipantRow({
  participant,
  selected,
  disabled = false,
  roleKind,
  showStrength,
  isChild = false,
  tooltipSide = 'right',
  onSelect,
}: {
  participant: Participant;
  selected: boolean;
  disabled?: boolean;
  roleKind?: ParticipantRoleKind;
  showStrength?: boolean;
  isChild?: boolean;
  tooltipSide?: 'right' | 'left';
  onSelect?: () => void;
}) {
  const faction = participant.faction;
  const roleMeta = roleKind ? roleIconMeta[roleKind] : null;

  return (
    <button
      type="button"
      className={`pns-participant-row${selected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}${isChild ? ' pns-participant-row--child' : ''}`}
      onMouseDown={disabled ? undefined : onSelect}
    >
      <FactionTooltip factionId={faction.id} factionName={faction.name} position={tooltipSide} delay={200}>
        <FactionRoundel
          factionId={faction.id}
          colour={faction.colour}
          secondaryColour={faction.secondaryColour}
          cultureGroup={faction.cultureGroup}
          emblem={faction.emblem}
          name={faction.name}
          size="sm"
          showRing
        />
      </FactionTooltip>
      <span className="pns-participant-name">{faction.name}</span>
      {roleMeta ? (
        <Tooltip content={{ title: roleMeta.title, body: roleMeta.body }} position="bottom" delay={200}>
          <img src={roleMeta.icon} alt="" className="pns-participant-role-icon" />
        </Tooltip>
      ) : null}
      {showStrength ? (
        <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensPeaceNegotiationScreen.300.1'), body: webUIText('Auto.Prop.ComponentsScreensPeaceNegotiationScreen.300.2') }} position="bottom" delay={200}>
          <span className="pns-participant-strength">
            <img src="/assets/icons/I_ArmiesQuickButton.png" alt="" className="pns-participant-stat-icon" />
            {fmtStrength(faction.strength)}
          </span>
        </Tooltip>
      ) : null}
    </button>
  );
}

function Confronter({
  faction,
  side,
  strength,
}: {
  faction: PeaceFaction | null | undefined;
  side: 'ours' | 'theirs';
  strength: number;
}) {
  if (!faction?.id) return <div className={`pns-confronter pns-confronter--${side}`} />;

  const rulerName = faction.rulerName || faction.name;
  const isTheirs = side === 'theirs';

  return (
    <div className={`pns-confronter pns-confronter--${side}`}>
      <PersonTooltip characterId={faction.rulerId || null} position={isTheirs ? 'left' : 'right'} delay={200}>
        <div className="pns-portrait-frame">
          <Portrait
            personId={faction.rulerId || undefined}
            name={rulerName}
            size="xl"
            showBorder
            borderTier="gold"
          />
        </div>
      </PersonTooltip>
      <div className={`pns-confronter-info${isTheirs ? ' pns-confronter-info--end' : ''}`}>
        <span className="pns-confronter-name">{rulerName}</span>
        <div className="pns-confronter-faction">
          {isTheirs ? <span className="pns-confronter-faction-name">{faction.name}</span> : null}
          <FactionTooltip factionId={faction.id} factionName={faction.name} position="bottom" delay={200}>
            <FactionRoundel
              factionId={faction.id}
              colour={faction.colour}
              secondaryColour={faction.secondaryColour}
              cultureGroup={faction.cultureGroup}
              emblem={faction.emblem}
              name={faction.name}
              size="sm"
              showRing
            />
          </FactionTooltip>
          {!isTheirs ? <span className="pns-confronter-faction-name">{faction.name}</span> : null}
        </div>
        <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensPeaceNegotiationScreen.359.3'), body: webUIText('Auto.Prop.ComponentsScreensPeaceNegotiationScreen.359.4') }} position="bottom" delay={200}>
          <span className={`pns-confronter-stat${isTheirs ? ' pns-confronter-stat--end' : ''}`}>
            {isTheirs ? <span className="pns-confronter-stat-value comparison-strength-value comparison-strength-value--red">{fmtStrength(strength)}</span> : null}
            {isTheirs ? <span className="pns-confronter-stat-label"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.361.1" /></span> : null}
            <img src="/assets/icons/I_ArmiesQuickButton.png" alt="" className="pns-confronter-stat-icon" />
            {!isTheirs ? <span className="pns-confronter-stat-label"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.363.2" /></span> : null}
            {!isTheirs ? <span className="pns-confronter-stat-value comparison-strength-value comparison-strength-value--gold">{fmtStrength(strength)}</span> : null}
          </span>
        </Tooltip>
      </div>
    </div>
  );
}

function DraftTermChip({
  term,
  live,
  amountStep,
  durationOptionsDays,
  onRemove,
  onChange,
  onViewCharacter,
}: {
  term: PeaceTermDraft;
  live?: TermEntry;
  amountStep: number;
  durationOptionsDays: number[];
  onRemove: () => void;
  onChange: (patch: Partial<PeaceTermDraft>) => void;
  onViewCharacter: (personId: string) => void;
}) {
  const direction = isConcession(term) ? 'concession' : 'demand';
  const label = live?.label ?? termFallbackLabel(term);
  const isReplaceRuler = term.type === 'replace_ruler';
  const detail = isReplaceRuler ? replaceRulerDetail(live, term) : termDetail(live, term);
  const isTribute = term.type === 'onetime_tribute' || term.type === 'ongoing_tribute';
  const isOngoing = term.type === 'ongoing_tribute';
  const tributeAmount = Math.max(0, Math.round(term.tributeAmount ?? live?.tributeAmount ?? 0));
  const tributeDurationDays = term.tributeDurationDays || live?.tributeDurationDays || durationOptionsDays[durationOptionsDays.length - 1];
  const candidates = replacementCandidates(term, live);
  const activeReplacementId = term.replacementRulerId || live?.replacementRulerId || candidates[0]?.id || '';

  return (
    <Tooltip
      content={{
        title: label,
        body: live?.description,
        lines: [
          { label: webUIText('Auto.Prop.ComponentsScreensPeaceNegotiationScreen.398.5'), value: formatTermCost(live?.warScoreCost, term.direction) },
          ...(selectedTargetLabel(live) ? [{ label: webUIText('Auto.Prop.ComponentsScreensPeaceNegotiationScreen.399.6'), value: selectedTargetLabel(live) }] : []),
          ...(settlementDetail(live, undefined, term) ? [{ label: webUIText('PeaceNegotiation.Tooltip.Settlements'), value: settlementDetail(live, undefined, term) }] : []),
        ],
      }}
      position="bottom"
      delay={200}
    >
      <div className={`pns-draft-chip pns-draft-chip--${direction}`}>
        <img src={termIcon(term.type)} alt="" className="pns-term-icon" />
        <div className="pns-draft-copy">
          <span className="pns-draft-chip-name">{label}</span>
          {detail ? <span className="pns-term-sub">{detail}</span> : null}
          {isTribute ? (
            <div className="pns-term-controls">
              <div className="pns-term-field pns-term-field--gold">
                <span className="pns-term-control-label"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.412.3" /></span>
                <NumberStepper
                  value={tributeAmount}
                  step={amountStep}
                  min={0}
                  className="pns-amount-control"
                  buttonClassName="pns-step-btn"
                  buttonDisabledClassName="pns-step-btn--disabled"
                  formatValue={formatNumber}
                  parseValue={tributeAmountFromText}
                  onChange={nextAmount => onChange({ tributeAmount: nextAmount })}
                />
              </div>
              {isOngoing ? (
                <div className="pns-term-field pns-term-field--years">
                  <span className="pns-term-control-label"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.438.4" /></span>
                  <div className="pns-duration-options">
                    {durationOptionsDays.map((days, index) => (
                      <button
                        key={days}
                        type="button"
                        className={`pns-duration-button${tributeDurationDays === days ? ' pns-duration-button--active' : ''}`}
                        onMouseDown={() => onChange({ tributeDurationDays: days })}
                      >
                        {TRIBUTE_DURATION_YEAR_LABELS[index]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {isReplaceRuler && candidates.length > 0 ? (
            <div className="pns-replacement-list">
              {candidates.map(candidate => (
                <button
                  key={candidate.id}
                  type="button"
                  className={`pns-replacement-row${candidate.id === activeReplacementId ? ' pns-replacement-row--active' : ''}`}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    onChange({ replacementRulerId: candidate.id });
                  }}
                >
                  <Portrait
                    personId={candidate.id}
                    src={candidate.portrait || undefined}
                    layers={candidate.portraitLayers}
                    name={candidate.name}
                    size="sm"
                    shape="circle"
                    showBorder
                    borderTier="gold"
                  />
                  <span className="pns-replacement-copy">
                    <span className="pns-replacement-name">{candidate.name}</span>
                    {candidate.title ? <span className="pns-replacement-sub">{candidate.title}</span> : null}
                  </span>
                  <span
                    className="pns-replacement-view"
                    onMouseDown={(event) => {
                      event.stopPropagation();
                      onViewCharacter(candidate.id);
                    }}
                  >
                    <img src="/assets/icons/I_Characters.png" alt="" />
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className={`pns-term-score pns-term-score--${direction}`}>{formatTermCost(live?.warScoreCost, term.direction)}</span>
        <button type="button" className="pns-draft-chip-close" onMouseDown={onRemove}>
          <img src="/assets/ui/I_CloseIcon.png" alt="" className="pns-draft-chip-close-icon" />
        </button>
      </div>
    </Tooltip>
  );
}

function AvailableTermRow({
  option,
  active,
  onAdd,
}: {
  option: TermOption;
  active?: boolean;
  onAdd: () => void;
}) {
  const direction = option.direction === 'concession' ? 'concession' : 'demand';
  const settlements = settlementDetail(undefined, option);
  const tutorialTarget = option.type === 'rebel_conquest' && option.direction === 'demand'
    ? `PeaceTerm:${option.type} TotalConquestButton`
    : `PeaceTerm:${option.type}`;
  const lines: TooltipLine[] = [
    ...(settlements ? [{ label: webUIText('PeaceNegotiation.Tooltip.Settlements'), value: settlements }] : []),
  ];

  return (
    <Tooltip
      content={{
        title: option.label,
        body: option.description,
        lines,
      }}
      position="bottom"
      delay={200}
    >
      <button type="button" className={`pns-term-row pns-term-row--${direction}${active ? ' pns-term-row--selection-active' : ''}`} data-tutorial-target={tutorialTarget} onMouseDown={onAdd}>
        <img src={termIcon(option.type)} alt="" className="pns-term-icon" />
        <span className="pns-term-copy">
          <span className="pns-term-name">{option.label}</span>
          {settlements ? <span className="pns-term-sub">{settlements}</span> : null}
        </span>
        <span className="pns-term-action">+</span>
      </button>
    </Tooltip>
  );
}

function AvailableTermGroup({
  label,
  options,
  expanded,
  activeOptionId,
  onToggle,
  onAdd,
}: {
  label: string;
  options: TermOption[];
  expanded: boolean;
  activeOptionId?: string | null;
  onToggle: () => void;
  onAdd: (option: TermOption) => void;
}) {
  const first = options[0];
  const direction = first?.direction === 'concession' ? 'concession' : 'demand';
  const active = options.some(option => option.optionId === activeOptionId);

  return (
    <div className={`pns-option-group pns-option-group--${direction}${active ? ' pns-option-group--selection-active' : ''}`}>
      <button type="button" className="pns-option-group-toggle" onMouseDown={onToggle}>
        <img
          src="/assets/icons/I_DropdownChevron.png"
          alt=""
          className={`pns-option-group-chevron${expanded ? ' pns-option-group-chevron--open' : ''}`}
        />
        <span className="pns-option-group-label">{label}</span>
        <span className="pns-option-group-count">{fmt(options.length)}</span>
      </button>
      {expanded ? (
        <div className="pns-option-group-list">
          {options.map(option => (
            <AvailableTermRow
              key={option.optionId}
              option={option}
              active={option.optionId === activeOptionId}
              onAdd={() => onAdd(option)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TermsColumn({
  title,
  targetLabel,
  direction,
  selectedTerms,
  stateTerms,
  total,
  amountStep,
  durationOptionsDays,
  onRemove,
  onChange,
  onViewCharacter,
}: {
  title: string;
  targetLabel: string;
  direction: 'demand' | 'concession';
  selectedTerms: PeaceTermDraft[];
  stateTerms: TermEntry[];
  total: number;
  amountStep: number;
  durationOptionsDays: number[];
  onRemove: (termId: string) => void;
  onChange: (termId: string, patch: Partial<PeaceTermDraft>) => void;
  onViewCharacter: (personId: string) => void;
}) {
  const byId = new Map(stateTerms.map(term => [term.termId, term]));

  return (
    <div className="panel pns-panel pns-panel--terms">
      <div className="panel-header pns-terms-header">
        <span className="panel-title">{title}</span>
        {targetLabel ? <span className="pns-target-inline">{targetLabel}</span> : null}
        <div className="panel-header-rule" />
      </div>
      <div className="panel-body">
        <div className="pns-section-head">
          <span><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.570.5" /></span>
          <span className={`pns-column-value pns-column-value--${direction === 'concession' ? 'positive' : 'negative'}`}>
            {fmtSigned(direction === 'concession' ? total : -total)}
          </span>
        </div>
        <StyledScrollArea className="pns-draft-scroll" viewportClassName="pns-draft-list">
          {selectedTerms.length > 0 ? selectedTerms.map(term => {
            const id = term.termId || termKey(term);
            return (
              <DraftTermChip
                key={id}
                term={term}
                live={byId.get(id)}
                amountStep={amountStep}
                durationOptionsDays={durationOptionsDays}
                onRemove={() => onRemove(id)}
                onChange={patch => onChange(id, patch)}
                onViewCharacter={onViewCharacter}
              />
            );
          }) : (
            <div className="pns-empty-state pns-empty-state--quiet"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.588.6" /></div>
          )}
        </StyledScrollArea>
      </div>
    </div>
  );
}

function OptionsPanel({
  title,
  options,
  activeOptionId,
  onAdd,
}: {
  title: string;
  options: TermOption[];
  activeOptionId?: string | null;
  onAdd: (option: TermOption) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const groupedOptions = useMemo(() => {
    const byGroup = new Map<string, TermOption[]>();
    for (const option of options) {
      const key = optionGroupKey(option);
      const group = byGroup.get(key);
      if (group) group.push(option);
      else byGroup.set(key, [option]);
    }

    return Array.from(byGroup.entries()).map(([key, groupOptions]) => ({
      key,
      label: optionGroupLabel(groupOptions[0]),
      options: groupOptions,
      grouped: shouldGroupOptions(groupOptions),
    }));
  }, [options]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Panel title={title} className="pns-panel pns-panel--options">
      <StyledScrollArea className="pns-option-scroll" viewportClassName="pns-option-list">
        {groupedOptions.length > 0 ? groupedOptions.map(group => (
          group.grouped ? (
            <AvailableTermGroup
              key={group.key}
              label={group.label}
              options={group.options}
              expanded={expandedGroups.has(group.key)}
              activeOptionId={activeOptionId}
              onToggle={() => toggleGroup(group.key)}
              onAdd={onAdd}
            />
          ) : (
            <AvailableTermRow
              key={group.options[0].optionId}
              option={group.options[0]}
              active={group.options[0].optionId === activeOptionId}
              onAdd={() => onAdd(group.options[0])}
            />
          )
        )) : (
          <div className="pns-empty-state pns-empty-state--quiet"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.653.7" /></div>
        )}
      </StyledScrollArea>
    </Panel>
  );
}

function ParticipantsHeaderGroup({
  title,
  participants,
  selectedId,
  tooltipSide,
  onSelect,
}: {
  title: string;
  participants: Participant[];
  selectedId: string | null | undefined;
  tooltipSide: 'left' | 'right';
  onSelect: (id: string) => void;
}) {
  return (
    <div className="pns-header-faction-group">
      <div className="pns-header-faction-title">
        <span>{title}</span>
      </div>
      <StyledScrollArea className="pns-header-faction-scroll" viewportClassName="pns-header-faction-list">
        {participants.length > 0 ? orderParticipants(participants).map(participant => {
          const faction = participant.faction;
          const selectable = true;
          return (
            <ParticipantRow
              key={faction.id}
              participant={participant}
              selected={selectedId === faction.id}
              disabled={!selectable}
              roleKind={getParticipantRoleKind(participant)}
              showStrength
              isChild={!participant.isLeader}
              tooltipSide={tooltipSide}
              onSelect={() => {
                if (selectable) onSelect(faction.id);
              }}
            />
          );
        }) : (
          <div className="pns-empty-state pns-empty-state--quiet"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.699.8" /></div>
        )}
      </StyledScrollArea>
    </div>
  );
}

export default function PeaceNegotiationScreen({ screenId, targetFactionId, onClose }: PeaceNegotiationScreenProps) {
  const selection = parsePeaceScreenSelection(screenId, targetFactionId);
  const key = selection.sourceOfferSelector ?? selection.targetFactionId ?? 'none';
  return (
    <PeaceNegotiationScreenContent
      key={key}
      targetFactionId={selection.targetFactionId}
      sourceOfferSelector={selection.sourceOfferSelector}
      onClose={onClose}
    />
  );
}

function PeaceNegotiationScreenContent({
  targetFactionId,
  sourceOfferSelector,
  onClose,
}: {
  targetFactionId: string | null;
  sourceOfferSelector: string | null;
  onClose: () => void;
}) {
  const { openScreen, openSidebar } = useGameActions();
  const { daysInYear, daysInMonth } = useGameState();
  const [terms, setTerms] = useState<PeaceTermDraft[]>([]);
  const [sourceOfferHydrated, setSourceOfferHydrated] = useState(false);
  const [submitState, setSubmitState] = useState<PeaceNegotiationState | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [acceptedMessage, setAcceptedMessage] = useState<string | null>(null);
  const [selectedDemandTargetId, setSelectedDemandTargetId] = useState<string | null>(null);
  const [selectedConcessionGiverId, setSelectedConcessionGiverId] = useState<string | null>(null);
  const [activeSettlementSelectionOptionId, setActiveSettlementSelectionOptionId] = useState<string | null>(null);
  const [initialSourceTerms, setInitialSourceTerms] = useState<PeaceTermDraft[] | null>(null);
  const acceptedCloseTimerRef = useRef<number | null>(null);
  const bridgeTargetFactionId = sourceOfferSelector && !sourceOfferHydrated ? sourceOfferSelector : targetFactionId;
  const sourceOfferUnmodified = Boolean(
    sourceOfferSelector
    && sourceOfferHydrated
    && initialSourceTerms
    && sameTerms(terms, initialSourceTerms),
  );
  const submitTargetFactionId = sourceOfferUnmodified ? sourceOfferSelector : targetFactionId;
  const bridge = usePeaceNegotiationBridge(bridgeTargetFactionId, terms, submitTargetFactionId);
  const state = bridge.state ?? submitState;
  const statePending = bridge.statePending && !submitState;
  const draftPreview = bridge.draftPreview?.found ? bridge.draftPreview : null;
  const preview = draftPreview?.preview ?? state?.preview;
  const liveTerms = draftPreview?.terms ?? state?.terms ?? [];
  const ourLead = state ? findLeader(state.ourParticipants) : null;
  const theirLead = state ? findLeader(state.theirParticipants) : null;
  const ourLeadId = ourLead?.faction.id ?? state?.playerFaction.id ?? null;
  const theirLeadId = theirLead?.faction.id ?? state?.targetFaction.id ?? null;
  const activeConcessionGiverId = selectedConcessionGiverId ?? ourLeadId;
  const activeDemandTargetId = selectedDemandTargetId ?? theirLeadId;
  const selectedIds = useMemo(() => new Set(terms.map(term => term.termId || termKey(term))), [terms]);
  const availableTerms = useMemo(() => (
    (state?.availableTerms ?? []).map(option => ({
      ...option,
      isSelected: option.isSelected || selectedIds.has(option.optionId),
    }))
  ), [selectedIds, state?.availableTerms]);
  const selectedDemands = terms.filter(term => !isConcession(term));
  const selectedConcessions = terms.filter(isConcession);
  const demandOptions = availableTerms.filter(option => !isConcession(option) && !option.isSelected && optionAppliesToSelectedTarget(option, activeDemandTargetId));
  const concessionOptions = availableTerms.filter(option => isConcession(option) && !option.isSelected && optionAppliesToSelectedTarget(option, activeConcessionGiverId));
  const demandCost = preview?.demandCost ?? 0;
  const concessionCost = preview?.concessionCost ?? 0;
  const proposalScore = preview?.acceptanceScore ?? 0;
  const acceptTone = acceptanceTone(proposalScore);
  const proposalScoreClamped = clamp(proposalScore, -100, 100);
  const acceptanceScale = (Math.abs(proposalScoreClamped) / 100).toFixed(3);
  const warScore = preview?.currentWarScore ?? 0;
  const warScoreScale = Math.min(1, Math.abs(warScore) / 100).toFixed(3);
  const canSubmit = (!sourceOfferSelector || sourceOfferHydrated) && Boolean(preview?.canSubmit);
  const screenTitle = state?.found ? (state.warName || webUIText("PeaceNegotiation.WarSettlement")) : webUIText("PeaceNegotiation.PeaceTreaty");
  const warScoreBreakdown: TooltipContent = {
    title: webUIText('Diplomacy.WarScoreBreakdown'),
    body: webUIText('Diplomacy.WarScoreBreakdownBody'),
    lines: (preview?.warScoreBreakdown ?? []).map(entry => ({
      label: `${entry.depth > 0 ? '· ' : ''}${entry.label}${entry.eventCount > 1 ? ` (${formatNumber(entry.eventCount)})` : ''}`,
      value: formatSignedNumber(entry.score, { maximumFractionDigits: 1 }),
      valueColor: entry.score >= 0 ? 'var(--green)' : 'var(--red)',
    })),
  };
  const titleExtra = state?.found ? (
    <Tooltip content={warScoreBreakdown} position="bottom" delay={150}>
      <div className="pns-title-progress">
        <div className="pns-title-progress-track pns-warscore-track">
          <div className="pns-warscore-center" />
          {warScore > 0 ? (
            <div
              className="pns-warscore-fill pns-warscore-fill--ours"
              style={{ transform: `scaleX(${warScoreScale})` }}
            />
          ) : null}
          {warScore < 0 ? (
            <div
              className="pns-warscore-fill pns-warscore-fill--theirs"
              style={{ transform: `scaleX(${warScoreScale})` }}
            />
          ) : null}
        </div>
        <span className="pns-title-progress-value">{fmtWarScore(warScore)}</span>
        <span className="pns-title-progress-summary">{buildWarSummary(state, daysInYear, daysInMonth)}</span>
      </div>
    </Tooltip>
  ) : undefined;

  useEffect(() => {
    if (!sourceOfferSelector || sourceOfferHydrated || !state?.found) return;

    const initialTerms = state.terms.map(draftFromEntry);
    const hydrationTimer = window.setTimeout(() => {
      setInitialSourceTerms(initialTerms);
      setTerms(initialTerms);
      setSourceOfferHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, [sourceOfferHydrated, sourceOfferSelector, state]);

  const applySettlementSelection = useCallback((selection: {
    selectionActive: boolean;
    targetFactionId: string;
    terms: PeaceTermDraft[];
  }) => {
    const selectionTargetFactionId = state?.targetFactionId || targetFactionId;
    if (!selectionTargetFactionId) return;
    if (!selection.selectionActive || selection.targetFactionId !== selectionTargetFactionId) return;

    setOutcome(null);
    setAcceptedMessage(null);
    const selectedTerritoryTerms = selection.terms ?? [];
    setTerms(current => {
      const withoutTerritorySelections = current.filter(term => !isTerritorySelectionTerm(term));
      const compatibleTerms = selectedTerritoryTerms.length > 0
        ? withoutTerritorySelections.filter(term => !isConquestType(term.type) && !isMigrationType(term.type))
        : withoutTerritorySelections;
      return [...compatibleTerms, ...selectedTerritoryTerms];
    });
  }, [state?.targetFactionId, targetFactionId]);

  useEffect(() => (
    onBridgeEvent('game.start_peace_settlement_selection', applySettlementSelection)
  ), [applySettlementSelection]);

  useEffect(() => () => {
    if (acceptedCloseTimerRef.current !== null) {
      window.clearTimeout(acceptedCloseTimerRef.current);
    }
  }, []);

  const acceptabilityBreakdown: TooltipContent = useMemo(() => ({
    title: webUIText('Auto.Prop.ComponentsScreensPeaceNegotiationScreen.804.13'),
    body: renderAcceptabilityBreakdown(preview?.breakdown || webUIText("PeaceNegotiation.HowLikelyThe")),
  }), [preview]);

  const participantHeader = state?.found ? (
    <div className="pns-header-confrontation">
      <button
        type="button"
        className="pns-back-link"
        onMouseDown={() => openScreen('diplomacy', 'wars')}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M8 1L3 6L8 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
        </svg>
        <span><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.994.17" /></span>
      </button>

      <div className="pns-header-side pns-header-side--ours">
        <ParticipantsHeaderGroup
          title={webUIText('Auto.Attr.ComponentsScreensPeaceNegotiationScreen.1000.23')}
          participants={state.ourParticipants}
          selectedId={activeConcessionGiverId}
          tooltipSide="right"
          onSelect={setSelectedConcessionGiverId}
        />
        <Confronter faction={ourLead?.faction ?? state.playerFaction} side="ours" strength={sideStrength(state.ourParticipants)} />
      </div>

      <div className="pns-header-side pns-header-side--theirs">
        <Confronter faction={theirLead?.faction ?? state.targetFaction} side="theirs" strength={sideStrength(state.theirParticipants)} />
        <ParticipantsHeaderGroup
          title={webUIText('Auto.Attr.ComponentsScreensPeaceNegotiationScreen.1012.24')}
          participants={state.theirParticipants}
          selectedId={activeDemandTargetId}
          tooltipSide="left"
          onSelect={setSelectedDemandTargetId}
        />
      </div>
    </div>
  ) : null;

  const addTerm = (option: TermOption) => {
    if (option.isSelected || selectedIds.has(option.optionId)) return;
    setOutcome(null);
    setAcceptedMessage(null);
    const draft = draftFromOption(option);
    if (draft.type === 'annex_territory' && (draft.targetSettlementIds?.length ?? 0) === 0) {
      setActiveSettlementSelectionOptionId(option.optionId);
      void bridge.startSettlementSelection(terms).then(selection => {
        if (!selection?.selectionActive) setActiveSettlementSelectionOptionId(null);
        if (selection) applySettlementSelection(selection);
      });
      return;
    }
    setActiveSettlementSelectionOptionId(null);
    setTerms(current => [...current.filter(term => !termsConflict(term, draft)), draft]);
  };

  const removeTerm = (termId: string) => {
    setOutcome(null);
    setAcceptedMessage(null);
    setTerms(current => current.filter(term => (term.termId || termKey(term)) !== termId));
  };

  const updateTerm = (termId: string, patch: Partial<PeaceTermDraft>) => {
    setOutcome(null);
    setAcceptedMessage(null);
    setTerms(current => current.map(term => (
      (term.termId || termKey(term)) === termId ? { ...term, ...patch } : term
    )));
  };

  const handleReset = () => {
    setOutcome(null);
    setAcceptedMessage(null);
    setSubmitState(null);
    if (sourceOfferSelector && initialSourceTerms) {
      setTerms(initialSourceTerms);
    } else {
      setTerms([]);
    }
    setSelectedDemandTargetId(null);
    setSelectedConcessionGiverId(null);
    setActiveSettlementSelectionOptionId(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const result = await bridge.submit(terms);
    if (!result) return;

    setOutcome(result.message || null);
    if (result.state?.found) setSubmitState(result.state);

    if (result.result === 'accepted') {
      setAcceptedMessage(result.message || 'Accepted');
      if (acceptedCloseTimerRef.current !== null) {
        window.clearTimeout(acceptedCloseTimerRef.current);
      }
      acceptedCloseTimerRef.current = window.setTimeout(
        onClose,
        UI_MOTION.acceptedNegotiationCloseMs
      );
      return;
    }

    if (result.result === 'counter_offer' && result.state?.terms) {
      setTerms(result.state.terms.map(draftFromEntry));
      return;
    }
  };

  const body = acceptedMessage ? (
    <div className="pns-accepted-state">
      <div className="pns-accepted-card">
        <span className="pns-accepted-title"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.865.9" /></span>
        {acceptedMessage ? <span className="pns-accepted-message">{acceptedMessage}</span> : null}
      </div>
    </div>
  ) : !targetFactionId ? (
    <Panel title={webUIText('Auto.Attr.ComponentsScreensPeaceNegotiationScreen.872.14')} className="pns-panel pns-panel--empty">
      <div className="pns-empty-state"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.872.11" /></div>
    </Panel>
  ) : state && !state.found ? (
    <Panel title={webUIText('Auto.Attr.ComponentsScreensPeaceNegotiationScreen.876.15')} className="pns-panel pns-panel--empty">
      <div className="pns-empty-state">{state.emptyReason || webUIText("PeaceNegotiation.NoPeaceNegotiation")}</div>
    </Panel>
  ) : state ? (
    <div className="pns-board">
      <OptionsPanel
        title={webUIText('Auto.Attr.ComponentsScreensPeaceNegotiationScreen.882.16')}
        options={concessionOptions}
        activeOptionId={activeSettlementSelectionOptionId}
        onAdd={addTerm}
      />

      <div className="pns-middle">
        <div className="pns-selected-columns">
          <TermsColumn
            title={webUIText('Auto.Attr.ComponentsScreensPeaceNegotiationScreen.890.17')}
            targetLabel={ourLead?.faction.name ? webUIText("PeaceNegotiation.ByName", { Name: ourLead.faction.name }) : ''}
            direction="concession"
            selectedTerms={selectedConcessions}
            stateTerms={liveTerms}
            total={concessionCost}
            amountStep={state.amountStep}
            durationOptionsDays={state.durationOptionsDays}
            onRemove={removeTerm}
            onChange={updateTerm}
            onViewCharacter={id => openSidebar('character', id)}
          />

          <TermsColumn
            title={webUIText('Auto.Attr.ComponentsScreensPeaceNegotiationScreen.901.18')}
            targetLabel={theirLead?.faction.name ? webUIText("PeaceNegotiation.FromName", { Name: theirLead.faction.name }) : ''}
            direction="demand"
            selectedTerms={selectedDemands}
            stateTerms={liveTerms}
            total={demandCost}
            amountStep={state.amountStep}
            durationOptionsDays={state.durationOptionsDays}
            onRemove={removeTerm}
            onChange={updateTerm}
            onViewCharacter={id => openSidebar('character', id)}
          />
        </div>

        <div className="pns-decision-block pns-decision-block--middle">
          <div className="pns-acceptance-meter">
            <div className="pns-acceptance-header">
              <Tooltip content={acceptabilityBreakdown} position="left" delay={200} variant="sidebar" bubbleClassName="pns-acceptability-tooltip">
                <span className={`pns-acceptance-label pns-acceptance-label--${acceptTone}`}>
                  {preview?.verdictLabel || webUIText("PeaceNegotiation.NoOffer")}
                </span>
              </Tooltip>
              <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensPeaceNegotiationScreen.920.19'), body: webUIText('Auto.Prop.ComponentsScreensPeaceNegotiationScreen.920.20') }} position="top" delay={200}>
                <button type="button" className="pns-reset-inline" onMouseDown={handleReset}>
                  <img src="/assets/icons/DeselectAll.png" alt="" />
                  <span><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.922.12" /></span>
                </button>
              </Tooltip>
            </div>
            <Tooltip content={acceptabilityBreakdown} position="left" delay={200} variant="sidebar" bubbleClassName="pns-acceptability-tooltip">
              <div className="pns-pivot-track painted-bar-track">
                {proposalScoreClamped < 0 ? (
                  <div
                    className="painted-bar-fill painted-bar-fill--red"
                    style={{ width: '50%', right: '50%', left: 'auto', borderRadius: 0, transformOrigin: 'right', transform: `scaleX(${acceptanceScale})` }}
                  />
                ) : null}
                {proposalScoreClamped > 0 ? (
                  <div
                    className="painted-bar-fill painted-bar-fill--green"
                    style={{ width: '50%', left: '50%', borderRadius: 0, transformOrigin: 'left', transform: `scaleX(${acceptanceScale})` }}
                  />
                ) : null}
                <div className="pns-pivot-center" />
              </div>
            </Tooltip>
            <div className="pns-pivot-scale">
              <span><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.944.13" /></span>
              <span><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.945.14" /></span>
            </div>
          </div>

          {preview?.blockedReason ? <div className="pns-empty-state">{preview.blockedReason}</div> : null}
          {outcome ? <div className="pns-outcome">{outcome}</div> : null}

          <button
            type="button"
            className={`btn--burgundy btn--full pns-propose-button${canSubmit ? '' : ' pns-propose-button--disabled'}`}
            disabled={!canSubmit}
            onMouseDown={handleSubmit}
          >
            <WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.958.15" />
          </button>
        </div>
      </div>

      <OptionsPanel
        title={webUIText('Auto.Attr.ComponentsScreensPeaceNegotiationScreen.965.21')}
        options={demandOptions}
        activeOptionId={activeSettlementSelectionOptionId}
        onAdd={addTerm}
      />
    </div>
  ) : statePending ? null : (
    <Panel title={webUIText('Auto.Attr.ComponentsScreensPeaceNegotiationScreen.971.22')} className="pns-panel pns-panel--empty">
      <div className="pns-empty-state"><WebUIText textKey="Auto.ComponentsScreensPeaceNegotiationScreen.971.16" /></div>
    </Panel>
  );

  return (
    <div className="pns-stage pns-stage--peace">
      <ScreenShell
        title={screenTitle}
        onClose={onClose}
        advisorTopic="peaceNegotiation"
        titleExtra={titleExtra}
        className="screen--negotiation"
        contentClassName="screen-content--negotiation"
      >
        <div className="pns-wrap">
          {participantHeader}
          {body}
        </div>
      </ScreenShell>
    </div>
  );
}

registerScreen({
  id: 'peace',
  render: ({ screenId, onClose }) => (
    <PeaceNegotiationScreen key={screenId ?? 'peace'} screenId={screenId} onClose={onClose} />
  ),
  topbarId: 'diplomacy',
  openedByTopbar: false,
  advisorTopic: 'peaceNegotiation',
  overlayVariant: 'diplomacy',
  bridgeNames: ['peace', 'peacenegotiation'],
  factionMode: 'independent',
});
