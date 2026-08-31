import { useCallback, useMemo, useState, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import GameBar from '../../common/data-display/bars/GameBar';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import GameButton from '../../common/buttons/GameButton';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import SortableHeader from '../../common/layout/tables/SortableHeader';
import Tooltip from '../../common/tooltips/Tooltip';
import EntityLink from '../../common/entities/EntityLink';
import VirtualList from '../../common/layout/scrolling/VirtualList';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import { BureaucraticInlineValue } from '../../bureaucracy/BureaucraticThroughput';
import { bureaucraticTooltipLine } from '../../bureaucracy/BureaucraticThroughputModel';
import ProvinceCreationLeaderModal from '../../modals/provinces/ProvinceCreationLeaderModal';
import RegionGovernorAppointmentModal from '../../modals/characters/RegionGovernorAppointmentModal';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useGameActions } from '../../../context/GameContext';
import { useMilitaryOverview, usePlayerFactionId } from '../../../data-source/index';
import { useCharacterListBridge, type CharacterListEntry } from '../../../bridge/characters/useCharactersBridge';
import {
  adjustSubjectTaxRateBridge,
  refreshDiplomacyOverviewBridge,
  setAutoAssignGovernorsBridge,
  setProvinceBuildFocusBridge,
  useDiplomacyOverviewBridge,
  type DiplomacyOverviewState,
} from '../../../bridge/diplomacy/useDiplomacyOverviewBridge';
import { useEconomyOverviewBridge } from '../../../bridge/settlements-economy/useEconomyOverviewBridge';
import { toggleFoederatiCallupBridge } from '../../../bridge/military-map/useMilitaryBridge';
import { usePowerBlocsBridge } from '../../../bridge/diplomacy/usePowerBlocsBridge';
import type { EconomyOverviewTaxRow, EconomyOverviewVassalRow } from '../../../bridge-types.generated.ts';
import type { MilitaryFoederatiEntry, MilitaryForce, PowerBloc } from '../../../data/types';
import { getComplianceState, getOpinionColor } from '../../../utils/colorFormatters';
import { STAT_ICONS } from '../../../utils/iconMaps';
import { formatCompactNumber, formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import { compareSortValuesWithDirection as compareValues, toggleSortState, type SortState } from '../../common/layout/tables/sortUtils';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import './InternalPoliticsScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
type InternalFaction = DiplomacyOverviewState['internalFactions'][number];
type RegionalGovernor = DiplomacyOverviewState['regionalGovernors'][number];
type ProvinceCandidate = DiplomacyOverviewState['provinceCandidates'][number];
type InternalPoliticsTab = 'provinces' | 'foederati' | 'governors' | 'candidates' | 'commands';
type ProvinceSortKey = 'province' | 'ruler' | 'compliance' | 'focus' | 'tax' | 'tribute' | 'scale';
type FoederatiSortKey = 'name' | 'ruler' | 'compliance' | 'ready' | 'active' | 'strength';
type CommandSortKey = 'commander' | 'force' | 'type' | 'strength' | 'relation';
type GovernorSortKey = 'region' | 'governor' | 'settlements' | 'corruption' | 'tax' | 'unrest' | 'military';

interface CommandHeadSummary {
  force: MilitaryForce;
  subordinateCount: number;
  totalStrength: number;
  totalMaxStrength: number;
}

const TABS: Array<{ id: InternalPoliticsTab; label: string }> = [
  { id: 'provinces', get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.47.1'); } },
  { id: 'foederati', get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.48.2'); } },
  { id: 'governors', get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.49.3'); } },
  { id: 'candidates', get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.50.4'); } },
  { id: 'commands', get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.51.5'); } },
];

const EMPTY_CHARACTERS: CharacterListEntry[] = [];
const EMPTY_BLOCS: PowerBloc[] = [];
const EMPTY_INTERNAL_FACTIONS: InternalFaction[] = [];
const EMPTY_GOVERNORS: RegionalGovernor[] = [];
const EMPTY_PROVINCE_CANDIDATES: ProvinceCandidate[] = [];
const EMPTY_FOEDERATI: MilitaryFoederatiEntry[] = [];
const INTERNAL_LIST_VIRTUALISE_THRESHOLD = 10;
const INTERNAL_LIST_OVERSCAN = 2;

type BuildFocusId = 'balanced' | 'economic' | 'military' | 'infrastructure' | 'cultural' | 'administrative';

const LAND_ICON = WebkilnAssetPath('/assets/icons/I_Land.png');
const SETTLEMENT_ICON = WebkilnAssetPath('/assets/icons/I_City.png');
const FOCUS_OPTIONS: Array<{ id: BuildFocusId; label: string; icon: string; body: string }> = [
  {
    id: 'balanced',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.66.6'); },
    icon: WebkilnAssetPath('/assets/events/I_Focus_Balanced.png'),
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.68.7'); },
  },
  {
    id: 'economic',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.72.8'); },
    icon: WebkilnAssetPath('/assets/events/I_Focus_Economic.png'),
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.74.9'); },
  },
  {
    id: 'military',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.78.10'); },
    icon: WebkilnAssetPath('/assets/events/I_Focus_Military.png'),
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.80.11'); },
  },
  {
    id: 'infrastructure',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.84.12'); },
    icon: WebkilnAssetPath('/assets/events/I_Focus_Infrastructure.png'),
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.86.13'); },
  },
  {
    id: 'cultural',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.90.14'); },
    icon: WebkilnAssetPath('/assets/events/I_Focus_Cultural.png'),
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.92.15'); },
  },
  {
    id: 'administrative',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.96.16'); },
    icon: WebkilnAssetPath('/assets/events/I_Focus_Administrative.png'),
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.98.17'); },
  },
];

const GOLD_ICON = WebkilnAssetPath('/assets/icons/I_Coins.png');
const PROVINCE_ICON = WebkilnAssetPath('/assets/icons/I_ProvincialCapital.png');
const READY_ICON = WebkilnAssetPath('/assets/icons/I_GoalMet.png');
const BLOCKED_ICON = WebkilnAssetPath('/assets/icons/I_GoalNotMet.png');

function clampPercent(value: number | undefined): number {
  if (value === undefined) return 0;
  return Math.max(0, Math.min(100, value));
}

function complianceColour(value: number | undefined): string {
  if (value === undefined) return 'var(--text-dark)';
  return getComplianceState(value).color;
}

function opinionColour(value: number | undefined): string {
  if (value === undefined) return 'var(--text-dark)';
  return getOpinionColor(value);
}

function complianceMeterValue(value: number | undefined): number {
  if (value === undefined) return 0;
  return Math.max(0, Math.min(100, (value + 100) / 2));
}

function subjectTypeLabel(row: InternalFaction): string {
  if (row.isRebel && !row.subjectType) return webUIText("Auto.Return.componentsscreensInternalPoliticsScreen.134.1");
  return row.subjectType || row.diplomaticStatusLabel;
}

function statusLabel(row: InternalFaction): string {
  return row.diplomaticStatusLabel;
}

function isFoederati(row: InternalFaction): boolean {
  return row.subjectSubtype === 'foederati';
}

function isProvince(row: InternalFaction): boolean {
  const text = `${row.subjectSubtype} ${row.subjectType}`.toLowerCase();
  return row.isRebel || text.indexOf('province') >= 0 || text.indexOf('prefecture') >= 0;
}

function blocForPerson(personId: string | undefined, blocs: PowerBloc[]): PowerBloc | undefined {
  if (!personId) return undefined;
  return blocs.find(entry => (
    entry.leaderId === personId
    || (entry.members ?? []).some(member => member.id === personId)
  ));
}

function focusKeyForRow(row: InternalFaction): BuildFocusId {
  const raw = `${row.buildFocusKey || row.buildFocus}`.toLowerCase();
  const option = FOCUS_OPTIONS.find(entry => raw.indexOf(entry.id) >= 0);
  return option?.id ?? 'balanced';
}

function hasBuildFocus(row: InternalFaction): boolean {
  return Boolean(row.buildFocusKey || row.buildFocus);
}

function normalisedRate(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Math.abs(value) > 1 ? value / 100 : value;
}

function provinceTaxValue(row: InternalFaction, economies: Map<string, EconomyOverviewVassalRow>, taxes: Map<string, EconomyOverviewTaxRow>): number | undefined {
  return normalisedRate(economies.get(row.id)?.taxRate ?? taxes.get(row.id)?.effectiveRate ?? row.taxRate);
}

function provinceTributeValue(row: InternalFaction, economies: Map<string, EconomyOverviewVassalRow>, taxes: Map<string, EconomyOverviewTaxRow>): number | undefined {
  return economies.get(row.id)?.goldTribute ?? taxes.get(row.id)?.currentTax ?? row.goldTribute;
}

function characterMap(characters: CharacterListEntry[]): Map<string, CharacterListEntry> {
  return new Map(characters.map(character => [character.id, character]));
}

function provinceLeaderCandidates(characters: CharacterListEntry[]): CharacterListEntry[] {
  return characters
    .filter(character => character.canLeadProvince)
    .sort((a, b) => (
      compareValues(a.stats.governance, b.stats.governance, 'desc')
      || compareValues(a.name, b.name, 'asc')
    ));
}

function commandHeads(forces: MilitaryForce[] | undefined): CommandHeadSummary[] {
  const allForces = forces ?? [];
  const childrenByParent = new Map<string, MilitaryForce[]>();

  for (const force of allForces) {
    if (!force.parentId) continue;
    const children = childrenByParent.get(force.parentId) ?? [];
    children.push(force);
    childrenByParent.set(force.parentId, children);
  }

  const summarise = (force: MilitaryForce): CommandHeadSummary => {
    let subordinateCount = 0;
    let totalStrength = force.strength;
    let totalMaxStrength = force.maxStrength;

    for (const child of childrenByParent.get(force.id) ?? []) {
      const childSummary = summarise(child);
      subordinateCount += childSummary.subordinateCount + 1;
      totalStrength += childSummary.totalStrength;
      totalMaxStrength += childSummary.totalMaxStrength;
    }

    return { force, subordinateCount, totalStrength, totalMaxStrength };
  };

  return allForces
    .filter(force => !force.parentId)
    .map(summarise);
}

function toggleInternalSort<T extends string>(current: SortState<T>, key: T): SortState<T> {
  return toggleSortState(current, key, 'desc');
}

function sortProvinceRows(
  rows: InternalFaction[],
  economies: Map<string, EconomyOverviewVassalRow>,
  taxes: Map<string, EconomyOverviewTaxRow>,
  sort: SortState<ProvinceSortKey>,
): InternalFaction[] {
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case 'province':
        return compareValues(a.name, b.name, sort.direction);
      case 'ruler':
        return compareValues(a.rulerName, b.rulerName, sort.direction);
      case 'compliance':
        return compareValues(a.hasCompliance ? a.compliance : undefined, b.hasCompliance ? b.compliance : undefined, sort.direction);
      case 'focus':
        return compareValues(hasBuildFocus(a) ? focusKeyForRow(a) : '', hasBuildFocus(b) ? focusKeyForRow(b) : '', sort.direction);
      case 'tax':
        return compareValues(provinceTaxValue(a, economies, taxes), provinceTaxValue(b, economies, taxes), sort.direction);
      case 'tribute':
        return compareValues(provinceTributeValue(a, economies, taxes), provinceTributeValue(b, economies, taxes), sort.direction);
      case 'scale':
        return compareValues(a.population, b.population, sort.direction);
      default:
        return 0;
    }
  });
}

function sortFoederatiRows(rows: MilitaryFoederatiEntry[], factions: Map<string, InternalFaction>, sort: SortState<FoederatiSortKey>): MilitaryFoederatiEntry[] {
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case 'name':
        return compareValues(a.factionName, b.factionName, sort.direction);
      case 'ruler':
        return compareValues(factions.get(a.factionId)?.rulerName ?? a.rulerName, factions.get(b.factionId)?.rulerName ?? b.rulerName, sort.direction);
      case 'compliance':
        return compareValues(a.compliance, b.compliance, sort.direction);
      case 'ready':
        return compareValues(a.availableStrength, b.availableStrength, sort.direction);
      case 'active':
        return compareValues(a.activeStrength, b.activeStrength, sort.direction);
      case 'strength':
        return compareValues(a.strength, b.strength, sort.direction);
      default:
        return 0;
    }
  });
}

function sortCommandRows(rows: CommandHeadSummary[], characters: Map<string, CharacterListEntry>, sort: SortState<CommandSortKey>): CommandHeadSummary[] {
  return [...rows].sort((a, b) => {
    const characterA = a.force.commanderId ? characters.get(a.force.commanderId) : undefined;
    const characterB = b.force.commanderId ? characters.get(b.force.commanderId) : undefined;
    const relationA = characterA?.hasCompliance ? characterA.complianceTowardPlayer : characterA?.stats.loyalty;
    const relationB = characterB?.hasCompliance ? characterB.complianceTowardPlayer : characterB?.stats.loyalty;

    switch (sort.key) {
      case 'commander':
        return compareValues(a.force.commanderName, b.force.commanderName, sort.direction);
      case 'force':
        return compareValues(a.force.name, b.force.name, sort.direction);
      case 'type':
        return compareValues(a.force.isNavy ? 1 : 0, b.force.isNavy ? 1 : 0, sort.direction);
      case 'strength':
        return compareValues(a.totalStrength, b.totalStrength, sort.direction);
      case 'relation':
        return compareValues(relationA, relationB, sort.direction);
      default:
        return 0;
    }
  });
}

function sortGovernorRows(rows: RegionalGovernor[], sort: SortState<GovernorSortKey>): RegionalGovernor[] {
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case 'region':
        return compareValues(a.regionName, b.regionName, sort.direction);
      case 'governor':
        return compareValues(a.governorName, b.governorName, sort.direction);
      case 'settlements':
        return compareValues(a.settlementCount, b.settlementCount, sort.direction);
      case 'corruption':
        return compareValues(a.corruptionPercent, b.corruptionPercent, sort.direction);
      case 'tax':
        return compareValues(a.taxBonusPercent, b.taxBonusPercent, sort.direction);
      case 'unrest':
        return compareValues(a.unrestReductionPercent, b.unrestReductionPercent, sort.direction);
      case 'military':
        return compareValues(a.militaryBonusPercent, b.militaryBonusPercent, sort.direction);
      default:
        return 0;
    }
  });
}

function economyMap(rows: EconomyOverviewVassalRow[] | undefined): Map<string, EconomyOverviewVassalRow> {
  return new Map((rows ?? []).map(row => [row.id, row]));
}

function taxMap(rows: EconomyOverviewTaxRow[] | undefined): Map<string, EconomyOverviewTaxRow> {
  return new Map((rows ?? []).map(row => [row.factionId, row]));
}

function internalFactionMap(rows: InternalFaction[]): Map<string, InternalFaction> {
  return new Map(rows.map(row => [row.id, row]));
}

function displayRate(value: number | undefined): string {
  if (value === undefined) return '-';
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${formatNumber(percent, { maximumFractionDigits: 0 })}%`;
}

function GoldValue({ value, monthly = false, signed = false }: { value: number | undefined; monthly?: boolean; signed?: boolean }) {
  if (value === undefined || Math.abs(value) < 0.001) {
    return <span>-</span>;
  }

  const amount = signed
    ? formatSignedNumber(value, { maximumFractionDigits: 0 })
    : formatNumber(value, { maximumFractionDigits: 0 });

  return (
    <span className="ips-gold-value">
      <img className="ips-gold-icon" src={GOLD_ICON} alt={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.326.1')} />
      <span>{monthly ? webUIText("InternalPolitics.AmountPerMonth", { Amount: amount }) : amount}</span>
    </span>
  );
}

function ProvinceMetric({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="ips-province-metric">
      <img className="ips-province-metric-icon" src={icon} alt="" />
      <div className="ips-province-metric-copy">
        <span className="ips-province-metric-label">{label}</span>
        <span className="ips-province-metric-value">{children}</span>
      </div>
    </div>
  );
}

function BlocLine({ bloc }: { bloc?: PowerBloc }) {
  if (!bloc) {
    return <span className="ips-bloc-line"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.342.1" /></span>;
  }

  return (
    <EntityLink
      type="powerbloc"
      id={bloc.id}
      className="ips-bloc-line ips-bloc-link"
      icon={bloc.iconKey ? <img className="ips-bloc-icon" src={bloc.iconKey} alt="" /> : null}
    >
      {webUIText("InternalPolitics.Bloc", { Name: bloc.name })}
    </EntityLink>
  );
}

function ComplianceStateLabel({ value }: { value: number | undefined }) {
  if (value === undefined) {
    return <span className="ips-compliance-state ips-compliance-state--empty">-</span>;
  }

  const state = getComplianceState(value);
  return (
    <span className="ips-compliance-state" style={{ color: state.color }}>
      <img className="ips-compliance-icon" src={state.icon} alt="" />
      <span>{state.label}</span>
      <strong>{formatNumber(value)}</strong>
    </span>
  );
}

function PersonPortrait({
  character,
  personId,
  name,
  portrait: portraitSrc,
  portraitLayers,
}: {
  character?: CharacterListEntry;
  personId?: string;
  name: string;
  portrait?: string;
  portraitLayers?: CharacterListEntry['portraitLayers'];
}) {
  const portrait = (
    <Portrait
      personId={personId}
      resolvePerson
      src={character?.portrait ?? portraitSrc}
      layers={character?.portraitLayers ?? portraitLayers}
      name={name}
      isAlive={character?.isAlive}
      activity={character?.activity}
      isPlayerCharacter={character?.isPlayerCharacter}
      isHeir={character?.isHeir}
      size="md"
      showBorder
    />
  );

  return personId ? (
    <PersonTooltip characterId={personId} position="right" delay={150}>
      {portrait}
    </PersonTooltip>
  ) : portrait;
}

function InternalFactionRow({
  row,
  characters,
  blocs,
  economy,
  tax,
}: {
  row: InternalFaction;
  characters: Map<string, CharacterListEntry>;
  blocs: PowerBloc[];
  economy?: EconomyOverviewVassalRow;
  tax?: EconomyOverviewTaxRow;
}) {
  const { openSidebar } = useGameActions();
  const [showFocusOptions, setShowFocusOptions] = useState(false);
  const character = characters.get(row.rulerId);
  const compliance = row.hasCompliance ? row.compliance : undefined;
  const complianceTone = complianceColour(compliance);
  const opinionTone = opinionColour(row.opinion);
  const bloc = blocForPerson(row.rulerId, blocs);
  const hasFocus = hasBuildFocus(row);
  const focusKey = focusKeyForRow(row);
  const canSetBuildFocus = hasFocus && row.canSetBuildFocus;
  const visibleFocusOptions = canSetBuildFocus && showFocusOptions
    ? FOCUS_OPTIONS
    : FOCUS_OPTIONS.filter(option => option.id === focusKey);
  const buildFocusBlockedReason = row.buildFocusBlockedReason
    || (row.isAtWar ? webUIText("InternalPolitics.LockedWhileAtWar") : webUIText("InternalPolitics.NotUnderYourControl"));
  const taxRate = normalisedRate(economy?.taxRate ?? tax?.effectiveRate ?? row.taxRate);
  const showTaxControls = !row.isRebel;
  const canLowerTax = showTaxControls && taxRate !== undefined && taxRate > 0.1001;
  const canRaiseTax = showTaxControls && taxRate !== undefined && taxRate < 0.8999;

  const setFocus = (focus: BuildFocusId) => {
    if (!canSetBuildFocus || focus === focusKey) return;
    setProvinceBuildFocusBridge(row.id, focus).catch(() => undefined);
  };

  const adjustTax = (delta: number, canAdjust: boolean) => {
    if (!canAdjust) return;
    adjustSubjectTaxRateBridge(row.id, delta).catch(() => undefined);
  };

  return (
    <div
      className={`ips-faction-row${isFoederati(row) ? ' ips-faction-row--foederati' : ''}`}
      onMouseEnter={() => setShowFocusOptions(true)}
      onMouseLeave={() => setShowFocusOptions(false)}
      onClick={() => openSidebar('diplomacy', row.id)}
    >
      <div className="ips-faction-cell ips-faction-cell--name">
        <FactionTooltip factionId={row.id} factionName={row.name} delay={150}>
          <FactionRoundel
            factionId={row.id}
            colour={row.colour}
            secondaryColour={row.secondaryColour}
            cultureGroup={row.cultureGroup}
            emblem={row.emblem}
            name={row.name}
            size="md"
            showRing
            diplomaticStatus={row.diplomaticStatus}
            subjectSubtype={row.subjectSubtype}
            isRebel={row.isRebel}
          />
        </FactionTooltip>
        <div className="ips-faction-row-title">
          <EntityLink type="faction" id={row.id} className="ips-faction-row-name ips-entity-link" fallbackClassName="ips-faction-row-name">{row.name}</EntityLink>
          <span className="ips-faction-row-sub">{`${subjectTypeLabel(row)} - ${statusLabel(row)}${row.capital ? ` - ${row.capital}` : ''}`}</span>
        </div>
      </div>

      <div className="ips-faction-cell ips-faction-cell--ruler">
        <PersonPortrait character={character} personId={row.rulerId || undefined} name={row.rulerName || row.name} />
        <div className="ips-faction-ruler-copy">
          <EntityLink type="character" id={row.rulerId} className="ips-ruler-name ips-entity-link" fallbackClassName="ips-ruler-name">{row.rulerName || webUIText("InternalPolitics.NoRuler")}</EntityLink>
          <BlocLine bloc={bloc} />
        </div>
      </div>

      <div className="ips-faction-cell ips-faction-cell--compliance">
        <ComplianceStateLabel value={compliance} />
        <GameBar value={complianceMeterValue(compliance)} max={100} colour={complianceTone} size="sm" />
        <span className="ips-compliance-opinion" style={{ color: opinionTone }}>{webUIText("InternalPolitics.Opinion", { Value1: formatSignedNumber(row.opinion) })}</span>
      </div>

      <div className="ips-faction-cell ips-faction-cell--focus">
        <span className="ips-faction-cell-label"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.469.2" /></span>
        <div className="ips-focus-options">
          {!hasFocus ? (
            <span className="ips-focus-unavailable">-</span>
          ) : visibleFocusOptions.map(option => (
            <Tooltip
              key={option.id}
              inline
              position="bottom"
              content={{
                title: option.label,
                body: option.body,
                get footer() { return canSetBuildFocus ? option.id === focusKey ? webUIText("InternalPolitics.CurrentBuildFocus") : webUIText("InternalPolitics.SetBuildFocusBody") : buildFocusBlockedReason; },
              }}
            >
              <button
                type="button"
                className={`ips-focus-button${option.id === focusKey ? ' ips-focus-button--active' : ''}${canSetBuildFocus ? '' : ' ips-focus-button--disabled'}`}
                aria-label={option.label}
                disabled={!canSetBuildFocus}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setFocus(option.id);
                }}
              >
                <img className="ips-focus-icon" src={option.icon} alt="" />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="ips-faction-cell ips-faction-cell--tax">
        <span className="ips-faction-cell-label"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.504.3" /></span>
        <span>{displayRate(economy?.taxRate ?? tax?.effectiveRate ?? row.taxRate)}</span>
        {showTaxControls && (
          <div className="ips-tax-stepper">
            <Tooltip
              inline
              position="bottom"
              content={{
                title: webUIText('Auto.Prop.ComponentsScreensInternalPoliticsScreen.512.2'),
                get body() { return canLowerTax ? webUIText("InternalPolitics.LowerThisSubject") : webUIText("InternalPolitics.TaxRateAlreadyMax"); },
              }}
            >
              <button
                type="button"
                className={`ips-tax-button${canLowerTax ? '' : ' ips-tax-button--disabled'}`}
                disabled={!canLowerTax}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  adjustTax(-0.05, canLowerTax);
                }}
              >
                -
              </button>
            </Tooltip>
            <Tooltip
              inline
              position="bottom"
              content={{
                title: webUIText('Auto.Prop.ComponentsScreensInternalPoliticsScreen.535.3'),
                get body() { return canRaiseTax ? webUIText("InternalPolitics.RaiseThisSubject") : webUIText("InternalPolitics.TaxRateAlreadyMin"); },
              }}
            >
              <button
                type="button"
                className={`ips-tax-button${canRaiseTax ? '' : ' ips-tax-button--disabled'}`}
                disabled={!canRaiseTax}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  adjustTax(0.05, canRaiseTax);
                }}
              >
                +
              </button>
            </Tooltip>
          </div>
        )}
      </div>
      <div className="ips-faction-cell ips-faction-cell--tribute">
        <span className="ips-faction-cell-label"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.556.4" /></span>
        <GoldValue value={economy?.goldTribute ?? tax?.currentTax ?? row.goldTribute} monthly signed />
      </div>
      <div className="ips-faction-cell ips-faction-cell--scale">
        <span className="ips-faction-cell-label"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.560.5" /></span>
        <span>{webUIText("InternalPolitics.Pop", { Value1: formatCompactNumber(row.population) })}</span>
        <small>{webUIText("InternalPolitics.Settlements", { Value1: formatNumber(row.settlements) })}</small>
      </div>
    </div>
  );
}

function GovernorRow({
  row,
  characters,
  blocs,
  playerFactionId,
  onAppoint,
}: {
  row: RegionalGovernor;
  characters: Map<string, CharacterListEntry>;
  blocs: PowerBloc[];
  playerFactionId: string;
  onAppoint: (row: RegionalGovernor) => void;
}) {
  const { openSidebar } = useGameActions();
  const character = characters.get(row.governorId);
  const corruptionTone = row.corruptionPercent >= 25 ? 'var(--red-light)' : row.corruptionPercent >= 12 ? 'var(--yellow)' : 'var(--green)';
  const bloc = blocForPerson(row.governorId, blocs);
  const governorLoad = row.bureaucraticGovernorLoad;
  const ownerName = row.ownerFactionId && row.ownerFactionId !== playerFactionId ? row.ownerFactionName : '';
  const actionLabel = webUIText(row.governorId ? 'FactionOverview.ReplaceAppointment' : 'Settlement.AppointGovernor');

  return (
    <div
      className="ips-governor-row"
      role={row.governorId ? 'button' : undefined}
      tabIndex={row.governorId ? 0 : undefined}
      onClick={() => row.governorId && openSidebar('character', row.governorId)}
    >
      <div className="ips-governor-cell ips-governor-cell--region">
        <span className="ips-governor-region">{row.regionName}</span>
        {ownerName ? <span className="ips-governor-sub">{ownerName}</span> : null}
        {row.isLocked ? <span className="ips-governor-sub"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.578.6" /></span> : null}
      </div>
      <div className="ips-governor-cell ips-governor-cell--governor">
        <PersonPortrait character={character} personId={row.governorId || undefined} name={row.governorName || row.regionName} />
        <div className="ips-governor-copy">
          <EntityLink type="character" id={row.governorId} className="ips-governor-name ips-entity-link" fallbackClassName="ips-governor-name">{row.governorName || webUIText("InternalPolitics.NoGovernor")}</EntityLink>
          {row.governorId ? <BlocLine bloc={bloc} /> : <span className="ips-governor-bloc"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.584.7" /></span>}
        </div>
      </div>
      <div className="ips-governor-cell ips-governor-cell--settlements">
        <span>{formatNumber(row.settlementCount)}</span>
      </div>
      <div className="ips-governor-cell ips-governor-cell--corruption">
        <span style={{ color: corruptionTone }}>{`${formatNumber(row.corruptionPercent)}%`}</span>
        <BureaucraticInlineValue value={governorLoad} compact />
      </div>
      <div className="ips-governor-cell ips-governor-cell--tax">
        <span style={{ color: row.taxBonusPercent >= 0 ? 'var(--green)' : 'var(--red-light)' }}>{`${formatSignedNumber(row.taxBonusPercent)}%`}</span>
      </div>
      <div className="ips-governor-cell ips-governor-cell--unrest">
        <span style={{ color: row.unrestReductionPercent >= 0 ? 'var(--green)' : 'var(--red-light)' }}>{`${formatSignedNumber(row.unrestReductionPercent)}%`}</span>
      </div>
      <div className="ips-governor-cell ips-governor-cell--military">
        <span style={{ color: row.militaryBonusPercent >= 0 ? 'var(--green)' : 'var(--red-light)' }}>{`${formatSignedNumber(row.militaryBonusPercent)}%`}</span>
      </div>
      <div
        className="ips-governor-cell ips-governor-cell--action"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <GameButton
          variant="burgundy"
          disabled={!row.canManageGovernor || !row.settlementId}
          onClick={() => onAppoint(row)}
        >
          {actionLabel}
        </GameButton>
      </div>
    </div>
  );
}

function ProvinceCandidateCard({ row, leaderCandidates }: { row: ProvinceCandidate; leaderCandidates: CharacterListEntry[] }) {
  const [leaderModalOpen, setLeaderModalOpen] = useState(false);
  const controlTone = row.controlPercent >= 100 ? 'var(--green)' : row.controlPercent >= 75 ? 'var(--yellow)' : 'var(--red-light)';
  const createProvinceThroughputLine = bureaucraticTooltipLine(row.bureaucraticLoadChange);
  const statusText = row.canCreate ? webUIText("InternalPolitics.Ready") : webUIText("InternalPolitics.NotReady");
  const statusIcon = row.canCreate ? READY_ICON : BLOCKED_ICON;
  const canCreateProvince = row.canCreate && leaderCandidates.length > 0;
  const createBlockedReason = !row.canCreate
    ? row.blockedReason || webUIText("InternalPolitics.ThisLandCannot")
    : webUIText('InternalPolitics.NoEligibleProvinceLeaders');
  return (
    <>
      <div className={`ips-province-card${row.canCreate ? ' ips-province-card--ready' : ' ips-province-card--blocked'}`}>
        <div className="ips-province-main">
          <div className="ips-province-emblem">
            <img className="ips-province-emblem-icon" src={LAND_ICON} alt="" />
          </div>
          <div className="ips-province-copy">
            <div className="ips-province-head">
              <span className="ips-province-name">{row.landName}</span>
              <span className={row.canCreate ? 'ips-province-status ips-province-status--ready' : 'ips-province-status ips-province-status--blocked'}>
                <img className="ips-province-status-icon" src={statusIcon} alt="" />
                <span>{statusText}</span>
              </span>
            </div>
            <div className="ips-meter-block ips-province-control">
              <div className="ips-meter-head">
                <span><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.618.8" /></span>
                <span style={{ color: controlTone }}>{`${formatNumber(row.controlPercent)}%`}</span>
              </div>
              <PaintedBar
                percent={clampPercent(row.controlPercent)}
                color={row.controlPercent >= 100 ? 'green' : row.controlPercent >= 75 ? 'gold' : 'red'}
                className="ips-province-control-bar"
              />
            </div>
            {!row.canCreate && row.blockedReason ? (
              <div className="ips-province-reason">{row.blockedReason}</div>
            ) : null}
          </div>
        </div>
        <div className="ips-province-metrics">
          <ProvinceMetric icon={SETTLEMENT_ICON} label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.625.4')}>
            {formatNumber(row.settlementCount)}
          </ProvinceMetric>
          <ProvinceMetric icon={GOLD_ICON} label={webUIText('Auto.Prop.ComponentsScreensInternalPoliticsScreen.637.7')}>
            <GoldValue value={row.cost} />
          </ProvinceMetric>
        </div>
        <div className="ips-province-actions">
          <Tooltip
            inline
            position="left"
            content={{
              title: webUIText('Auto.Prop.ComponentsScreensInternalPoliticsScreen.633.6'),
              get body() { return canCreateProvince ? webUIText('InternalPolitics.ProvinceCreationButtonBody') : createBlockedReason; },
              lines: [
                { label: webUIText('Auto.Prop.ComponentsScreensInternalPoliticsScreen.637.7'), value: formatNumber(row.cost), valueIcon: GOLD_ICON },
                createProvinceThroughputLine,
              ],
            }}
          >
            <button
              type="button"
              className={`ips-create-province-button${canCreateProvince ? '' : ' ips-create-province-button--disabled'}`}
              disabled={!canCreateProvince}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (canCreateProvince) {
                  setLeaderModalOpen(true);
                }
              }}
            >
              <img className="ips-create-province-icon" src={PROVINCE_ICON} alt="" />
              <WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.651.9" />
            </button>
          </Tooltip>
          <BureaucraticInlineValue value={row.bureaucraticLoadChange} compact />
        </div>
      </div>
      <ProvinceCreationLeaderModal
        open={leaderModalOpen}
        landId={row.landId}
        landName={row.landName}
        settlementCount={row.settlementCount}
        candidates={leaderCandidates}
        onClose={() => setLeaderModalOpen(false)}
      />
    </>
  );
}

function CommandHeadRow({ summary, characters, blocs }: { summary: CommandHeadSummary; characters: Map<string, CharacterListEntry>; blocs: PowerBloc[] }) {
  const { openSidebar } = useGameActions();
  const { force, subordinateCount, totalStrength, totalMaxStrength } = summary;
  const character = force.commanderId ? characters.get(force.commanderId) : undefined;
  const compliance = character?.hasCompliance ? character.complianceTowardPlayer : character?.stats.loyalty;
  const complianceTone = complianceColour(compliance);
  const relationshipIcon = compliance === undefined ? undefined : character?.hasCompliance ? getComplianceState(compliance).icon : STAT_ICONS.loyalty;
  const totalStrengthPercent = totalMaxStrength > 0 ? Math.round(totalStrength / totalMaxStrength * 100) : 0;
  const strengthTone = totalStrengthPercent >= 80 ? 'var(--green)' : totalStrengthPercent >= 55 ? 'var(--yellow)' : 'var(--red-light)';
  const relationshipLabel = character?.hasCompliance ? webUIText("InternalPolitics.Compliance") : webUIText("Common.Loyalty");
  const bloc = blocForPerson(force.commanderId, blocs);
  const subordinateLabel = webUIText(
    subordinateCount === 1 ? 'InternalPolitics.CommandSubordinateCountOne' : 'InternalPolitics.CommandSubordinateCountMany',
    { Count: formatNumber(subordinateCount) },
  );

  return (
    <div
      className="ips-command-row"
      role={force.commanderId ? 'button' : undefined}
      tabIndex={force.commanderId ? 0 : undefined}
      onClick={() => force.commanderId && openSidebar('character', force.commanderId)}
    >
      <div className="ips-command-cell ips-command-cell--commander">
        <PersonPortrait character={character} personId={force.commanderId} name={force.commanderName || force.name} />
        <div className="ips-command-copy">
          <EntityLink type="character" id={force.commanderId} className="ips-command-name ips-entity-link" fallbackClassName="ips-command-name">{force.commanderName || webUIText('Common.NoCommander')}</EntityLink>
          <BlocLine bloc={bloc} />
        </div>
      </div>
      <div className="ips-command-cell ips-command-cell--force">
        <EntityLink type="military" id={force.id} className="ips-command-force ips-entity-link" fallbackClassName="ips-command-force">{force.name}</EntityLink>
        <span className="ips-command-detail">{subordinateLabel}</span>
      </div>
      <div className="ips-command-cell ips-command-cell--type">
        <span>{force.isNavy ? webUIText("Common.Fleet") : webUIText("Common.Army")}</span>
      </div>
      <div className="ips-command-cell ips-command-cell--strength">
        <span className="ips-command-strength">{formatNumber(totalStrength)}</span>
        <GameBar value={clampPercent(totalStrengthPercent)} max={100} colour={strengthTone} size="sm" />
      </div>
      <div className="ips-command-cell ips-command-cell--relation">
        <span className="ips-command-relation-label">{relationshipLabel}</span>
        <span className="ips-command-relation-value" style={{ color: complianceTone }}>
          {relationshipIcon ? <img className="ips-command-relation-icon" src={relationshipIcon} alt="" /> : null}
          <span className="ips-command-compliance">{compliance === undefined ? '-' : formatNumber(compliance)}</span>
        </span>
      </div>
    </div>
  );
}

function FoederatiRow({
  entry,
  faction,
  characters,
  blocs,
}: {
  entry: MilitaryFoederatiEntry;
  faction?: InternalFaction;
  characters: Map<string, CharacterListEntry>;
  blocs: PowerBloc[];
}) {
  const { openSidebar } = useGameActions();
  const activeText = entry.isCalledUp ? formatNumber(entry.activeStrength) : '-';
  const canToggle = entry.isCalledUp || entry.canCall;
  const actionLabel = entry.isCalledUp ? webUIText("InternalPolitics.StandDown") : entry.canCall ? webUIText("InternalPolitics.CallUp") : webUIText("InternalPolitics.WillRefuse");
  const rulerId = entry.rulerId || faction?.rulerId || undefined;
  const bloc = blocForPerson(rulerId, blocs);
  const character = rulerId ? characters.get(rulerId) : undefined;

  return (
    <div className="ips-foederati-row" onClick={() => openSidebar('diplomacy', entry.factionId)}>
      <div className="ips-foederati-cell ips-foederati-cell--name">
        <FactionRoundel
          factionId={entry.factionId}
          colour={entry.factionColour}
          secondaryColour={entry.factionSecondaryColour}
          cultureGroup={entry.factionCultureGroup}
          emblem={entry.factionEmblem}
          name={entry.factionName}
          size="sm"
          showRing
          diplomaticStatus={entry.factionDiplomaticStatus}
          subjectSubtype={entry.factionSubjectSubtype}
          isPlayer={entry.factionIsPlayer}
          isRebel={entry.factionIsRebel}
        />
        <div className="ips-foederati-copy">
          <EntityLink type="faction" id={entry.factionId} className="ips-foederati-name ips-entity-link" fallbackClassName="ips-foederati-name">{entry.factionName}</EntityLink>
        </div>
      </div>
      <div className="ips-foederati-cell ips-foederati-cell--ruler">
        <PersonPortrait
          character={character}
          personId={rulerId}
          name={entry.rulerName || entry.factionName}
          portrait={entry.rulerPortrait}
          portraitLayers={entry.rulerPortraitLayers}
        />
        <div className="ips-foederati-ruler-copy">
          <EntityLink type="character" id={rulerId} className="ips-ruler-name ips-entity-link" fallbackClassName="ips-ruler-name">{entry.rulerName}</EntityLink>
          <BlocLine bloc={bloc} />
        </div>
      </div>
      <div className="ips-foederati-cell ips-foederati-cell--compliance">
        <ComplianceStateLabel value={entry.compliance} />
      </div>
      <div className="ips-foederati-cell ips-foederati-cell--ready">
        <span>{formatNumber(entry.availableStrength)}</span>
      </div>
      <div className="ips-foederati-cell ips-foederati-cell--active">
        <span>{activeText}</span>
      </div>
      <div className="ips-foederati-cell ips-foederati-cell--strength">
        <span>{formatNumber(entry.strength)}</span>
      </div>
      <div className="ips-foederati-cell ips-foederati-cell--action">
        <Tooltip
          inline
          position="left"
          content={{
            title: actionLabel,
            get body() { return entry.isCalledUp ? webUIText("InternalPolitics.StandDownThis") : entry.canCall ? webUIText("InternalPolitics.CallUpThis") : webUIText("InternalPolitics.ThisFoederatiForce"); },
          }}
        >
          <button
            type="button"
            className={`ips-foederati-action${canToggle ? '' : ' ips-foederati-action--disabled'}`}
            disabled={!canToggle}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (canToggle) {
                toggleFoederatiCallupBridge(entry.factionId, !entry.isCalledUp).catch(() => undefined);
              }
            }}
          >
            {actionLabel}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

export default function InternalPoliticsScreen({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<InternalPoliticsTab>('provinces');
  const [provinceSort, setProvinceSort] = useState<SortState<ProvinceSortKey>>({ key: 'province', direction: 'asc' });
  const [foederatiSort, setFoederatiSort] = useState<SortState<FoederatiSortKey>>({ key: 'strength', direction: 'desc' });
  const [commandSort, setCommandSort] = useState<SortState<CommandSortKey>>({ key: 'strength', direction: 'desc' });
  const [governorSort, setGovernorSort] = useState<SortState<GovernorSortKey>>({ key: 'corruption', direction: 'desc' });
  const [editingGovernor, setEditingGovernor] = useState<RegionalGovernor | null>(null);
  const playerFactionId = usePlayerFactionId();
  const diplomacy = useDiplomacyOverviewBridge('internal');
  const internalFactions = diplomacy?.internalFactions ?? EMPTY_INTERNAL_FACTIONS;
  const governors = diplomacy?.regionalGovernors ?? EMPTY_GOVERNORS;
  const provinceCandidates = diplomacy?.provinceCandidates ?? EMPTY_PROVINCE_CANDIDATES;
  const autoAssignGovernorsEnabled = diplomacy?.autoAssignGovernorsEnabled ?? false;
  const canCreateProvinces = diplomacy?.canCreateProvinces ?? true;
  const canUseFoederati = internalFactions.some(isFoederati);
  const visibleTabs = useMemo(
    () => TABS.filter(tab => (
      (tab.id !== 'candidates' || canCreateProvinces)
      && (tab.id !== 'foederati' || canUseFoederati)
    )),
    [canCreateProvinces, canUseFoederati],
  );
  const resolvedActiveTab = (!canCreateProvinces && activeTab === 'candidates')
    || (!canUseFoederati && activeTab === 'foederati')
    ? 'provinces'
    : activeTab;
  const needsMilitary = canUseFoederati || resolvedActiveTab === 'commands';
  const needsCharacters = resolvedActiveTab === 'governors' || resolvedActiveTab === 'candidates' || resolvedActiveTab === 'commands';
  const needsBlocs = resolvedActiveTab === 'governors' || resolvedActiveTab === 'foederati' || resolvedActiveTab === 'commands';
  const economy = useEconomyOverviewBridge('provinces', false);
  const characters = useCharacterListBridge(playerFactionId, needsCharacters)?.characters ?? EMPTY_CHARACTERS;
  const military = useMilitaryOverview(needsMilitary);
  const blocs = usePowerBlocsBridge(needsBlocs) ?? EMPTY_BLOCS;
  const foederati = military?.foederati ?? EMPTY_FOEDERATI;
  const charactersById = useMemo(() => characterMap(characters), [characters]);
  const sortedProvinceLeaderCandidates = useMemo(() => provinceLeaderCandidates(characters), [characters]);
  const commanderRows = useMemo(() => commandHeads(military?.forces), [military?.forces]);
  const provinceFactions = useMemo(() => internalFactions.filter(isProvince), [internalFactions]);
  const internalFactionsById = useMemo(() => internalFactionMap(internalFactions), [internalFactions]);
  const economyByFactionId = useMemo(() => economyMap(economy?.vassals), [economy?.vassals]);
  const taxByFactionId = useMemo(() => taxMap(economy?.taxRows), [economy?.taxRows]);
  const sortedProvinces = useMemo(
    () => sortProvinceRows(provinceFactions, economyByFactionId, taxByFactionId, provinceSort),
    [provinceFactions, economyByFactionId, taxByFactionId, provinceSort],
  );
  const sortedFoederati = useMemo(
    () => sortFoederatiRows(foederati, internalFactionsById, foederatiSort),
    [foederati, internalFactionsById, foederatiSort],
  );
  const sortedCommanders = useMemo(
    () => sortCommandRows(commanderRows, charactersById, commandSort),
    [commanderRows, charactersById, commandSort],
  );
  const sortedGovernors = useMemo(
    () => sortGovernorRows(governors, governorSort),
    [governors, governorSort],
  );
  const refreshGovernors = useCallback(() => {
    void refreshDiplomacyOverviewBridge('governors').catch(error => acknowledgeBridgeFailure(error, 'game.get_diplomacy_overview'));
  }, []);

  const content = (() => {
    if (resolvedActiveTab === 'governors') {
      return (
        <section className="ips-tab-section">
          <div className="ips-tab-toolbar">
            <GameCheckButton
              checked={autoAssignGovernorsEnabled}
              label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.824.8')}
              onToggle={() => { void setAutoAssignGovernorsBridge(!autoAssignGovernorsEnabled).catch(() => undefined); }}
              tooltip={{ title: webUIText('Auto.Prop.ComponentsScreensInternalPoliticsScreen.826.9'), body: webUIText('Auto.Prop.ComponentsScreensInternalPoliticsScreen.826.10') }}
            />
          </div>
          <div className="ips-table ips-governor-table" role="table">
            <div className="ips-governor-header" role="row">
              <SortableHeader id="region" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.831.11')} className="ips-governor-header-cell ips-governor-header-cell--region" sort={governorSort} onSort={(key) => setGovernorSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="governor" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.832.12')} className="ips-governor-header-cell ips-governor-header-cell--governor" sort={governorSort} onSort={(key) => setGovernorSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="settlements" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.833.13')} className="ips-governor-header-cell ips-governor-header-cell--settlements" sort={governorSort} onSort={(key) => setGovernorSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="corruption" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.834.14')} className="ips-governor-header-cell ips-governor-header-cell--corruption" sort={governorSort} onSort={(key) => setGovernorSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="tax" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.835.15')} className="ips-governor-header-cell ips-governor-header-cell--tax" sort={governorSort} onSort={(key) => setGovernorSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="unrest" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.836.16')} className="ips-governor-header-cell ips-governor-header-cell--unrest" sort={governorSort} onSort={(key) => setGovernorSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="military" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.837.17')} className="ips-governor-header-cell ips-governor-header-cell--military" sort={governorSort} onSort={(key) => setGovernorSort(value => toggleInternalSort(value, key))} />
              <span className="ips-governor-header-cell ips-governor-header-cell--action"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.875.10" /></span>
            </div>
            <VirtualList
              items={sortedGovernors}
              getKey={row => row.regionId || row.regionName}
              renderItem={row => (
                <GovernorRow
                  row={row}
                  characters={charactersById}
                  blocs={blocs}
                  playerFactionId={playerFactionId ?? ''}
                  onAppoint={setEditingGovernor}
                />
              )}
              empty={<div className="ips-empty">{diplomacy?.governorEmptyReason || webUIText("InternalPolitics.NoRegionalGovernors")}</div>}
              className="ips-row-scroll-frame"
              viewportClassName="ips-table-body ips-governor-table-body ips-row-viewport"
              itemClassName="ips-row-frame"
              role="rowgroup"
              rowHeightRem={3.45}
              virtualizeThreshold={INTERNAL_LIST_VIRTUALISE_THRESHOLD}
              overscan={INTERNAL_LIST_OVERSCAN}
              resetSignal={`${governorSort.key}:${governorSort.direction}`}
            />
          </div>
        </section>
      );
    }

    if (resolvedActiveTab === 'candidates') {
      return (
        <section className="ips-tab-section">
          <VirtualList
            items={provinceCandidates}
            getKey={row => row.landId || row.landName}
            renderItem={row => <ProvinceCandidateCard row={row} leaderCandidates={sortedProvinceLeaderCandidates} />}
            empty={<div className="ips-empty">{diplomacy?.provinceEmptyReason || webUIText("InternalPolitics.NoProvinceCandidates")}</div>}
            className="ips-row-scroll-frame"
            viewportClassName="ips-tab-list ips-province-list ips-row-viewport"
            itemClassName="ips-row-frame"
            rowHeightRem={6.25}
            virtualizeThreshold={INTERNAL_LIST_VIRTUALISE_THRESHOLD}
            overscan={INTERNAL_LIST_OVERSCAN}
          />
        </section>
      );
    }

    if (resolvedActiveTab === 'foederati') {
      return (
        <section className="ips-tab-section">
          <div className="ips-table ips-foederati-table" role="table">
            <div className="ips-foederati-header" role="row">
              <SortableHeader id="name" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.870.18')} className="ips-foederati-header-cell ips-foederati-header-cell--name" sort={foederatiSort} onSort={(key) => setFoederatiSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="ruler" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.871.19')} className="ips-foederati-header-cell ips-foederati-header-cell--ruler" sort={foederatiSort} onSort={(key) => setFoederatiSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="compliance" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.872.20')} className="ips-foederati-header-cell ips-foederati-header-cell--compliance" sort={foederatiSort} onSort={(key) => setFoederatiSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="ready" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.873.21')} className="ips-foederati-header-cell ips-foederati-header-cell--ready" sort={foederatiSort} onSort={(key) => setFoederatiSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="active" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.874.22')} className="ips-foederati-header-cell ips-foederati-header-cell--active" sort={foederatiSort} onSort={(key) => setFoederatiSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="strength" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.875.23')} className="ips-foederati-header-cell ips-foederati-header-cell--strength" sort={foederatiSort} onSort={(key) => setFoederatiSort(value => toggleInternalSort(value, key))} />
              <span className="ips-foederati-header-cell ips-foederati-header-cell--action"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.875.10" /></span>
            </div>
            <VirtualList
              items={sortedFoederati}
              getKey={entry => entry.id}
              renderItem={entry => <FoederatiRow entry={entry} faction={internalFactionsById.get(entry.factionId)} characters={charactersById} blocs={blocs} />}
              empty={<div className="ips-empty"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.879.11" /></div>}
              className="ips-row-scroll-frame"
              viewportClassName="ips-table-body ips-foederati-table-body ips-row-viewport"
              itemClassName="ips-row-frame"
              role="rowgroup"
              rowHeightRem={3.45}
              virtualizeThreshold={INTERNAL_LIST_VIRTUALISE_THRESHOLD}
              overscan={INTERNAL_LIST_OVERSCAN}
              resetSignal={`${foederatiSort.key}:${foederatiSort.direction}`}
            />
          </div>
        </section>
      );
    }

    if (resolvedActiveTab === 'commands') {
      return (
        <section className="ips-tab-section">
          <div className="ips-table ips-command-table" role="table">
            <div className="ips-command-header" role="row">
              <SortableHeader id="commander" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.895.24')} className="ips-command-header-cell ips-command-header-cell--commander" sort={commandSort} onSort={(key) => setCommandSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="force" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.896.25')} className="ips-command-header-cell ips-command-header-cell--force" sort={commandSort} onSort={(key) => setCommandSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="type" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.897.26')} className="ips-command-header-cell ips-command-header-cell--type" sort={commandSort} onSort={(key) => setCommandSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="strength" label={webUIText('InternalPolitics.TotalCommandStrength')} className="ips-command-header-cell ips-command-header-cell--strength" sort={commandSort} onSort={(key) => setCommandSort(value => toggleInternalSort(value, key))} />
              <SortableHeader id="relation" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.899.28')} className="ips-command-header-cell ips-command-header-cell--relation" sort={commandSort} onSort={(key) => setCommandSort(value => toggleInternalSort(value, key))} />
            </div>
            <VirtualList
              items={sortedCommanders}
              getKey={summary => summary.force.id}
              renderItem={summary => <CommandHeadRow summary={summary} characters={charactersById} blocs={blocs} />}
              empty={<div className="ips-empty"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.902.12" /></div>}
              className="ips-row-scroll-frame"
              viewportClassName="ips-table-body ips-command-table-body ips-row-viewport"
              itemClassName="ips-row-frame"
              role="rowgroup"
              rowHeightRem={3.45}
              virtualizeThreshold={INTERNAL_LIST_VIRTUALISE_THRESHOLD}
              overscan={INTERNAL_LIST_OVERSCAN}
              resetSignal={`${commandSort.key}:${commandSort.direction}`}
            />
          </div>
        </section>
      );
    }

    return (
      <section className="ips-tab-section">
        <div className="ips-faction-list" role="table">
          <div className="ips-faction-header" role="row">
            <SortableHeader id="province" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.917.29')} className="ips-faction-header-cell ips-faction-header-cell--name" sort={provinceSort} onSort={(key) => setProvinceSort(value => toggleInternalSort(value, key))} />
            <SortableHeader id="ruler" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.918.30')} className="ips-faction-header-cell ips-faction-header-cell--ruler" sort={provinceSort} onSort={(key) => setProvinceSort(value => toggleInternalSort(value, key))} />
            <SortableHeader id="compliance" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.919.31')} className="ips-faction-header-cell ips-faction-header-cell--compliance" sort={provinceSort} onSort={(key) => setProvinceSort(value => toggleInternalSort(value, key))} />
            <SortableHeader id="focus" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.920.32')} className="ips-faction-header-cell ips-faction-header-cell--focus" sort={provinceSort} onSort={(key) => setProvinceSort(value => toggleInternalSort(value, key))} />
            <SortableHeader id="tax" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.921.33')} className="ips-faction-header-cell ips-faction-header-cell--tax" sort={provinceSort} onSort={(key) => setProvinceSort(value => toggleInternalSort(value, key))} />
            <SortableHeader id="tribute" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.922.34')} className="ips-faction-header-cell ips-faction-header-cell--tribute" sort={provinceSort} onSort={(key) => setProvinceSort(value => toggleInternalSort(value, key))} />
            <SortableHeader id="scale" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.923.35')} className="ips-faction-header-cell ips-faction-header-cell--scale" sort={provinceSort} onSort={(key) => setProvinceSort(value => toggleInternalSort(value, key))} />
          </div>
          <VirtualList
            items={sortedProvinces}
            getKey={row => row.id}
            renderItem={row => (
              <InternalFactionRow
                row={row}
                characters={charactersById}
                blocs={blocs}
                economy={economyByFactionId.get(row.id)}
                tax={taxByFactionId.get(row.id)}
              />
            )}
            empty={<div className="ips-empty"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.926.13" /></div>}
            className="ips-row-scroll-frame"
            viewportClassName="ips-faction-table-body ips-row-viewport"
            itemClassName="ips-row-frame"
            role="rowgroup"
            rowHeightRem={4.35}
            virtualizeThreshold={INTERNAL_LIST_VIRTUALISE_THRESHOLD}
            overscan={INTERNAL_LIST_OVERSCAN}
            resetSignal={`${provinceSort.key}:${provinceSort.direction}`}
          />
        </div>
      </section>
    );
  })();

  return (
    <ScreenShell
      title={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.946.36')}
      onClose={onClose}
      advisorTopic="internalPoliticsScreen"
      className="screen--internal-politics"
      contentClassName="screen-content--internal-politics"
      tabs={<SidebarTabBar tabs={visibleTabs} activeTab={resolvedActiveTab} onTabChange={(id) => setActiveTab(id as InternalPoliticsTab)} />}
    >
      <div className="ips-wrap">{content}</div>
      {editingGovernor ? (
        <RegionGovernorAppointmentModal
          open={!!editingGovernor}
          settlementId={editingGovernor.settlementId}
          settlementName={editingGovernor.settlementName}
          regionName={editingGovernor.regionName}
          currentGovernorId={editingGovernor.governorId || undefined}
          onClose={() => setEditingGovernor(null)}
          onAppointed={refreshGovernors}
        />
      ) : null}
    </ScreenShell>
  );
}

registerTopbarButton({
  id: 'internal-politics',
  get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.960.18'); },
  icon: '/assets/icons/I_DependentFactions.png',
  tooltip: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.963.19'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.964.20'); },
  },
  order: 50,
  factionMode: 'independent',
});

registerScreen({
  id: 'internalPolitics',
  render: ({ onClose }) => <InternalPoliticsScreen onClose={onClose} />,
  topbarId: 'internal-politics',
  advisorTopic: 'internalPoliticsScreen',
  bridgeNames: ['internalpolitics', 'internal_politics', 'internalaffairs', 'internal_affairs'],
  factionMode: 'independent',
});
