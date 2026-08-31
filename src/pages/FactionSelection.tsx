import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import Tooltip, { type TooltipLine } from '../components/common/tooltips/Tooltip';
import Portrait from '../components/common/portraits/Portrait';
import { TraitIcon } from '../components/common/entities/TraitIcon';
import CultureTooltip from '../components/common/tooltips/CultureTooltip';
import GovernmentTooltip from '../components/common/tooltips/GovernmentTooltip';
import ReligionTooltip from '../components/common/tooltips/ReligionTooltip';
import StyledScrollArea from '../components/common/layout/scrolling/StyledScrollArea';
import VirtualList from '../components/common/layout/scrolling/VirtualList';
import { StatCellGrid, StatCell } from '../components/sidebars/shared/StatCellGrid';
import { emblemMaskStyle, resolveRoundelEmblem } from '../hooks/useMaskableAssetUrl';
import { WebkilnAssetPath } from '../utils/assets';
import { resolveFactionBorderVariant } from '../utils/factionBorder';
import { emblemAssetPath } from '../utils/factionEmblem';
import { formatNumber, formatSignedNumber } from '../utils/numberFormat';
import { characterStatEffectLines } from '../utils/characterStatEffects';
import type { StatKey } from '../data/types';
import { useWebUIText, type WebUITextFormatter } from '../localization/WebUITextContext';
import {
  bridgeCall,
  type FactionSelectionTabletopRequest,
  type GetNewGameMapFactionSelectionResponse,
  type ScenarioMapFactionDto,
  type ScenarioMapLeaderDto,
  type ScenarioMapStatDto,
  type ScenarioMapTraitDto,
  type ScenarioMapTreatyDto,
  type ScenarioMapWarDto,
} from '../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../bridge/core/runtimeEngine';
import { textMatchesSearch } from '../components/common/layout/tables/sortUtils';
import './FactionSelection.css';

import { WebUIText } from '../localization/WebUITextContext';
interface FactionSelectionProps {
  mapId: string;
  initialData?: GetNewGameMapFactionSelectionResponse | null;
  loadFactionSelection?: (mapId: string) => Promise<GetNewGameMapFactionSelectionResponse>;
  scenario?: {
    displayName: string;
  };
  closing?: boolean;
  onClose: () => void;
  showPurchaseForLocked?: boolean;
  onPurchaseFullGame?: () => void;
  onConfirm: (faction: { baseName: string; displayName: string }) => void;
}

interface FactionGroup {
  sovereign: ScenarioMapFactionDto;
  members: ScenarioMapFactionDto[];
}

interface FactionListRow {
  faction: ScenarioMapFactionDto;
  kind: 'sovereign' | 'subject';
  groupKey: string;
  hasMembers: boolean;
}

const STAT_META: Record<string, { labelKey: string; icon: string; descriptionKey: string }> = {
  tactics: {
    labelKey: 'Common.Tactics',
    icon: '/assets/icons/StatIcons/I_Tactics.png',
    descriptionKey: 'MainMenu.StatTacticsDescription',
  },
  authority: {
    labelKey: 'Common.Authority',
    icon: '/assets/icons/StatIcons/I_Authority.png',
    descriptionKey: 'MainMenu.StatAuthorityDescription',
  },
  cunning: {
    labelKey: 'Common.Cunning',
    icon: '/assets/icons/StatIcons/I_Cunning.png',
    descriptionKey: 'MainMenu.StatCunningDescription',
  },
  governance: {
    labelKey: 'Common.Governance',
    icon: '/assets/icons/StatIcons/I_Governance.png',
    descriptionKey: 'MainMenu.StatGovernanceDescription',
  },
  loyalty: {
    labelKey: 'Common.Loyalty',
    icon: '/assets/icons/StatIcons/I_Loyalty.png',
    descriptionKey: 'MainMenu.StatLoyaltyDescription',
  },
  constitution: {
    labelKey: 'Common.Constitution',
    icon: '/assets/icons/StatIcons/I_Constitution.png',
    descriptionKey: 'MainMenu.StatConstitutionDescription',
  },
};

const TREATY_ICONS: Record<string, string> = {
  Subject: '/assets/icons/Treaties/I_Vassalage.png',
  Trade: '/assets/icons/Treaties/I_TradeAgreement.png',
  TradeAgreement: '/assets/icons/Treaties/I_TradeAgreement.png',
  MilitaryAlliance: '/assets/icons/Treaties/I_MilitaryAlliance.png',
  DefensiveAlliance: '/assets/icons/Treaties/I_DefensiveAlliance.png',
  MilitaryAccess: '/assets/icons/Treaties/I_MilitaryAccess.png',
  NonAggression: '/assets/icons/Treaties/I_NonAggression.png',
  DiplomaticMarriage: '/assets/icons/Treaties/I_DiplomaticMarriage.png',
  Marriage: '/assets/icons/Treaties/I_DiplomaticMarriage.png',
  MapSharing: '/assets/icons/Treaties/I_MapSharing.png',
  KnowledgeSharing: '/assets/icons/Treaties/I_MapSharing.png',
  PrisonerExchange: '/assets/icons/Treaties/I_PrisonerExchange.png',
  PassageRights: '/assets/icons/Treaties/I_MilitaryAccess.png',
  MerchantRights: '/assets/icons/Treaties/I_TradeAgreement.png',
  TradeOneOff: '/assets/icons/Treaties/I_TradeAgreement.png',
  Tribute: '/assets/icons/Treaties/I_Tribute.png',
  TributeOneOff: '/assets/icons/Treaties/I_Tribute.png',
};

const FACTION_STAT_ICONS: Record<string, string> = {
  militaryStrength: '/assets/icons/I_ArmiesQuickButton.png',
  gold: '/assets/icons/I_Coins.png',
  population: '/assets/icons/I_Population.png',
  settlements: '/assets/icons/I_Capital.png',
};

const SUBJECT_TREATY_TYPES = new Set(['Subject', 'Vassalage']);
const MILITARY_TREATY_TYPES = new Set(['MilitaryAlliance', 'DefensiveAlliance']);

function normaliseRgb(values: number[]): [number, number, number] {
  return [
    Math.round(values[0] ?? 0),
    Math.round(values[1] ?? 0),
    Math.round(values[2] ?? 0),
  ];
}

function rgb(values: number[], alpha = 1): string {
  const [red, green, blue] = normaliseRgb(values);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function darken(values: number[], factor: number): [number, number, number] {
  const [red, green, blue] = normaliseRgb(values);
  return [
    Math.max(0, Math.round(red * (1 - factor))),
    Math.max(0, Math.round(green * (1 - factor))),
    Math.max(0, Math.round(blue * (1 - factor))),
  ];
}

function lighten(values: number[], factor: number): [number, number, number] {
  const [red, green, blue] = normaliseRgb(values);
  return [
    Math.min(255, Math.round(red + (255 - red) * factor)),
    Math.min(255, Math.round(green + (255 - green) * factor)),
    Math.min(255, Math.round(blue + (255 - blue) * factor)),
  ];
}

function luminance(values: number[]): number {
  const [red, green, blue] = normaliseRgb(values);
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function resolveRoundelSymbolColour(faction: ScenarioMapFactionDto): [number, number, number] {
  const primaryLuminance = luminance(faction.primaryColour);
  if (faction.secondaryColour.length < 3) {
    return primaryLuminance < 0.5 ? [241, 230, 197] : [26, 20, 16];
  }

  const secondaryLuminance = luminance(faction.secondaryColour);
  if (Math.abs(primaryLuminance - secondaryLuminance) >= 0.28) {
    return normaliseRgb(faction.secondaryColour);
  }

  return primaryLuminance < 0.5
    ? lighten(faction.secondaryColour, 0.55)
    : darken(faction.secondaryColour, 0.55);
}

function getStatColor(value: number): string {
  if (value >= 16) return 'var(--green-light)';
  if (value >= 12) return 'var(--green)';
  if (value >= 8) return 'var(--gold-light)';
  if (value >= 5) return 'var(--orange)';
  return 'var(--red)';
}

function getLeader(faction: ScenarioMapFactionDto | null): ScenarioMapLeaderDto | null {
  if (!faction || !faction.leader.hasLeader) {
    return null;
  }
  return faction.leader;
}

function getDefaultSelectedFactionBaseName(response: GetNewGameMapFactionSelectionResponse): string {
  const defaultPlayable = response.factions.find(
    (faction) =>
      faction.baseName === response.defaultPlayerFactionBaseName && faction.playable,
  );
  const firstPlayable = response.factions.find((faction) => faction.playable);
  const firstFaction = response.factions[0] ?? null;
  return defaultPlayable?.baseName ?? firstPlayable?.baseName ?? firstFaction?.baseName ?? '';
}

function factionSort(left: ScenarioMapFactionDto, right: ScenarioMapFactionDto): number {
  if (left.playable !== right.playable) {
    return left.playable ? -1 : 1;
  }
  return left.displayName.localeCompare(right.displayName);
}

function factionMatchesSearch(faction: ScenarioMapFactionDto, query: string): boolean {
  if (!query) {
    return true;
  }

  return (
    textMatchesSearch(faction.displayName, query) ||
    textMatchesSearch(faction.realm, query) ||
    textMatchesSearch(faction.cultureDisplayName, query) ||
    textMatchesSearch(faction.cultureInfo.groupDisplayName, query) ||
    textMatchesSearch(faction.religionDisplayName, query) ||
    textMatchesSearch(faction.capitalSettlementName, query)
  );
}

function belongsToPlayableRealm(
  faction: ScenarioMapFactionDto,
  factionsByBase: Map<string, ScenarioMapFactionDto>,
): boolean {
  if (faction.playable) {
    return true;
  }

  const visited = new Set<string>();
  let overlordBaseName = faction.overlordBaseName;
  while (overlordBaseName && !visited.has(overlordBaseName)) {
    visited.add(overlordBaseName);
    const overlord = factionsByBase.get(overlordBaseName);
    if (!overlord) {
      break;
    }
    if (overlord.playable) {
      return true;
    }
    overlordBaseName = overlord.overlordBaseName;
  }

  return false;
}

function buildFactionGroups(
  factions: ScenarioMapFactionDto[],
  visibleBaseNames: Set<string>,
): FactionGroup[] {
  const subjectsByOverlord = new Map<string, ScenarioMapFactionDto[]>();

  for (const faction of factions) {
    if (!faction.overlordBaseName) {
      continue;
    }

    const list = subjectsByOverlord.get(faction.overlordBaseName) ?? [];
    list.push(faction);
    subjectsByOverlord.set(faction.overlordBaseName, list);
  }

  return factions
    .filter((faction) => !faction.overlordBaseName)
    .filter((faction) => {
      if (visibleBaseNames.has(faction.baseName)) {
        return true;
      }

      return (subjectsByOverlord.get(faction.baseName) ?? []).some((subject) =>
        visibleBaseNames.has(subject.baseName),
      );
    })
    .sort(factionSort)
    .map((sovereign) => ({
      sovereign,
      members: (subjectsByOverlord.get(sovereign.baseName) ?? [])
        .filter((subject) => visibleBaseNames.has(subject.baseName))
        .sort(factionSort),
    }));
}

function flattenFactionGroups(groups: FactionGroup[]): FactionListRow[] {
  const rows: FactionListRow[] = [];

  for (const group of groups) {
    const members = group.members;
    const hasMembers = members.length > 0;
    rows.push({
      faction: group.sovereign,
      kind: 'sovereign',
      groupKey: group.sovereign.baseName,
      hasMembers,
    });

    members.forEach((member) => {
      rows.push({
        faction: member,
        kind: 'subject',
        groupKey: group.sovereign.baseName,
        hasMembers,
      });
    });
  }

  return rows;
}

function getWarsForFaction(
  wars: ScenarioMapWarDto[],
  factionBaseName: string,
): ScenarioMapWarDto[] {
  return wars.filter((war) =>
    war.attacker.memberFactionBaseNames.includes(factionBaseName) ||
    war.defender.memberFactionBaseNames.includes(factionBaseName),
  );
}

function roundelStyle(faction: ScenarioMapFactionDto): React.CSSProperties {
  const symbolColour = resolveRoundelSymbolColour(faction);
  return {
    ['--fs-roundel-primary' as string]: rgb(faction.primaryColour),
    ['--fs-roundel-primary-light' as string]: rgb(lighten(faction.primaryColour, 0.2)),
    ['--fs-roundel-primary-dark' as string]: rgb(darken(faction.primaryColour, 0.35)),
    ['--fs-roundel-secondary' as string]: rgb(symbolColour),
    ['--fs-roundel-secondary-light' as string]: rgb(lighten(symbolColour, 0.16)),
    ['--fs-roundel-secondary-dark' as string]: rgb(darken(symbolColour, 0.24)),
  };
}

function roundelClassName(faction: ScenarioMapFactionDto, size: 'xs' | 'sm' | 'lg'): string {
  const variant = resolveFactionBorderVariant({
    subjectSubtype: faction.subjectSubtype,
    overlordBaseName: faction.overlordBaseName,
    isRebel: faction.isRebel,
    playable: faction.playable,
  });
  return `fs-roundel fs-roundel--${size} fs-roundel--border-${variant}`;
}

function translatedTextOrFallback(t: WebUITextFormatter, key: string, fallback: string): string {
  if (!fallback) return fallback;
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function translatedName(t: WebUITextFormatter, source: string): string {
  if (!source) return source;
  return translatedTextOrFallback(t, `NameLocalisation.${source}`, source);
}

function translateFactionSelectionData(
  data: GetNewGameMapFactionSelectionResponse,
  t: WebUITextFormatter,
): GetNewGameMapFactionSelectionResponse {
  return {
    ...data,
    defaultPlayerFactionBaseName: data.defaultPlayerFactionBaseName,
    factions: data.factions.map((faction) => ({
      ...faction,
      displayName: translatedName(t, faction.displayName),
      realm: translatedName(t, faction.realm),
      cultureDisplayName: translatedName(t, faction.cultureDisplayName),
      // cultureGroup is a stable culture-group id from Culture::Group; keep it raw.
      cultureGroup: faction.cultureGroup,
      cultureInfo: {
        ...faction.cultureInfo,
        name: translatedName(t, faction.cultureInfo.name),
        description: translatedName(t, faction.cultureInfo.description),
        groupDisplayName: translatedName(t, faction.cultureInfo.groupDisplayName),
      },
      religionDisplayName: translatedName(t, faction.religionDisplayName),
      religionInfo: {
        ...faction.religionInfo,
        name: translatedName(t, faction.religionInfo.name),
        description: translatedName(t, faction.religionInfo.description),
      },
      capitalSettlementName: translatedName(t, faction.capitalSettlementName),
      governmentDisplayName: translatedName(t, faction.governmentDisplayName),
      governmentDescription: translatedName(t, faction.governmentDescription),
      treaties: faction.treaties.map((treaty) => ({
        ...treaty,
        withFactionDisplayName: translatedName(t, treaty.withFactionDisplayName),
        displayName: translatedName(t, treaty.displayName),
        description: translatedName(t, treaty.description),
      })),
      leader: {
        ...faction.leader,
        displayName: translatedName(t, faction.leader.displayName),
        dynasty: translatedName(t, faction.leader.dynasty),
      },
    })),
    wars: data.wars.map((war) => ({
      ...war,
      name: translatedName(t, war.name),
      attacker: {
        ...war.attacker,
        leaderFactionDisplayName: translatedName(t, war.attacker.leaderFactionDisplayName),
      },
      defender: {
        ...war.defender,
        leaderFactionDisplayName: translatedName(t, war.defender.leaderFactionDisplayName),
      },
    })),
  };
}

function FactionSelectionRoundelSymbol({ faction }: { faction: ScenarioMapFactionDto }) {
  const emblem = resolveRoundelEmblem(faction.emblemAssetPath || emblemAssetPath(faction.emblemRowName));
  if (!emblem) {
    return null;
  }
  if (emblem.useImage) {
    return (
      <img
        className="fs-roundel-symbol-img"
        src={emblem.src}
        alt=""
        draggable={false}
      />
    );
  }

  return (
    <span
      className="fs-roundel-symbol"
      style={emblemMaskStyle(emblem.src)}
    />
  );
}

function warStrengthShare(sideStrength: number, totalStrength: number): string {
  return `${(sideStrength / totalStrength) * 100}%`;
}

function modifierColor(value: number): string {
  if (value > 0) return 'var(--green)';
  if (value < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function isSubjectTreaty(type: string): boolean {
  return SUBJECT_TREATY_TYPES.has(type);
}

function treatyBlockLabel(type: string, t: WebUITextFormatter): string {
  if (MILITARY_TREATY_TYPES.has(type)) {
    return t('MainMenu.MilitaryAlliances');
  }
  if (type === 'MilitaryAccess' || type === 'PassageRights') {
    return t('MainMenu.MilitaryPacts');
  }
  return t('MainMenu.Pacts');
}

function statBreakdownLines(stat: ScenarioMapStatDto): TooltipLine[] {
  return (stat.breakdown ?? []).map((entry, index) => ({
    label: entry.label,
    value: index === 0
      ? formatNumber(entry.value, { maximumFractionDigits: 1 })
      : formatSignedNumber(entry.value, { maximumFractionDigits: 1 }),
    valueColor: index === 0 ? undefined : modifierColor(entry.value),
  }));
}

function leaderStatBreakdownLines(stat: ScenarioMapStatDto, t: WebUITextFormatter): TooltipLine[] {
  return [
    ...statBreakdownLines(stat),
    { label: t('CharacterStats.CurrentEffects'), isHeader: true },
    ...characterStatEffectLines(stat.id as StatKey, stat.value),
  ];
}

function renderTraitIcon(trait: ScenarioMapTraitDto): React.ReactNode {
  return (
    <Tooltip
      key={trait.id}
      content={{
        title: trait.name,
        body: trait.description,
        lines: (trait.effects ?? []).map((effect) => ({
          label: effect.label,
          labelIcon: STAT_META[effect.stat]?.icon,
          value: effect.value,
          valueColor: effect.isPositive ? 'var(--green)' : 'var(--red)',
        })),
      }}
      position="bottom"
      delay={150}
    >
      <TraitIcon trait={trait} className="fs-trait-icon" />
    </Tooltip>
  );
}

function renderLeaderStats(stats: ScenarioMapStatDto[], t: WebUITextFormatter): React.ReactNode {
  const visibleStats = stats.filter((stat) => STAT_META[stat.id]);
  if (visibleStats.length === 0) {
    return null;
  }

  return (
    <StatCellGrid className="fs-leader-stat-grid">
      {visibleStats.map((stat) => {
        const meta = STAT_META[stat.id];
        return (
          <Tooltip
            key={stat.id}
            content={{
              title: stat.label || t(meta.labelKey),
              body: stat.description || t(meta.descriptionKey),
              lines: leaderStatBreakdownLines(stat, t),
            }}
            position="bottom"
            delay={150}
          >
            <StatCell icon={meta.icon} value={stat.value} valueColor={getStatColor(stat.value)} />
          </Tooltip>
        );
      })}
    </StatCellGrid>
  );
}

function renderFactionStats(stats: ScenarioMapStatDto[]): React.ReactNode {
  if (stats.length === 0) {
    return null;
  }

  return (
    <div className="fs-realm-stats">
      {stats.map((stat) => {
        const icon = FACTION_STAT_ICONS[stat.id];
        if (!icon) {
          return null;
        }

        return (
          <Tooltip
            key={stat.id}
            content={{
              title: stat.label,
              body: stat.description,
              lines: statBreakdownLines(stat),
            }}
            position="bottom"
            delay={150}
          >
            <div className="fs-realm-stat">
              <img src={icon} alt="" className="fs-realm-stat-icon" />
              <span className="fs-realm-stat-value">{formatNumber(stat.value)}</span>
              <span className="fs-realm-stat-label">{stat.label}</span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

function FactionSelectionHeader({
  title,
  subtitle,
  onClose,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  backLabel: string;
}) {
  return (
    <header className="fs-header">
      <button type="button" className="fs-back-btn" data-gamepad-back onClick={onClose}>
        <span className="fs-back-icon" aria-hidden="true" />
        <span>{backLabel}</span>
      </button>

      <div className="fs-title-block">
        {subtitle ? <div className="fs-subtitle">{subtitle}</div> : null}
        <h1 className="fs-title">{title}</h1>
        <div className="fs-title-ornament" aria-hidden="true">
          <span className="fs-title-ornament-line" />
          <span className="fs-title-ornament-diamond" />
          <span className="fs-title-ornament-line" />
        </div>
      </div>

      <div className="fs-header-balance" aria-hidden="true" />
    </header>
  );
}

function StateView({
  title,
  subtitle,
  message,
  closing = false,
  onClose,
}: {
  title: string;
  subtitle: string;
  message: string;
  closing?: boolean;
  onClose: () => void;
}) {
  const t = useWebUIText();
  return (
    <div
      className={`fs-root${closing ? ' fs-root--closing' : ''}`}
      data-focus-root="faction-selection"
      data-focus-priority="400"
    >
      <div className="fs-atmosphere" aria-hidden="true" />
      <FactionSelectionHeader
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        backLabel={t('MainMenu.BackToMainMenu')}
      />
      <div className="fs-state-shell">
        <div className="fs-state-card">{message}</div>
      </div>
    </div>
  );
}

export interface FactionMapHoverHandle {
  setHovered: (baseName: string) => void;
  clearHovered: () => void;
}

function requestFactionSelectionTabletop(
  request: Partial<FactionSelectionTabletopRequest> & Pick<FactionSelectionTabletopRequest, 'command'>,
) {
  return bridgeCall('game.faction_selection_tabletop', {
    command: request.command,
    mapId: request.mapId ?? '',
    baseName: request.baseName ?? '',
    screenX: request.screenX ?? 0,
    screenY: request.screenY ?? 0,
    deltaX: request.deltaX ?? 0,
    deltaY: request.deltaY ?? 0,
    zoomDelta: request.zoomDelta ?? 0,
  });
}

function zoomTabletopToCapital(baseName: string) {
  return requestFactionSelectionTabletop({
    command: 'focus',
    baseName,
  }).then(() => requestFactionSelectionTabletop({
    command: 'zoom',
    zoomDelta: 7,
  }));
}

function useFactionSelectionTabletop(
  mapId: string,
  selectedBaseName: string,
  enabled: boolean,
): void {
  const showRequestRef = useRef<ReturnType<typeof requestFactionSelectionTabletop> | null>(null);
  const selectedBaseNameRef = useRef(selectedBaseName);

  useEffect(() => {
    selectedBaseNameRef.current = selectedBaseName;
  }, [selectedBaseName]);

  useEffect(() => {
    return () => {
      void requestFactionSelectionTabletop({ command: 'hide' }).catch(acknowledgeBridgeFailure);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      showRequestRef.current = null;
      return undefined;
    }

    const showRequest = requestFactionSelectionTabletop({
      command: 'show',
      mapId,
      baseName: selectedBaseNameRef.current,
    });
    showRequestRef.current = showRequest;
    void showRequest
      .catch(acknowledgeBridgeFailure);

    return () => {
      showRequestRef.current = null;
    };
  }, [enabled, mapId]);

  useEffect(() => {
    if (!enabled || !selectedBaseName) {
      return;
    }

    let cancelled = false;
    const showRequest = showRequestRef.current;
    if (showRequest) {
      void showRequest
        .then(() => {
          if (!cancelled) {
            return requestFactionSelectionTabletop({
              command: 'focus',
              baseName: selectedBaseName,
            });
          }
          return undefined;
        })
        .catch(acknowledgeBridgeFailure);
    }

    return () => {
      cancelled = true;
    };
  }, [enabled, selectedBaseName]);
}

interface FactionSelectionTabletopMapProps {
  selectedBaseName: string;
  hoveredFaction: ScenarioMapFactionDto | null;
  scenarioDescriptionParts: string[];
  onSelectBaseName: (baseName: string) => void;
}

function FactionSelectionTabletopMap({
  selectedBaseName,
  hoveredFaction,
  scenarioDescriptionParts,
  onSelectBaseName,
}: FactionSelectionTabletopMapProps) {
  const t = useWebUIText();
  const dragRef = useRef({
    pointerId: -1,
    button: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const pendingPanRef = useRef({ x: 0, y: 0 });
  const panFrameRef = useRef<number | null>(null);

  const flushPan = useCallback(() => {
    panFrameRef.current = null;
    const delta = pendingPanRef.current;
    pendingPanRef.current = { x: 0, y: 0 };
    if (delta.x !== 0 || delta.y !== 0) {
      void requestFactionSelectionTabletop({
        command: 'pan',
        deltaX: delta.x,
        deltaY: delta.y,
      }).catch(acknowledgeBridgeFailure);
    }
  }, []);

  useEffect(() => () => {
    if (panFrameRef.current !== null) {
      cancelAnimationFrame(panFrameRef.current);
    }
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      button: event.button,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.lastX;
    const deltaY = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
    pendingPanRef.current.x += deltaX / window.innerWidth;
    pendingPanRef.current.y -= deltaY / window.innerHeight;
    if (panFrameRef.current === null) {
      panFrameRef.current = requestAnimationFrame(flushPan);
    }
  }, [flushPan]);

  const finishPointer = useCallback((event: React.PointerEvent<HTMLDivElement>, allowPick: boolean) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current.pointerId = -1;

    if (allowPick && drag.button === 0 && !drag.moved) {
      void requestFactionSelectionTabletop({
        command: 'pick',
        screenX: event.clientX / window.innerWidth,
        screenY: event.clientY / window.innerHeight,
      })
        .then((response) => {
          if (response.baseName) {
            onSelectBaseName(response.baseName);
          }
        })
        .catch(acknowledgeBridgeFailure);
    }
  }, [onSelectBaseName]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    void requestFactionSelectionTabletop({
      command: 'zoom',
      zoomDelta: -event.deltaY / 120,
    }).catch(acknowledgeBridgeFailure);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      let request: (Partial<FactionSelectionTabletopRequest> & Pick<FactionSelectionTabletopRequest, 'command'>) | null = null;
      if (key === 'w') request = { command: 'pan', deltaY: -0.045 };
      else if (key === 's') request = { command: 'pan', deltaY: 0.045 };
      else if (key === 'a') request = { command: 'pan', deltaX: 0.045 };
      else if (key === 'd') request = { command: 'pan', deltaX: -0.045 };
      else if (key === '+' || key === '=') request = { command: 'zoom', zoomDelta: 0.7 };
      else if (key === '-' || key === '_') request = { command: 'zoom', zoomDelta: -0.7 };
      else if (key === 'r') request = { command: 'reset' };

      if (request) {
        event.preventDefault();
        void requestFactionSelectionTabletop(request).catch(acknowledgeBridgeFailure);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleZoomControl = useCallback((event: React.PointerEvent<HTMLButtonElement>, amount: number) => {
    event.preventDefault();
    event.stopPropagation();
    void requestFactionSelectionTabletop({
      command: amount === 0 ? 'reset' : 'zoom',
      zoomDelta: amount,
    }).catch(acknowledgeBridgeFailure);
  }, []);

  return (
    <section className={`fs-map-panel fs-map-panel--tabletop${scenarioDescriptionParts.length > 0 ? ' fs-map-panel--has-description' : ''}`}>
      <div
        className="fs-tabletop-input"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishPointer(event, true)}
        onPointerCancel={(event) => finishPointer(event, false)}
        onAuxClick={(event) => event.preventDefault()}
        onWheel={handleWheel}
      >
        {hoveredFaction && hoveredFaction.baseName !== selectedBaseName && (
          <div className="fs-map-hover-label">
            <span className={roundelClassName(hoveredFaction, 'xs')} style={roundelStyle(hoveredFaction)}>
              <FactionSelectionRoundelSymbol faction={hoveredFaction} />
            </span>
            <span>{hoveredFaction.displayName}</span>
            {!hoveredFaction.playable && (
              <span className="badge badge--gold fs-map-hover-tag">{t('MainMenu.Locked')}</span>
            )}
          </div>
        )}

        <div
          className="fs-zoom-controls"
          data-focus-group="vertical"
          data-focus-left=".fs-faction-row--active"
          data-focus-right=".fs-begin-btn"
        >
          <button type="button" className="fs-zoom-btn" onPointerDown={(event) => handleZoomControl(event, 1)}>
            <img src="/assets/icons/I_Plus.png" alt="" className="fs-zoom-icon" draggable={false} />
          </button>
          <button type="button" className="fs-zoom-btn" onPointerDown={(event) => handleZoomControl(event, -1)}>
            <img src="/assets/icons/I_Minus.png" alt="" className="fs-zoom-icon" draggable={false} />
          </button>
          <button
            type="button"
            className="fs-zoom-btn fs-zoom-btn--reset"
            onPointerDown={(event) => handleZoomControl(event, 0)}
          >
            <img src="/assets/icons/I_ResetView.png" alt="" className="fs-zoom-icon" draggable={false} />
          </button>
        </div>
      </div>

      {scenarioDescriptionParts.length > 0 && (
        <div className="fs-campaign-description">
          <StyledScrollArea
            className="fs-campaign-description-scroll"
            viewportClassName="fs-campaign-description-viewport"
            variant="inline"
          >
            {scenarioDescriptionParts.map((part, index) => (
              <p key={index}>{part}</p>
            ))}
          </StyledScrollArea>
        </div>
      )}
    </section>
  );
}

interface FactionSelectionBrowseColumnProps {
  mapId: string;
  data: GetNewGameMapFactionSelectionResponse;
  selectedBaseName: string;
  onSelectBaseName: (baseName: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  showForeign: boolean;
  onShowForeignChange: (value: boolean) => void;
  scenarioDescriptionParts: string[];
}

const FactionSelectionBrowseColumn = forwardRef<FactionMapHoverHandle, FactionSelectionBrowseColumnProps>(
  function FactionSelectionBrowseColumn(
    {
      mapId,
      data,
      selectedBaseName,
      onSelectBaseName,
      search,
      onSearchChange,
      showForeign,
      onShowForeignChange,
      scenarioDescriptionParts,
    },
    ref,
  ) {
    const t = useWebUIText();
    const [hoveredBaseName, setHoveredBaseName] = useState('');

    useImperativeHandle(ref, () => ({
      setHovered: (baseName: string) => setHoveredBaseName(baseName),
      clearHovered: () => setHoveredBaseName(''),
    }), []);

    const factions = data.factions;
    const factionsByBase = useMemo(
      () => new Map(factions.map((faction) => [faction.baseName, faction])),
      [factions],
    );
    const hovered = hoveredBaseName ? factionsByBase.get(hoveredBaseName) ?? null : null;
    const searchQuery = search.trim();

    const visibleFactions = useMemo(
      () => factions.filter((faction) => {
        if (!showForeign && !belongsToPlayableRealm(faction, factionsByBase)) {
          return false;
        }
        return factionMatchesSearch(faction, searchQuery);
      }),
      [factions, factionsByBase, searchQuery, showForeign],
    );

    const factionListRows = useMemo(() => {
      const visibleBaseNames = new Set(visibleFactions.map((faction) => faction.baseName));
      const groups = buildFactionGroups(factions, visibleBaseNames);
      return flattenFactionGroups(groups);
    }, [factions, visibleFactions]);

    const renderFactionRow = useCallback((row: FactionListRow) => {
      const faction = row.faction;
      const active = selectedBaseName === faction.baseName;
      return (
        <button
          type="button"
          className={`fs-faction-row fs-faction-row--${row.kind}${
            active ? ' fs-faction-row--active' : ''
          }${!faction.playable ? ' fs-faction-row--locked' : ''}${
            row.hasMembers ? ' fs-faction-row--grouped' : ''
          }`}
          aria-selected={active}
          data-gamepad-default={active ? '' : undefined}
          data-focus-right=".fs-begin-btn"
          onFocus={() => onSelectBaseName(faction.baseName)}
          onClick={() => onSelectBaseName(faction.baseName)}
          onMouseEnter={() => setHoveredBaseName(faction.baseName)}
          onMouseLeave={() => setHoveredBaseName('')}
        >
          <span className={roundelClassName(faction, 'xs')} style={roundelStyle(faction)}>
            <FactionSelectionRoundelSymbol faction={faction} />
          </span>
          <span className="fs-faction-copy">
            <span className="fs-faction-name">{faction.displayName}</span>
            {(row.kind === 'subject' || !row.hasMembers) && faction.capitalSettlementName && (
              <span
                className="fs-faction-sub fs-faction-sub--capital"
                onClick={(event) => {
                  if (event.button !== 0) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectBaseName(faction.baseName);
                  void zoomTabletopToCapital(faction.baseName).catch(acknowledgeBridgeFailure);
                }}
              >
                {faction.capitalSettlementName}
              </span>
            )}
          </span>
        </button>
      );
    }, [onSelectBaseName, selectedBaseName]);

    return (
      <>
        <aside
          className="fs-list-panel"
          data-focus-group="vertical"
          data-focus-right=".fs-begin-btn"
        >
          <div className="fs-panel-banner">
            <span className="fs-panel-banner-title">{t('MainMenu.Realm')}</span>
            <span className="fs-panel-banner-count">{formatNumber(visibleFactions.length)}</span>
          </div>
          <div className="fs-list-head">
            <input
              type="text"
              className="search-input fs-search"
              placeholder={t('MainMenu.SearchFactions')}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />

            <button
              type="button"
              className={`fs-list-toggle-row${showForeign ? ' fs-list-toggle-row--on' : ''}`}
              aria-pressed={showForeign}
              onClick={() => onShowForeignChange(!showForeign)}
            >
              <span className="fs-toggle-box">
                <span className="fs-toggle-mark" />
              </span>
              <span className="fs-toggle-label">{t('MainMenu.ShowForeignFactions')}</span>
            </button>
          </div>

          <VirtualList
            items={factionListRows}
            getKey={row => `${row.groupKey}:${row.kind}:${row.faction.baseName}`}
            renderItem={renderFactionRow}
            empty={<div className="fs-empty-list">{t('MainMenu.NoFactionMatches')}</div>}
            className="fs-list-scroll-frame"
            viewportClassName="fs-list-scroll"
            itemClassName="fs-list-row-frame"
            rowHeightRem={2.65}
            virtualizeThreshold={30}
            overscan={10}
            resetSignal={`${mapId}:${showForeign ? 1 : 0}:${searchQuery}`}
          />
          <div className="fs-panel-meander" aria-hidden="true" />
        </aside>

        <FactionSelectionTabletopMap
          selectedBaseName={selectedBaseName}
          hoveredFaction={hovered}
          scenarioDescriptionParts={scenarioDescriptionParts}
          onSelectBaseName={onSelectBaseName}
        />
      </>
    );
  },
);

interface FactionSelectionDetailPanelProps {
  selected: ScenarioMapFactionDto;
  factions: ScenarioMapFactionDto[];
  factionsByBase: Map<string, ScenarioMapFactionDto>;
  wars: ScenarioMapWarDto[];
  showPurchaseForSelected: boolean;
  onSelectBaseName: (baseName: string) => void;
  onFactionHover: (baseName: string) => void;
  onFactionHoverEnd: () => void;
  onConfirm: FactionSelectionProps['onConfirm'];
  onPurchaseFullGame?: FactionSelectionProps['onPurchaseFullGame'];
}

function FactionSelectionDetailPanel({
  selected,
  factions,
  factionsByBase,
  wars,
  showPurchaseForSelected,
  onSelectBaseName,
  onFactionHover,
  onFactionHoverEnd,
  onConfirm,
  onPurchaseFullGame,
}: FactionSelectionDetailPanelProps) {
  const t = useWebUIText();
  const selectedLeader = getLeader(selected);
  const selectedSubjects = factions
    .filter((faction) => faction.overlordBaseName === selected.baseName)
    .sort(factionSort);
  const selectedProvinceSubjects = selectedSubjects.filter((subject) => subject.subjectSubtype === 'province');
  const selectedFoederatiSubjects = selectedSubjects.filter((subject) => subject.subjectSubtype === 'foederati');
  const warsInvolvingSelected = getWarsForFaction(wars, selected.baseName);
  const nonSubjectTreaties = selected.treaties.filter((treaty) => !isSubjectTreaty(treaty.type));
  const treatiesByLabel = new Map<string, ScenarioMapTreatyDto[]>();

  nonSubjectTreaties.forEach((treaty) => {
    const label = treatyBlockLabel(treaty.type, t);
    const treaties = treatiesByLabel.get(label) ?? [];
    treaties.push(treaty);
    treatiesByLabel.set(label, treaties);
  });

  const renderSubjectRoundels = (subjects: ScenarioMapFactionDto[]) => (
    <div className="fs-subject-roundel-list" data-focus-group="horizontal">
      {subjects.map((subject) => (
        <Tooltip
          key={subject.baseName}
          content={{
            title: subject.displayName,
            body: subject.capitalSettlementName || undefined,
          }}
          position="bottom"
          delay={150}
          wrapperClassName="fs-subject-roundel-tooltip"
        >
          <button
            type="button"
            className={`fs-subject-roundel-btn${!subject.playable ? ' fs-subject-roundel-btn--locked' : ''}`}
            aria-label={subject.displayName}
            onClick={() => onSelectBaseName(subject.baseName)}
            onMouseEnter={() => onFactionHover(subject.baseName)}
            onMouseLeave={onFactionHoverEnd}
          >
            <span className={roundelClassName(subject, 'sm')} style={roundelStyle(subject)}>
              <FactionSelectionRoundelSymbol faction={subject} />
            </span>
          </button>
        </Tooltip>
      ))}
    </div>
  );

  const renderWarSide = (
    side: ScenarioMapWarDto['attacker'],
    leader: ScenarioMapFactionDto | undefined,
    allyCount: number,
    tone: 'ours' | 'theirs',
  ) => {
    const content = (
      <>
        {leader && (
          <span className={roundelClassName(leader, 'sm')} style={roundelStyle(leader)}>
            <FactionSelectionRoundelSymbol faction={leader} />
          </span>
        )}
        <div className="fs-war-side-meta">
          <div className="fs-war-side-label">{t(tone === 'ours' ? 'MainMenu.OurSide' : 'MainMenu.Enemy')}</div>
          <div className="fs-war-side-leader">{side.leaderFactionDisplayName}</div>
          {allyCount > 0 && (
            <div className="fs-war-side-count">
              {`+${formatNumber(allyCount)} ${t(allyCount === 1 ? 'Common.Ally' : 'Common.Allies')}`}
            </div>
          )}
        </div>
      </>
    );

    if (!leader) {
      return <div className={`fs-war-side fs-war-side--${tone}`}>{content}</div>;
    }

    return (
      <button
        type="button"
        className={`fs-war-side fs-war-side--${tone} fs-war-side--clickable`}
        aria-label={leader.displayName}
        onClick={() => onSelectBaseName(leader.baseName)}
        onMouseEnter={() => onFactionHover(leader.baseName)}
        onMouseLeave={onFactionHoverEnd}
      >
        {content}
      </button>
    );
  };

  const heroStyle = {
    ['--fs-faction-primary' as string]: rgb(selected.primaryColour),
    ['--fs-faction-primary-soft' as string]: rgb(selected.primaryColour, 0.42),
    ['--fs-faction-secondary' as string]: rgb(
      selected.secondaryColour.length >= 3 ? selected.secondaryColour : selected.primaryColour,
      0.35,
    ),
  };

  return (
    <aside
      className="fs-detail-panel"
      data-focus-group="vertical"
      data-focus-left=".fs-faction-row--active"
    >
      <div className="fs-detail-hero" style={heroStyle}>
        <div className="fs-detail-hero-wash" aria-hidden="true" />
        {selectedLeader ? (
          <div className="fs-detail-hero-portrait">
            <Portrait
              name={selectedLeader.displayName}
              layers={selectedLeader.portraitLayers}
              size="hero"
              shape="rect"
              showBorder={false}
              className="fs-detail-hero-composite"
            />
          </div>
        ) : (
          <div className="fs-detail-hero-placeholder">{selected.displayName}</div>
        )}

        <div className="fs-detail-hero-vignette" />

        <div className="fs-detail-hero-scrim">
          <span className={roundelClassName(selected, 'lg')} style={roundelStyle(selected)}>
            <FactionSelectionRoundelSymbol faction={selected} />
          </span>
          <div className="fs-detail-hero-info">
            {!selected.playable && (
              <div className="badge badge--gold fs-detail-hero-status">
                {showPurchaseForSelected ? t('Demo.BuyFullGame') : t('MainMenu.Locked')}
              </div>
            )}
            <div className="fs-detail-hero-faction-name">{selected.displayName}</div>
            {selectedLeader && (
              <div className="fs-detail-hero-ruler-name">{selectedLeader.displayName}</div>
            )}
          </div>
        </div>
      </div>

      <div className="fs-detail-body">
        {selectedLeader && (
          <div className="fs-detail-section fs-detail-section--leader">
            {selectedLeader.dynasty && (
              <div className="fs-dynasty-row">
                <img src="/assets/icons/I_Family.png" alt="" className="fs-dynasty-icon" />
                <span>{t('MainMenu.House', { Dynasty: selectedLeader.dynasty })}</span>
              </div>
            )}
            {renderLeaderStats(selectedLeader.stats, t)}
            {selectedLeader.fame > 0 && (
              <div className="fs-fame-row">
                <img src="/assets/icons/I_Chart.png" alt="" className="fs-fame-icon" />
                <span className="fs-fame-label">{t('Common.Fame')}</span>
                <span className="fs-fame-value">{formatNumber(selectedLeader.fame)}</span>
              </div>
            )}
            {selectedLeader.traits.length > 0 && (
              <div className="fs-trait-strip">{selectedLeader.traits.map(renderTraitIcon)}</div>
            )}
          </div>
        )}

        <div className="fs-detail-section">
          <div className="fs-detail-section-title">
            <img src="/assets/icons/I_Domain.png" alt="" className="fs-detail-section-icon" />
            <span>{t('MainMenu.Realm')}</span>
          </div>

          <div className="fs-identity-grid">
            <CultureTooltip info={selected.cultureInfo} fallbackName={selected.cultureDisplayName} fallbackId={selected.culture}>
              <div className="fs-identity-item">
                {selected.cultureIconPath ? (
                  <img src={WebkilnAssetPath(selected.cultureIconPath)} alt="" className="fs-identity-icon" />
                ) : (
                  <span className="fs-identity-icon-fallback" />
                )}
                <div>
                  <div className="fs-identity-label">{t('MainMenu.Culture')}</div>
                  <div className="fs-identity-text">{selected.cultureDisplayName || '-'}</div>
                </div>
              </div>
            </CultureTooltip>

            <ReligionTooltip info={selected.religionInfo} fallbackName={selected.religionDisplayName} fallbackId={selected.religion}>
              <div className="fs-identity-item">
                {selected.religionIconPath ? (
                  <img src={WebkilnAssetPath(selected.religionIconPath)} alt="" className="fs-identity-icon" />
                ) : (
                  <span className="fs-identity-icon-fallback" />
                )}
                <div>
                  <div className="fs-identity-label">{t('MainMenu.Religion')}</div>
                  <div className="fs-identity-text">{selected.religionDisplayName || '-'}</div>
                </div>
              </div>
            </ReligionTooltip>

            <button
              type="button"
              className="fs-identity-item fs-identity-item--capital"
              onClick={(event) => {
                if (event.button !== 0) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                void zoomTabletopToCapital(selected.baseName).catch(acknowledgeBridgeFailure);
              }}
            >
              <img src="/assets/icons/I_Capital.png" alt="" className="fs-identity-icon" />
              <div>
                <div className="fs-identity-label">{t('Common.Capital')}</div>
                <div className="fs-identity-text">{selected.capitalSettlementName || '-'}</div>
              </div>
            </button>

            <GovernmentTooltip
              government={selected.government}
              displayName={selected.governmentDisplayName}
              description={selected.governmentDescription}
              capabilities={selected.governmentCapabilities}
            >
              <div className="fs-identity-item">
                <img src="/assets/icons/I_Domain.png" alt="" className="fs-identity-icon" />
                <div>
                  <div className="fs-identity-label">{t('MainMenu.Government')}</div>
                  <div className="fs-identity-text">{selected.governmentDisplayName || '-'}</div>
                </div>
              </div>
            </GovernmentTooltip>
          </div>

          {renderFactionStats(selected.stats)}
        </div>

        {warsInvolvingSelected.length > 0 && (
          <div className="fs-detail-section">
            <div className="fs-detail-section-title">
              <img src="/assets/icons/I_War.png" alt="" className="fs-detail-section-icon" />
              <span>{t('MainMenu.Wars')}</span>
            </div>
            <div className="fs-war-list">
              {warsInvolvingSelected.map((war) => {
                const onAttackerSide = war.attacker.memberFactionBaseNames.includes(selected.baseName);
                const ourSide = onAttackerSide ? war.attacker : war.defender;
                const enemySide = onAttackerSide ? war.defender : war.attacker;
                const ourLeader = factionsByBase.get(ourSide.leaderFactionBaseName);
                const enemyLeader = factionsByBase.get(enemySide.leaderFactionBaseName);
                const ourAllyCount = Math.max(0, ourSide.memberFactionBaseNames.length - 1);
                const enemyAllyCount = Math.max(0, enemySide.memberFactionBaseNames.length - 1);
                const totalSideStrength = ourSide.militaryStrength + enemySide.militaryStrength;

                return (
                  <div key={war.id} className="fs-war">
                    <div className="fs-war-name">{war.name}</div>
                    <div className="fs-war-sides" data-focus-group="horizontal">
                      {renderWarSide(ourSide, ourLeader, ourAllyCount, 'ours')}
                      <div className="fs-war-vs"><WebUIText textKey="Auto.PagesFactionSelection.928.2" /></div>
                      {renderWarSide(enemySide, enemyLeader, enemyAllyCount, 'theirs')}
                    </div>
                    {totalSideStrength > 0 && (
                      <div className="fs-war-strength">
                        <div className="fs-war-strength-values">
                          <span className="comparison-strength-value comparison-strength-value--gold">{formatNumber(ourSide.militaryStrength)}</span>
                          <span>{t('Economy.Strength')}</span>
                          <span className="comparison-strength-value comparison-strength-value--red">{formatNumber(enemySide.militaryStrength)}</span>
                        </div>
                        <div className="fs-war-strength-bar">
                          <span
                            className="fs-war-strength-fill fs-war-strength-fill--ours"
                            style={{ width: warStrengthShare(ourSide.militaryStrength, totalSideStrength) }}
                          />
                          <span
                            className="fs-war-strength-fill fs-war-strength-fill--theirs"
                            style={{ width: warStrengthShare(enemySide.militaryStrength, totalSideStrength) }}
                          />
                        </div>
                      </div>
                    )}
                    {war.startedDay && <div className="fs-war-started">{t('MainMenu.Declared', { Date: war.startedDay })}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="fs-detail-section">
          <div className="fs-detail-section-title">
            <img src="/assets/icons/I_Diplomacy.png" alt="" className="fs-detail-section-icon" />
            <span>{t('MainMenu.Diplomacy')}</span>
          </div>

          {selectedProvinceSubjects.length > 0 && (
            <div className="fs-treaty-block">
              <div className="fs-treaty-block-label">{t('MainMenu.Provinces')}</div>
              {renderSubjectRoundels(selectedProvinceSubjects)}
            </div>
          )}

          {selectedFoederatiSubjects.length > 0 && (
            <div className="fs-treaty-block">
              <div className="fs-treaty-block-label">{t('MainMenu.Foederati')}</div>
              {renderSubjectRoundels(selectedFoederatiSubjects)}
            </div>
          )}

          {Array.from(treatiesByLabel.entries()).map(([label, treaties]) => (
            <div key={label} className="fs-treaty-block">
              <div className="fs-treaty-block-label">{label}</div>
              <div className="fs-treaty-list">
                {treaties.map((treaty, index) => {
                  const treatyLabel = treaty.displayName || treaty.type;
                  return (
                    <Tooltip
                      key={`${treaty.type}-${index}`}
                      content={{
                        title: treatyLabel,
                        body: treaty.description,
                      }}
                      position="bottom"
                      delay={150}
                    >
                      <div className="fs-treaty">
                        {TREATY_ICONS[treaty.type] && (
                          <img src={TREATY_ICONS[treaty.type]} alt="" className="fs-treaty-icon" />
                        )}
                        <div className="fs-treaty-info">
                          <span className="fs-treaty-with">{treaty.withFactionDisplayName}</span>
                          <span className="fs-treaty-type">{treatyLabel}</span>
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}

          {selectedSubjects.length === 0 && nonSubjectTreaties.length === 0 && (
            <div className="fs-detail-note">{t('MainMenu.NoStandingTreaties')}</div>
          )}
        </div>
      </div>

      <div className="fs-detail-footer">
        <button
          type="button"
          className={`fs-begin-btn${selected.playable || showPurchaseForSelected ? '' : ' fs-begin-btn--disabled'}`}
          data-focus-left=".fs-faction-row--active"
          disabled={!selected.playable && !showPurchaseForSelected}
          onClick={() => {
            if (selected.playable) {
              onConfirm({ baseName: selected.baseName, displayName: selected.displayName });
            } else if (showPurchaseForSelected) {
              onPurchaseFullGame?.();
            }
          }}
        >
          <span className="fs-begin-btn-main">
            {!selected.playable && (
              <img src="/assets/icons/I_Locked.png" alt="" className="fs-begin-btn-lock-icon" draggable={false} />
            )}
            <span>{selected.playable
              ? t('MainMenu.BeginCampaign')
              : showPurchaseForSelected
                ? t('Demo.BuyFullGame')
                : t('MainMenu.Locked')}</span>
          </span>
          <span className="fs-begin-btn-sub">
            {selected.playable
              ? t('MainMenu.AsFaction', { Faction: selected.displayName })
              : showPurchaseForSelected
                ? t('Demo.PlayFaction', { Faction: selected.displayName })
                : t('MainMenu.FactionPlayableLater')}
          </span>
        </button>
      </div>
      <div className="fs-panel-meander" aria-hidden="true" />
    </aside>
  );
}

interface FactionSelectionDataState {
  data: GetNewGameMapFactionSelectionResponse | null;
  displayData: GetNewGameMapFactionSelectionResponse | null;
  loadError: string | null;
  factions: ScenarioMapFactionDto[];
  factionsByBase: Map<string, ScenarioMapFactionDto>;
  selected: ScenarioMapFactionDto | null;
  selectedBaseName: string;
  setSelectedBaseName: React.Dispatch<React.SetStateAction<string>>;
}

function useFactionSelectionData(
  mapId: string,
  initialData: GetNewGameMapFactionSelectionResponse | null,
  loadFactionSelection: FactionSelectionProps['loadFactionSelection'],
  t: WebUITextFormatter,
): FactionSelectionDataState {
  const initialSelectionData = initialData?.mapId === mapId ? initialData : null;
  const [data, setData] = useState<GetNewGameMapFactionSelectionResponse | null>(initialSelectionData);
  const [selectedBaseName, setSelectedBaseName] = useState(
    initialSelectionData ? getDefaultSelectedFactionBaseName(initialSelectionData) : '',
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.mapId === mapId) {
      return;
    }

    let cancelled = false;
    const request = initialSelectionData
      ? Promise.resolve(initialSelectionData)
      : loadFactionSelection
        ? loadFactionSelection(mapId)
        : bridgeCall('game.get_new_game_map_faction_selection', { mapId });

    void request
      .then((response) => {
        if (cancelled) {
          return;
        }

        setData(response);
        setLoadError(null);
        setSelectedBaseName(getDefaultSelectedFactionBaseName(response));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : t('MainMenu.FactionSelectionLoadFailed'),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data?.mapId, initialSelectionData, loadFactionSelection, mapId, t]);

  const displayData = useMemo(
    () => data ? translateFactionSelectionData(data, t) : null,
    [data, t],
  );
  const factions = useMemo(() => displayData?.factions ?? [], [displayData?.factions]);
  const factionsByBase = useMemo(
    () => new Map(factions.map((faction) => [faction.baseName, faction])),
    [factions],
  );
  const selected = factionsByBase.get(selectedBaseName) ?? factions[0] ?? null;

  return {
    data,
    displayData,
    loadError,
    factions,
    factionsByBase,
    selected,
    selectedBaseName,
    setSelectedBaseName,
  };
}

const FactionSelectionScreen: React.FC<FactionSelectionProps> = ({
  mapId,
  initialData = null,
  loadFactionSelection,
  scenario,
  closing = false,
  onClose,
  showPurchaseForLocked = false,
  onPurchaseFullGame,
  onConfirm,
}) => {
  const t = useWebUIText();
  const {
    data,
    displayData,
    loadError,
    factions,
    factionsByBase,
    selected,
    selectedBaseName,
    setSelectedBaseName,
  } = useFactionSelectionData(mapId, initialData, loadFactionSelection, t);
  const [search, setSearch] = useState('');
  const [showForeign, setShowForeign] = useState(showPurchaseForLocked);
  useFactionSelectionTabletop(
    mapId,
    selectedBaseName,
    Boolean(data && displayData && selected && !loadError),
  );

  useEffect(() => {
    if (loadError || (data && displayData && !selected)) {
      void requestFactionSelectionTabletop({ command: 'hide' }).catch(acknowledgeBridgeFailure);
    }
  }, [data, displayData, loadError, selected]);

  const mapHoverRef = useRef<FactionMapHoverHandle | null>(null);
  const showPurchaseForSelected = Boolean(
    selected && showPurchaseForLocked && selected.fullGamePlayable,
  );
  const scenarioTitle = displayData?.displayName || scenario?.displayName || '';
  const scenarioDescription = displayData?.factionSelectionDescription ?? '';
  const scenarioDescriptionParts = scenarioDescription
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const rootClassName = `fs-root${closing ? ' fs-root--closing' : ''}`;

  const handleFactionHover = useCallback((baseName: string) => {
    mapHoverRef.current?.setHovered(baseName);
  }, []);

  const handleFactionHoverEnd = useCallback(() => {
    mapHoverRef.current?.clearHovered();
  }, []);

  const selectFactionBaseName = useCallback((baseName: string) => {
    const faction = factionsByBase.get(baseName);
    if (faction && !belongsToPlayableRealm(faction, factionsByBase)) {
      setShowForeign(true);
    }
    setSelectedBaseName(baseName);
  }, [factionsByBase, setSelectedBaseName]);

  if (loadError) {
    return (
      <StateView
        title={t('MainMenu.ChooseYourFaction')}
        subtitle={t('MainMenu.FailedToLoadMap', { MapId: mapId })}
        message={loadError}
        closing={closing}
        onClose={onClose}
      />
    );
  }

  if (!data || !displayData) {
    return null;
  }

  if (!selected) {
    return (
      <StateView
        title={t('MainMenu.ChooseYourFaction')}
        subtitle={displayData.displayName}
        message={t('MainMenu.MapNoFactions')}
        closing={closing}
        onClose={onClose}
      />
    );
  }

  return (
    <div className={rootClassName} data-focus-root="faction-selection" data-focus-priority="400">
      <div className="fs-atmosphere" aria-hidden="true" />
      <FactionSelectionHeader
        title={scenarioTitle || t('MainMenu.ChooseYourFaction')}
        onClose={onClose}
        backLabel={t('MainMenu.BackToMainMenuUpper')}
      />

      <div className="fs-body">
        <FactionSelectionBrowseColumn
          ref={mapHoverRef}
          mapId={mapId}
          data={displayData}
          selectedBaseName={selectedBaseName}
          onSelectBaseName={selectFactionBaseName}
          search={search}
          onSearchChange={setSearch}
          showForeign={showForeign}
          onShowForeignChange={setShowForeign}
          scenarioDescriptionParts={scenarioDescriptionParts}
        />

        <FactionSelectionDetailPanel
          selected={selected}
          factions={factions}
          factionsByBase={factionsByBase}
          wars={displayData.wars}
          showPurchaseForSelected={showPurchaseForSelected}
          onSelectBaseName={selectFactionBaseName}
          onFactionHover={handleFactionHover}
          onFactionHoverEnd={handleFactionHoverEnd}
          onConfirm={onConfirm}
          onPurchaseFullGame={onPurchaseFullGame}
        />
      </div>
    </div>
  );
};

const FactionSelection: React.FC<FactionSelectionProps> = (props) => (
  <FactionSelectionScreen key={props.mapId} {...props} />
);

export default FactionSelection;
