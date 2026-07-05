import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
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
import ZoomPanCanvas, { type ZoomPanCanvasApi, type ZoomPanPoint } from '../components/common/layout/scrolling/ZoomPanCanvas';
import VirtualList from '../components/common/layout/scrolling/VirtualList';
import { StatCellGrid, StatCell } from '../components/sidebars/shared/StatCellGrid';
import { FoaeCefUIAssetPath } from '../utils/assets';
import { resolveFactionBorderVariant } from '../utils/factionBorder';
import { formatNumber, formatSignedNumber } from '../utils/numberFormat';
import { useWebUIText, type WebUITextFormatter } from '../localization/WebUITextContext';
import {
  bridgeCall,
  type GetNewGameMapFactionGeometryResponse,
  type GetNewGameMapFactionSelectionResponse,
  type ScenarioMapFactionDto,
  type ScenarioMapLeaderDto,
  type ScenarioMapStatDto,
  type ScenarioMapTraitDto,
  type ScenarioMapTreatyDto,
  type ScenarioMapWarDto,
} from '../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../bridge/core/runtimeEngine';
import './FactionSelection.css';

import { WebUIText } from '../localization/WebUITextContext';
interface FactionSelectionProps {
  mapId: string;
  scenario?: {
    displayName: string;
  };
  closing?: boolean;
  onClose: () => void;
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
  firstInGroup: boolean;
  lastInGroup: boolean;
  hasMembers: boolean;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 1.15;
const MAP_BORDER_CANVAS_SCALE = 2;
const FACTION_GEOMETRY_DEFER_MS = 150;

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
    faction.displayName.toLowerCase().includes(query) ||
    faction.realm.toLowerCase().includes(query) ||
    faction.cultureDisplayName.toLowerCase().includes(query) ||
    faction.religionDisplayName.toLowerCase().includes(query) ||
    faction.capitalSettlementName.toLowerCase().includes(query)
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

function factionListHeaderName(faction: ScenarioMapFactionDto): string {
  if (
    !faction.overlordBaseName &&
    faction.realm &&
    faction.realm !== faction.displayName &&
    faction.realm.toLowerCase().includes('empire')
  ) {
    return faction.realm;
  }

  return faction.displayName;
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
      firstInGroup: true,
      lastInGroup: !hasMembers,
      hasMembers,
    });

    members.forEach((member, index) => {
      rows.push({
        faction: member,
        kind: 'subject',
        groupKey: group.sovereign.baseName,
        firstInGroup: false,
        lastInGroup: index === members.length - 1,
        hasMembers,
      });
    });
  }

  return rows;
}

function getPoliticalColour(
  faction: ScenarioMapFactionDto,
  factionsByBase: Map<string, ScenarioMapFactionDto>,
): number[] {
  if (!faction.overlordBaseName) {
    return faction.primaryColour;
  }

  return factionsByBase.get(faction.overlordBaseName)?.primaryColour ?? faction.primaryColour;
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

function mapStageStyle(data: GetNewGameMapFactionSelectionResponse): React.CSSProperties {
  return {
    aspectRatio: `${data.mapWidth} / ${data.mapHeight}`,
  };
}

function applyFactionGeometry(
  data: GetNewGameMapFactionSelectionResponse,
  geometryData: GetNewGameMapFactionGeometryResponse,
): GetNewGameMapFactionSelectionResponse {
  if (data.mapId !== geometryData.mapId) {
    return data;
  }

  const geometriesByBase = new Map(
    geometryData.factions.map((faction) => [faction.baseName, faction.geometry]),
  );

  return {
    ...data,
    mapWidth: geometryData.mapWidth || data.mapWidth,
    mapHeight: geometryData.mapHeight || data.mapHeight,
    factions: data.factions.map((faction) => {
      const geometry = geometriesByBase.get(faction.baseName);
      return geometry ? { ...faction, geometry } : faction;
    }),
  };
}

function roundelSymbolStyle(emblemAssetPath: string): React.CSSProperties {
  return {
    maskImage: `url("${FoaeCefUIAssetPath(emblemAssetPath)}")`,
    maskPosition: 'center',
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
  };
}

function renderRoundelSymbol(emblemAssetPath: string): React.ReactNode {
  if (!emblemAssetPath) {
    return null;
  }

  return (
    <span
      className="fs-roundel-symbol"
      style={roundelSymbolStyle(emblemAssetPath)}
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
              lines: statBreakdownLines(stat),
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

function FactionBorderCanvas({
  data,
  factions,
}: {
  data: GetNewGameMapFactionSelectionResponse;
  factions: ScenarioMapFactionDto[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const borderPaths = useMemo(
    () => factions
      .map((faction) => faction.geometry.borderPath)
      .filter((path): path is string => path.length > 0),
    [factions],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const sourceWidth = Math.max(1, data.mapWidth);
    const sourceHeight = Math.max(1, data.mapHeight);
    const canvasWidth = sourceWidth * MAP_BORDER_CANVAS_SCALE;
    const canvasHeight = sourceHeight * MAP_BORDER_CANVAS_SCALE;
    if (canvas.width !== canvasWidth) {
      canvas.width = canvasWidth;
    }
    if (canvas.height !== canvasHeight) {
      canvas.height = canvasHeight;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    if (borderPaths.length === 0 || typeof Path2D === 'undefined') {
      return;
    }

    context.save();
    context.scale(MAP_BORDER_CANVAS_SCALE, MAP_BORDER_CANVAS_SCALE);
    context.lineJoin = 'round';
    context.lineCap = 'round';

    context.strokeStyle = 'rgba(8, 12, 17, 0.52)';
    context.lineWidth = 4;
    for (const borderPath of borderPaths) {
      context.stroke(new Path2D(borderPath));
    }

    context.strokeStyle = 'rgba(238, 206, 130, 0.28)';
    context.lineWidth = 1.5;
    for (const borderPath of borderPaths) {
      context.stroke(new Path2D(borderPath));
    }
    context.restore();
  }, [borderPaths, data.mapHeight, data.mapWidth]);

  return (
    <canvas
      ref={canvasRef}
      className="fs-map-borders"
      width={Math.max(1, data.mapWidth) * MAP_BORDER_CANVAS_SCALE}
      height={Math.max(1, data.mapHeight) * MAP_BORDER_CANVAS_SCALE}
      aria-hidden="true"
    />
  );
}

function FactionHighlightCanvas({
  data,
  selected,
  hovered,
}: {
  data: GetNewGameMapFactionSelectionResponse;
  selected: ScenarioMapFactionDto;
  hovered: ScenarioMapFactionDto | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedFillPath = selected.geometry.fillPath;
  const selectedBorderPath = selected.geometry.borderPath;
  const hoveredFillPath = hovered && hovered.baseName !== selected.baseName ? hovered.geometry.fillPath : '';
  const hoveredBorderPath = hovered && hovered.baseName !== selected.baseName ? hovered.geometry.borderPath : '';
  const hoveredPlayable = hovered?.playable ?? false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const sourceWidth = Math.max(1, data.mapWidth);
    const sourceHeight = Math.max(1, data.mapHeight);
    const canvasWidth = sourceWidth * MAP_BORDER_CANVAS_SCALE;
    const canvasHeight = sourceHeight * MAP_BORDER_CANVAS_SCALE;
    if (canvas.width !== canvasWidth) {
      canvas.width = canvasWidth;
    }
    if (canvas.height !== canvasHeight) {
      canvas.height = canvasHeight;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    if (typeof Path2D === 'undefined') {
      return;
    }

    context.save();
    context.scale(MAP_BORDER_CANVAS_SCALE, MAP_BORDER_CANVAS_SCALE);
    context.lineJoin = 'round';
    context.lineCap = 'round';

    if (selectedFillPath) {
      context.fillStyle = 'rgba(255, 231, 160, 0.42)';
      context.fill(new Path2D(selectedFillPath));
    }

    if (selectedBorderPath) {
      const selectedPath = new Path2D(selectedBorderPath);
      context.strokeStyle = 'rgba(13, 18, 24, 0.96)';
      context.lineWidth = 10;
      context.stroke(selectedPath);
      context.strokeStyle = 'rgba(255, 218, 96, 0.98)';
      context.lineWidth = 5;
      context.stroke(selectedPath);
    }

    if (hoveredFillPath) {
      context.fillStyle = hoveredPlayable ? 'rgba(255, 246, 200, 0.30)' : 'rgba(194, 88, 88, 0.26)';
      context.fill(new Path2D(hoveredFillPath));
    }

    if (hoveredBorderPath) {
      const hoveredPath = new Path2D(hoveredBorderPath);
      context.strokeStyle = hoveredPlayable ? 'rgba(13, 18, 24, 0.88)' : 'rgba(42, 10, 10, 0.9)';
      context.lineWidth = 8;
      context.stroke(hoveredPath);
      context.strokeStyle = hoveredPlayable ? 'rgba(255, 231, 150, 0.9)' : 'rgba(219, 94, 94, 0.88)';
      context.lineWidth = 4;
      context.stroke(hoveredPath);
    }

    context.restore();
  }, [
    data.mapHeight,
    data.mapWidth,
    hoveredBorderPath,
    hoveredFillPath,
    hoveredPlayable,
    selectedBorderPath,
    selectedFillPath,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="fs-map-overlay"
      width={Math.max(1, data.mapWidth) * MAP_BORDER_CANVAS_SCALE}
      height={Math.max(1, data.mapHeight) * MAP_BORDER_CANVAS_SCALE}
      aria-hidden="true"
    />
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
    <div className={`fs-root${closing ? ' fs-root--closing' : ''}`}>
      <div className="fs-header">
        <div className="fs-title-wrap">
          <div className="fs-title">{title}</div>
          <div className="fs-subtitle">{subtitle}</div>
        </div>
        <button type="button" className="fs-back-btn" onClick={onClose}>
          <span className="fs-back-icon" aria-hidden="true" />
          <span>{t('MainMenu.BackToMainMenu')}</span>
        </button>
      </div>
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

interface MapControlsOverlayState {
  mapLabelFaction: ScenarioMapFactionDto | null;
  lockedLabel: string;
}

const MapControlsOverlayContext = createContext<MapControlsOverlayState>({
  mapLabelFaction: null,
  lockedLabel: '',
});

function FactionSelectionMapControls({
  zoom,
  zoomIn,
  zoomOut,
  resetView,
}: ZoomPanCanvasApi) {
  const { mapLabelFaction, lockedLabel } = useContext(MapControlsOverlayContext);

  return (
    <>
      {mapLabelFaction && (
        <div className="fs-map-hover-label">
          <span className={roundelClassName(mapLabelFaction, 'xs')} style={roundelStyle(mapLabelFaction)}>
            {renderRoundelSymbol(mapLabelFaction.emblemAssetPath)}
          </span>
          <span>{mapLabelFaction.displayName}</span>
          {!mapLabelFaction.playable && (
            <span className="fs-map-hover-tag fs-map-hover-tag--locked">{lockedLabel}</span>
          )}
        </div>
      )}

      <div className="fs-zoom-controls">
        <button
          type="button"
          className="fs-zoom-btn"
          onMouseDown={(event) => {
            event.stopPropagation();
            zoomIn();
          }}
        >
          <img src="/assets/icons/I_Plus.png" alt="" className="fs-zoom-icon" draggable={false} />
        </button>
        <button
          type="button"
          className="fs-zoom-btn"
          onMouseDown={(event) => {
            event.stopPropagation();
            zoomOut();
          }}
        >
          <img src="/assets/icons/I_Minus.png" alt="" className="fs-zoom-icon" draggable={false} />
        </button>
        <button
          type="button"
          className="fs-zoom-btn fs-zoom-btn--reset"
          onMouseDown={(event) => {
            event.stopPropagation();
            resetView();
          }}
        >
          <img src="/assets/icons/I_ResetView.png" alt="" className="fs-zoom-icon" draggable={false} />
        </button>
        <div className="fs-zoom-readout">{zoom.toFixed(1)}<WebUIText textKey="Auto.PagesFactionSelection.621.1" /></div>
      </div>
    </>
  );
}

interface FactionSelectionBrowseColumnProps {
  mapId: string;
  data: GetNewGameMapFactionSelectionResponse;
  selected: ScenarioMapFactionDto;
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
      selected,
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
    const [descriptionScroll, setDescriptionScroll] = useState({ top: 0, height: 1, scrollHeight: 1 });

    const pickRequestIdRef = useRef(0);
    const descriptionScrollRef = useRef<HTMLDivElement | null>(null);

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
    const searchQuery = search.trim().toLowerCase();

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

    const mapLabelFaction = hovered && hovered.baseName !== selected.baseName ? hovered : null;
    const mapControlsOverlay = useMemo(
      () => ({
        mapLabelFaction,
        lockedLabel: t('MainMenu.Locked'),
      }),
      [mapLabelFaction, t],
    );

    const descriptionCanScroll = descriptionScroll.scrollHeight > descriptionScroll.height + 1;
    const descriptionThumbHeight = descriptionCanScroll
      ? Math.max(16, (descriptionScroll.height / descriptionScroll.scrollHeight) * 100)
      : 100;
    const descriptionThumbTop = descriptionCanScroll
      ? (descriptionScroll.top / (descriptionScroll.scrollHeight - descriptionScroll.height)) * (100 - descriptionThumbHeight)
      : 0;

    const updateDescriptionScroll = useCallback(() => {
      const element = descriptionScrollRef.current;
      if (!element) {
        return;
      }

      setDescriptionScroll({
        top: element.scrollTop,
        height: element.clientHeight || 1,
        scrollHeight: element.scrollHeight || 1,
      });
    }, []);

    useEffect(() => {
      updateDescriptionScroll();
    }, [scenarioDescriptionParts, updateDescriptionScroll]);

    const handleMapPick = useCallback((point: ZoomPanPoint) => {
      const requestId = pickRequestIdRef.current + 1;
      pickRequestIdRef.current = requestId;

      void bridgeCall('game.pick_new_game_map_faction', {
        mapId,
        x: point.x / 100,
        y: point.y / 100,
      })
        .then((response) => {
          if (pickRequestIdRef.current !== requestId || !response.baseName) {
            return;
          }

          onSelectBaseName(response.baseName);
          setHoveredBaseName(response.baseName);
        })
        .catch(acknowledgeBridgeFailure);
    }, [mapId, onSelectBaseName]);

    const renderFactionRow = useCallback((row: FactionListRow) => {
      const faction = row.faction;
      const active = selectedBaseName === faction.baseName;
      return (
        <button
          type="button"
          className={`fs-faction-row fs-faction-row--${row.kind}${
            active ? ' fs-faction-row--active' : ''
          }${!faction.playable ? ' fs-faction-row--locked' : ''}${
            row.firstInGroup ? ' fs-faction-row--group-first' : ''
          }${row.lastInGroup ? ' fs-faction-row--group-last' : ''}${
            row.hasMembers ? ' fs-faction-row--grouped' : ''
          }`}
          onClick={() => onSelectBaseName(faction.baseName)}
          onMouseEnter={() => setHoveredBaseName(faction.baseName)}
          onMouseLeave={() => setHoveredBaseName('')}
        >
          <span className={roundelClassName(faction, 'xs')} style={roundelStyle(faction)}>
            {renderRoundelSymbol(faction.emblemAssetPath)}
          </span>
          <span className="fs-faction-copy">
            <span className="fs-faction-name">{row.kind === 'sovereign' ? factionListHeaderName(faction) : faction.displayName}</span>
            {(row.kind === 'subject' || !row.hasMembers) && (
              <span className="fs-faction-sub">
                {faction.capitalSettlementName || faction.realm || '-'}
              </span>
            )}
          </span>
        </button>
      );
    }, [onSelectBaseName, selectedBaseName]);

    return (
      <>
        <aside className="fs-list-panel">
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
        </aside>

        <section className={`fs-map-panel${scenarioDescriptionParts.length > 0 ? ' fs-map-panel--has-description' : ''}`}>
          <MapControlsOverlayContext.Provider value={mapControlsOverlay}>
            <ZoomPanCanvas
              key={mapId}
              className="fs-map-frame"
              contentClassName="fs-map-stage"
              contentStyle={mapStageStyle(data)}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              zoomStep={ZOOM_STEP}
              onContentLeftClick={handleMapPick}
              onContentMouseLeave={() => setHoveredBaseName('')}
              onPanDragStart={() => setHoveredBaseName('')}
              controls={FactionSelectionMapControls}
            >
              {data.paperMapUrl && (
                <img src={data.paperMapUrl} alt="" className="fs-map-painted" draggable={false} />
              )}
              {data.politicalMapUrl && (
                <img src={data.politicalMapUrl} alt="" className="fs-map-political-img" draggable={false} />
              )}

              {!data.politicalMapUrl && (
                <svg
                  viewBox={`0 0 ${data.mapWidth} ${data.mapHeight}`}
                  className="fs-map-political"
                  preserveAspectRatio="none"
                >
                  {factions.map((faction) => {
                    const colour = getPoliticalColour(faction, factionsByBase);
                    const borderColour = darken(colour, 0.72);

                    return (
                      <g key={faction.baseName}>
                        {faction.geometry.fillPath && (
                          <path d={faction.geometry.fillPath} fill={rgb(colour, 0.56)} />
                        )}
                        {faction.geometry.borderPath && (
                          <path
                            d={faction.geometry.borderPath}
                            fill="none"
                            stroke={rgb(borderColour, 0.96)}
                            strokeWidth={2}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}

              <FactionBorderCanvas data={data} factions={factions} />

              {data.politicalMapUrl ? (
                <FactionHighlightCanvas data={data} selected={selected} hovered={hovered} />
              ) : (
                <svg
                  viewBox={`0 0 ${data.mapWidth} ${data.mapHeight}`}
                  className="fs-map-overlay"
                  preserveAspectRatio="none"
                >
                    {selected.geometry.fillPath && (
                      <path d={selected.geometry.fillPath} fill="rgba(255, 231, 160, 0.42)" />
                    )}
                    {selected.geometry.borderPath && (
                      <g>
                        <path
                          d={selected.geometry.borderPath}
                          fill="none"
                          stroke="rgba(13, 18, 24, 0.96)"
                          strokeWidth={10}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        <path
                          d={selected.geometry.borderPath}
                          fill="none"
                          stroke="rgba(255, 218, 96, 0.98)"
                          strokeWidth={5}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {hovered && hovered.baseName !== selected.baseName && hovered.geometry.fillPath && (
                      <path
                        d={hovered.geometry.fillPath}
                        fill={hovered.playable ? 'rgba(255, 246, 200, 0.30)' : 'rgba(194, 88, 88, 0.26)'}
                      />
                    )}
                    {hovered && hovered.baseName !== selected.baseName && hovered.geometry.borderPath && (
                      <g>
                        <path
                          d={hovered.geometry.borderPath}
                          fill="none"
                          stroke={hovered.playable ? 'rgba(13, 18, 24, 0.88)' : 'rgba(42, 10, 10, 0.9)'}
                          strokeWidth={8}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        <path
                          d={hovered.geometry.borderPath}
                          fill="none"
                          stroke={hovered.playable ? 'rgba(255, 231, 150, 0.9)' : 'rgba(219, 94, 94, 0.88)'}
                          strokeWidth={4}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </g>
                    )}
                </svg>
              )}

              <div className="fs-map-vignette" />

              {selected.hasCapitalPosition && (
                <div
                  className="fs-capital-marker"
                  style={{
                    left: `${selected.capitalPosX * 100}%`,
                    top: `${selected.capitalPosY * 100}%`,
                  }}
                >
                  <div className="fs-capital-pin">
                    <div className="fs-capital-star" />
                    <div className="fs-capital-name">{selected.capitalSettlementName}</div>
                  </div>
                </div>
              )}
            </ZoomPanCanvas>
          </MapControlsOverlayContext.Provider>

          {scenarioDescriptionParts.length > 0 && (
            <div className="fs-campaign-description">
              <div
                ref={descriptionScrollRef}
                className="fs-campaign-description-scroll"
                onScroll={updateDescriptionScroll}
              >
                {scenarioDescriptionParts.map((part, index) => (
                  <p key={index}>{part}</p>
                ))}
              </div>
              <div className="fs-campaign-description-scrollbar" aria-hidden="true">
                <div
                  className="fs-campaign-description-thumb"
                  style={{
                    height: `${descriptionThumbHeight}%`,
                    top: `${descriptionThumbTop}%`,
                  }}
                />
              </div>
            </div>
          )}
        </section>
      </>
    );
  },
);

const FactionSelection: React.FC<FactionSelectionProps> = ({ mapId, scenario, closing = false, onClose, onConfirm }) => {
  const t = useWebUIText();
  const [data, setData] = useState<GetNewGameMapFactionSelectionResponse | null>(null);
  const [selectedBaseName, setSelectedBaseName] = useState('');
  const [search, setSearch] = useState('');
  const [showForeign, setShowForeign] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resetForMapId, setResetForMapId] = useState(mapId);

  const mapHoverRef = useRef<FactionMapHoverHandle | null>(null);
  const geometryRequestMapIdRef = useRef('');

  if (resetForMapId !== mapId) {
    setResetForMapId(mapId);
    setData(null);
    setLoadError(null);
    setSearch('');
    setShowForeign(false);
    setSelectedBaseName('');
  }

  useEffect(() => {
    geometryRequestMapIdRef.current = '';
  }, [mapId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await bridgeCall('game.get_new_game_map_faction_selection', { mapId });
        if (cancelled) {
          return;
        }

        setData(response);

        const defaultPlayable = response.factions.find(
          (faction) =>
            faction.baseName === response.defaultPlayerFactionBaseName && faction.playable,
        );
        const firstPlayable = response.factions.find((faction) => faction.playable);
        const firstFaction = response.factions[0] ?? null;

        setSelectedBaseName(
          defaultPlayable?.baseName ?? firstPlayable?.baseName ?? firstFaction?.baseName ?? '',
        );
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : t('MainMenu.FactionSelectionLoadFailed'),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapId, t]);

  useEffect(() => {
    if (!data || geometryRequestMapIdRef.current === data.mapId) {
      return;
    }

    const hasInitialGeometry = data.factions.some(
      (faction) => faction.geometry.fillPath || faction.geometry.borderPath,
    );
    if (hasInitialGeometry) {
      geometryRequestMapIdRef.current = data.mapId;
      return;
    }

    geometryRequestMapIdRef.current = data.mapId;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void bridgeCall('game.get_new_game_map_faction_geometry', { mapId: data.mapId })
        .then((response) => {
          if (cancelled) {
            return;
          }

          setData((current) => current ? applyFactionGeometry(current, response) : current);
        })
        .catch(acknowledgeBridgeFailure);
    }, FACTION_GEOMETRY_DEFER_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [data]);

  const factions = data?.factions ?? [];
  const factionsByBase = new Map(factions.map((faction) => [faction.baseName, faction]));
  const selected = factionsByBase.get(selectedBaseName) ?? factions[0] ?? null;
  const selectedLeader = getLeader(selected);
  const selectedSubjects = selected
    ? factions
        .filter((faction) => faction.overlordBaseName === selected.baseName)
        .sort(factionSort)
    : [];
  const selectedProvinceSubjects = selectedSubjects.filter((subject) => subject.subjectSubtype === 'province');
  const selectedFoederatiSubjects = selectedSubjects.filter((subject) => subject.subjectSubtype === 'foederati');
  const warsInvolvingSelected = selected ? getWarsForFaction(data?.wars ?? [], selected.baseName) : [];
  const scenarioTitle = scenario?.displayName || data?.displayName || '';
  const scenarioDescription = data?.factionSelectionDescription ?? '';
  const scenarioDescriptionParts = scenarioDescription
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const rootClassName = `fs-root${closing ? ' fs-root--closing' : ''}`;
  const nonVassalTreaties = selected
    ? selected.treaties.filter((treaty) => !isSubjectTreaty(treaty.type))
    : [];
  const treatiesByLabel = new Map<string, ScenarioMapTreatyDto[]>();
  nonVassalTreaties.forEach((treaty) => {
    const label = treatyBlockLabel(treaty.type, t);
    const list = treatiesByLabel.get(label) ?? [];
    list.push(treaty);
    treatiesByLabel.set(label, list);
  });
  const treatyBlocks = Array.from(treatiesByLabel.entries());

  const handleFactionHover = useCallback((baseName: string) => {
    mapHoverRef.current?.setHovered(baseName);
  }, []);

  const handleFactionHoverEnd = useCallback(() => {
    mapHoverRef.current?.clearHovered();
  }, []);

  const renderSubjectRoundels = (subjects: ScenarioMapFactionDto[]) => (
    <div className="fs-subject-roundel-list">
      {subjects.map((subject) => (
        <Tooltip
          key={subject.baseName}
          content={{
            title: subject.displayName,
            body: subject.capitalSettlementName || subject.realm || undefined,
          }}
          position="bottom"
          delay={150}
          wrapperClassName="fs-subject-roundel-tooltip"
        >
          <button
            type="button"
            className={`fs-subject-roundel-btn${!subject.playable ? ' fs-subject-roundel-btn--locked' : ''}`}
            aria-label={subject.displayName}
            onClick={() => setSelectedBaseName(subject.baseName)}
            onMouseEnter={() => handleFactionHover(subject.baseName)}
            onMouseLeave={handleFactionHoverEnd}
          >
            <span className={roundelClassName(subject, 'sm')} style={roundelStyle(subject)}>
              {renderRoundelSymbol(subject.emblemAssetPath)}
            </span>
          </button>
        </Tooltip>
      ))}
    </div>
  );

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

  if (!data) {
    return (
      <StateView
        title={t('MainMenu.ChooseYourFaction')}
        subtitle={t('MainMenu.LoadingMap', { MapId: mapId })}
        message={t('MainMenu.LoadingFactionSelectionData')}
        closing={closing}
        onClose={onClose}
      />
    );
  }

  if (!selected) {
    return (
      <StateView
        title={t('MainMenu.ChooseYourFaction')}
        subtitle={data.displayName}
        message={t('MainMenu.MapNoFactions')}
        closing={closing}
        onClose={onClose}
      />
    );
  }

  return (
    <div className={rootClassName}>

      <div className="fs-header">
          <div className="fs-title-wrap">
            <div className="fs-title">{scenarioTitle || t('MainMenu.ChooseYourFaction')}</div>
            <div className="fs-subtitle">{t('MainMenu.ChooseYourFaction')}</div>
          </div>
          <button type="button" className="fs-back-btn" onClick={onClose}>
            <span className="fs-back-icon" aria-hidden="true" />
            <span>{t('MainMenu.BackToMainMenuUpper')}</span>
          </button>
      </div>

      <div className="fs-body">
        <FactionSelectionBrowseColumn
          ref={mapHoverRef}
          mapId={mapId}
          data={data}
          selected={selected}
          selectedBaseName={selectedBaseName}
          onSelectBaseName={setSelectedBaseName}
          search={search}
          onSearchChange={setSearch}
          showForeign={showForeign}
          onShowForeignChange={setShowForeign}
          scenarioDescriptionParts={scenarioDescriptionParts}
        />

        <aside className="fs-detail-panel">
          <div className="fs-detail-hero">
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
                {renderRoundelSymbol(selected.emblemAssetPath)}
              </span>
              <div className="fs-detail-hero-info">
                <div className="fs-detail-hero-faction-name">{selected.displayName}</div>
                {selectedLeader && (
                  <>
                    <div className="fs-detail-hero-ruler-name">{selectedLeader.displayName}</div>
                  </>
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
                      <img src={FoaeCefUIAssetPath(selected.cultureIconPath)} alt="" className="fs-identity-icon" />
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
                      <img src={FoaeCefUIAssetPath(selected.religionIconPath)} alt="" className="fs-identity-icon" />
                    ) : (
                      <span className="fs-identity-icon-fallback" />
                    )}
                    <div>
                      <div className="fs-identity-label">{t('MainMenu.Religion')}</div>
                      <div className="fs-identity-text">{selected.religionDisplayName || '-'}</div>
                    </div>
                  </div>
                </ReligionTooltip>

                <div className="fs-identity-item">
                  <img src="/assets/icons/I_Capital.png" alt="" className="fs-identity-icon" />
                  <div>
                    <div className="fs-identity-label">{t('Common.Capital')}</div>
                    <div className="fs-identity-text">{selected.capitalSettlementName || '-'}</div>
                  </div>
                </div>

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
                      <div className="fs-identity-text">
                        {selected.governmentDisplayName || '-'}
                      </div>
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
                        <div className="fs-war-sides">
                          <div className="fs-war-side fs-war-side--ours">
                            {ourLeader && (
                              <span className={roundelClassName(ourLeader, 'sm')} style={roundelStyle(ourLeader)}>
                                {renderRoundelSymbol(ourLeader.emblemAssetPath)}
                              </span>
                            )}
                            <div className="fs-war-side-meta">
                              <div className="fs-war-side-label">{t('MainMenu.OurSide')}</div>
                              <div className="fs-war-side-leader">{ourSide.leaderFactionDisplayName}</div>
                              {ourAllyCount > 0 && (
                                <div className="fs-war-side-count">
                                  {`+${formatNumber(ourAllyCount)} ${t(ourAllyCount === 1 ? 'Common.Ally' : 'Common.Allies')}`}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="fs-war-vs"><WebUIText textKey="Auto.PagesFactionSelection.928.2" /></div>
                          <div className="fs-war-side fs-war-side--theirs">
                            {enemyLeader && (
                              <span className={roundelClassName(enemyLeader, 'sm')} style={roundelStyle(enemyLeader)}>
                                {renderRoundelSymbol(enemyLeader.emblemAssetPath)}
                              </span>
                            )}
                            <div className="fs-war-side-meta">
                              <div className="fs-war-side-label">{t('MainMenu.Enemy')}</div>
                              <div className="fs-war-side-leader">{enemySide.leaderFactionDisplayName}</div>
                              {enemyAllyCount > 0 && (
                                <div className="fs-war-side-count">
                                  {`+${formatNumber(enemyAllyCount)} ${t(enemyAllyCount === 1 ? 'Common.Ally' : 'Common.Allies')}`}
                                </div>
                              )}
                            </div>
                          </div>
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

              {treatyBlocks.map(([label, treaties]) => (
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

              {selectedSubjects.length === 0 && nonVassalTreaties.length === 0 && (
                <div className="fs-detail-note">{t('MainMenu.NoStandingTreaties')}</div>
              )}
            </div>
          </div>

          <div className="fs-detail-footer">
            <button
              type="button"
              className={`fs-begin-btn${selected.playable ? '' : ' fs-begin-btn--disabled'}`}
              disabled={!selected.playable}
              onClick={() =>
                onConfirm({ baseName: selected.baseName, displayName: selected.displayName })
              }
            >
              <span className="fs-begin-btn-main">
                {!selected.playable && (
                  <img src="/assets/icons/I_Locked.png" alt="" className="fs-begin-btn-lock-icon" draggable={false} />
                )}
                <span>{selected.playable ? t('MainMenu.BeginCampaign') : t('MainMenu.Locked')}</span>
              </span>
              <span className="fs-begin-btn-sub">
                {selected.playable
                  ? t('MainMenu.AsFaction', { Faction: selected.displayName })
                  : t('MainMenu.FactionPlayableLater')}
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FactionSelection;
