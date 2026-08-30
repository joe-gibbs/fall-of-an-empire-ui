import React, { useCallback, useState } from 'react';
import Tooltip from './Tooltip';
import CultureTooltip from './CultureTooltip';
import ReligionTooltip from './ReligionTooltip';
import { cultureIconPath } from '../../../utils/cultureIcons';
import FactionRoundel from '../entities/FactionRoundel';
import type { TooltipContent } from './Tooltip';
import { useFaction } from '../../../data-source/index';
import type { Faction, CultureInfo, ReligionInfo } from '../../../data/types';
import { useOptionalGameState } from '../../../context/GameContext';
import { getOpinionColor, getComplianceState } from '../../../utils/colorFormatters';
import { formatTreatyType } from '../../../utils/displayLabels';
import { treatyIconPath } from '../../../utils/iconMaps';
import { formatNumber } from '../../../utils/numberFormat';
import './FactionTooltip.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';

const MAX_VISIBLE_TREATY_FACTIONS = 4;

interface FactionTooltipData {
  id?: string;
  debugShortId?: number;
  name: string;
  rulerName?: string;
  description?: string;
  culture?: string;
  cultureId?: string;
  cultureInfo?: CultureInfo;
  religion?: string;
  religionInfo?: ReligionInfo;
  capital?: string;
  statusLabel?: string;
  statusColor?: string;
  opinion?: number;
  population?: number;
  settlements?: number;
  armies?: number;
  vassals?: number;
  income?: number;
  gold?: number;
  treaties?: FactionTooltipTreaty[];
  isPlayer?: boolean;
  compliance?: number | null;
  buildFocus?: string | null;
}

interface FactionTooltipTreaty {
  key: string;
  type?: string;
  label: string;
  description?: string;
  withFaction?: string;
  withFactionId?: string;
  withFactionDebugShortId?: number;
  withFactionColour?: string;
  withFactionSecondaryColour?: string;
  withFactionCulture?: string;
  withFactionCultureGroup?: string;
  withFactionEmblem?: string;
  withFactionDiplomaticStatus?: string;
  withFactionSubjectSubtype?: string;
  withFactionIsPlayer?: boolean;
  withFactionIsRebel?: boolean;
}

interface FactionTooltipTreatyFaction {
  key: string;
  id?: string;
  debugShortId?: number;
  name: string;
  colour?: string;
  secondaryColour?: string;
  diplomaticStatus?: string;
  subjectSubtype?: string;
  isPlayer?: boolean;
  isRebel?: boolean;
  culture?: string;
  cultureGroup?: string;
  emblem?: string;
}

interface FactionTooltipTreatyGroup {
  key: string;
  type?: string;
  label: string;
  description?: string;
  factions: FactionTooltipTreatyFaction[];
}

interface FactionTooltipProps {
  factionId?: string;
  factionName?: string;
  data?: Partial<FactionTooltipData>;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  /** Optional live key binding shown on the name row (e.g. open-faction shortcut). */
  titleAccessory?: React.ReactNode;
}

const diplomaticStatusMeta: Record<Faction['diplomaticStatus'], { label: string; color: string }> = {
  ally: { get label() { return webUIText('Auto.TopProp.ComponentsCommonFactionTooltip.55.1'); }, color: 'var(--green)' },
  rival: { get label() { return webUIText('Auto.TopProp.ComponentsCommonFactionTooltip.56.2'); }, color: 'var(--orange)' },
  neutral: { get label() { return webUIText('Auto.TopProp.ComponentsCommonFactionTooltip.57.3'); }, color: 'var(--text-muted)' },
  war: { get label() { return webUIText('Auto.TopProp.ComponentsCommonFactionTooltip.58.4'); }, color: 'var(--red)' },
  subject: { get label() { return webUIText('Auto.TopProp.ComponentsCommonFactionTooltip.59.5'); }, color: 'var(--blue)' },
};

function getOpinionIcon(opinion: number): string {
  if (opinion >= 20) return '/assets/icons/I_OpinionPositive.png';
  if (opinion >= -20) return '/assets/icons/I_OpinionNeutral.png';
  return '/assets/icons/I_OpinionNegative.png';
}

function mapFaction(faction: Faction): Partial<FactionTooltipData> {
  const status = diplomaticStatusMeta[faction.diplomaticStatus];

  return {
    id: faction.id,
    debugShortId: faction.debugShortId,
    name: faction.name,
    rulerName: faction.rulerName,
    description: faction.description,
    culture: faction.culture,
    cultureId: faction.cultureId,
    cultureInfo: faction.cultureInfo,
    religion: faction.religion,
    religionInfo: faction.religionInfo,
    capital: faction.capital,
    statusLabel: status.label,
    statusColor: status.color,
    opinion: faction.opinion,
    population: faction.population,
    settlements: faction.settlements,
    armies: faction.armyCount,
    vassals: faction.vassalCount,
    income: faction.income,
    gold: faction.gold,
    treaties: faction.treaties.map((treaty, index) => ({
      key: `${treaty.type}-${treaty.withFactionId ?? treaty.withFaction}-${index}`,
      type: treaty.type,
      label: treaty.displayName || formatTreatyType(treaty.type),
      description: treaty.description,
      withFaction: treaty.withFaction,
      withFactionId: treaty.withFactionId,
      withFactionDebugShortId: treaty.withFactionDebugShortId,
      withFactionColour: treaty.withFactionColour,
      withFactionSecondaryColour: treaty.withFactionSecondaryColour,
      withFactionCulture: treaty.withFactionCulture,
      withFactionCultureGroup: treaty.withFactionCultureGroup,
      withFactionEmblem: treaty.withFactionEmblem,
    })),
    isPlayer: faction.isPlayer,
    compliance: !faction.isPlayer ? faction.compliance : undefined,
  };
}

function summariseTreaties(treaties: FactionTooltipTreaty[]): FactionTooltipTreatyGroup[] {
  const groups = new Map<string, FactionTooltipTreatyGroup>();

  treaties.forEach((treaty, index) => {
    const groupKey = treaty.type || treaty.label;
    const existing = groups.get(groupKey);
    if (existing) {
      if (!existing.description && treaty.description) {
        existing.description = treaty.description;
      }
      appendTreatyFaction(existing, treaty, index);
      return;
    }

    const group: FactionTooltipTreatyGroup = {
      key: groupKey,
      type: treaty.type,
      label: treaty.label,
      description: treaty.description,
      factions: [],
    };
    appendTreatyFaction(group, treaty, index);
    groups.set(groupKey, group);
  });

  return Array.from(groups.values());
}

function appendTreatyFaction(group: FactionTooltipTreatyGroup, treaty: FactionTooltipTreaty, index: number): void {
  if (!treaty.withFaction) return;

  group.factions.push({
    key: treaty.withFactionId || `${treaty.withFaction}-${index}`,
    id: treaty.withFactionId,
    debugShortId: treaty.withFactionDebugShortId,
    name: treaty.withFaction,
    colour: treaty.withFactionColour,
    secondaryColour: treaty.withFactionSecondaryColour,
    culture: treaty.withFactionCulture,
    cultureGroup: treaty.withFactionCultureGroup,
    emblem: treaty.withFactionEmblem,
    diplomaticStatus: treaty.withFactionDiplomaticStatus,
    subjectSubtype: treaty.withFactionSubjectSubtype,
    isPlayer: treaty.withFactionIsPlayer,
    isRebel: treaty.withFactionIsRebel,
  });
}

function treatyTooltipContent(treaty: FactionTooltipTreatyGroup): TooltipContent {
  return {
    title: treaty.label,
    body: treaty.description || undefined,
  };
}

function treatyFactionTooltipFallback(faction: FactionTooltipTreatyFaction): Partial<FactionTooltipData> {
  const data: Partial<FactionTooltipData> = { name: faction.name };
  if (faction.id) data.id = faction.id;
  if (faction.debugShortId !== undefined) data.debugShortId = faction.debugShortId;
  if (faction.culture) data.culture = faction.culture;
  return data;
}

function TreatyFactionRoundel({ faction }: { faction: FactionTooltipTreatyFaction }) {
  return (
    <FactionTooltip
      factionId={faction.id}
      factionName={faction.name}
      data={treatyFactionTooltipFallback(faction)}
      position="right"
    >
      <FactionRoundel
        factionId={faction.id}
        colour={faction.colour}
        secondaryColour={faction.secondaryColour}
        cultureGroup={faction.cultureGroup}
        emblem={faction.emblem}
        name={faction.name}
        size="xs"
        diplomaticStatus={faction.diplomaticStatus}
        subjectSubtype={faction.subjectSubtype}
        isPlayer={faction.isPlayer}
        isRebel={faction.isRebel}
      />
    </FactionTooltip>
  );
}

function resolveFactionTooltipData(
  baseFaction: Faction | null,
  data?: Partial<FactionTooltipData>,
): FactionTooltipData | null {
  const resolved: Partial<FactionTooltipData> = {
    ...(baseFaction ? mapFaction(baseFaction) : {}),
  };

  if (data) {
    Object.assign(resolved, data);
  }

  if (!resolved.name) {
    return null;
  }

  return resolved as FactionTooltipData;
}

function FactionTooltipContent({
  faction,
  titleAccessory,
}: {
  faction: FactionTooltipData;
  titleAccessory?: React.ReactNode;
}) {
  const debugMode = useOptionalGameState()?.debugMode ?? false;
  const hasIdentity = Boolean(faction.culture || faction.religion);
  const hasStats = !faction.isPlayer && (faction.opinion != null || faction.compliance != null);
  const treaties = summariseTreaties(faction.treaties ?? []);
  const hasTags = Boolean((faction.buildFocus && faction.buildFocus !== 'Balanced') || treaties.length > 0);

  return (
    <div className="ftt">
      <div className="ftt-name-row">
        <div className={titleAccessory ? 'ftt-name-heading ftt-name-heading--with-accessory' : 'ftt-name-heading'}>
          <div className="ftt-name">{faction.name}</div>
          {titleAccessory}
        </div>
        {faction.statusLabel && (
          <div className="ftt-status" style={faction.statusColor ? { color: faction.statusColor } : undefined}>
            {faction.statusLabel}
          </div>
        )}
      </div>

      {faction.rulerName && <div className="ftt-ruler">{webUIText("FactionTooltip.RuledBy", { RulerName: faction.rulerName })}</div>}
      {faction.description && <div className="ftt-description">{faction.description}</div>}

      {hasIdentity && (
        <div className="ftt-identity">
          {faction.culture && (
            <CultureTooltip
              info={faction.cultureInfo}
              fallbackName={faction.culture}
              fallbackId={faction.cultureId || faction.cultureInfo?.id}
            >
              <div className="ftt-identity-row">
                <img
                  src={cultureIconPath(faction.cultureId || faction.cultureInfo?.id)}
                  alt=""
                  className="ftt-identity-icon"
                  draggable={false}
                />
                <span>{faction.culture}</span>
              </div>
            </CultureTooltip>
          )}
          {faction.religion && (
            <ReligionTooltip info={faction.religionInfo} fallbackName={faction.religion}>
              <div className="ftt-identity-row">
                <img src="/assets/icons/I_Religions.png" alt="" className="ftt-identity-icon" draggable={false} />
                <span>{faction.religion}</span>
              </div>
            </ReligionTooltip>
          )}
        </div>
      )}

      {(faction.capital || hasStats) && <div className="ftt-rule"><span /><span /></div>}

      {faction.capital && (
        <div className="ftt-meta-row">
          <span className="ftt-meta-label">
            <img src="/assets/icons/I_Domain.png" alt="" className="ftt-meta-icon" draggable={false} />
            <span><WebUIText textKey="Auto.ComponentsCommonFactionTooltip.165.1" /></span>
          </span>
          <span className="ftt-meta-value">{faction.capital}</span>
        </div>
      )}

      {hasStats && (
        <div className="ftt-stats">
          {faction.opinion != null && (
            <div className="ftt-stat">
              <img src={getOpinionIcon(faction.opinion)} alt="" className="ftt-stat-icon" draggable={false} />
              <span className="ftt-stat-value" style={{ color: getOpinionColor(faction.opinion) }}>{formatNumber(faction.opinion)}</span>
              <span className="ftt-stat-label"><WebUIText textKey="Auto.ComponentsCommonFactionTooltip.177.2" /></span>
            </div>
          )}
          {faction.compliance != null && (() => {
            const compliance = getComplianceState(faction.compliance);
            return (
              <div className="ftt-stat">
                <img src={compliance.icon} alt="" className="ftt-stat-icon" draggable={false} />
                <span className="ftt-stat-value" style={{ color: compliance.color }}>{formatNumber(faction.compliance)}</span>
                <span className="ftt-stat-label"><WebUIText textKey="Auto.ComponentsCommonFactionTooltip.186.3" /></span>
              </div>
            );
          })()}
        </div>
      )}

      {hasTags && <div className="ftt-rule"><span /><span /></div>}

      {hasTags && (
        <div className="ftt-tags">
          {faction.buildFocus && faction.buildFocus !== 'Balanced' && (
            <span className="ftt-tag">{webUIText("FactionTooltip.Focus", { BuildFocus: faction.buildFocus })}</span>
          )}
          {treaties.length > 0 && (
            <div className="ftt-treaties">
              {treaties.map((treaty) => {
                const hiddenFactionCount = Math.max(0, treaty.factions.length - MAX_VISIBLE_TREATY_FACTIONS);
                const visibleFactions = hiddenFactionCount > 0
                  ? treaty.factions.slice(0, MAX_VISIBLE_TREATY_FACTIONS)
                  : treaty.factions;

                return (
                  <div key={treaty.key} className="ftt-treaty-row">
                    <span className="ftt-treaty-kind">
                      <span className="ftt-treaty-icon-wrap">
                        <Tooltip content={treatyTooltipContent(treaty)} position="left" delay={150} inline>
                          <img src={treatyIconPath(treaty.type)} alt="" className="ftt-treaty-icon" draggable={false} />
                        </Tooltip>
                      </span>
                      <span className="ftt-treaty-label">{treaty.label}</span>
                    </span>
                    <span className="ftt-treaty-factions">
                      {visibleFactions.map((otherFaction) => (
                        <TreatyFactionRoundel key={otherFaction.key} faction={otherFaction} />
                      ))}
                      {hiddenFactionCount > 0 && (
                        <span className="ftt-treaty-count">
                          {webUIText('FactionTooltip.TreatyFactionCount', { Count: treaty.factions.length })}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {debugMode && (
        <>
          <div className="ftt-rule"><span /><span /></div>
          {faction.debugShortId != null && (
            <div className="ftt-meta-row">
              <span className="ftt-meta-label"><WebUIText textKey="Auto.ComponentsCommonFactionTooltip.218.4" /></span>
              <span className="ftt-meta-value">{`#${formatNumber(faction.debugShortId)}`}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const FactionTooltip: React.FC<FactionTooltipProps> = ({
  factionId,
  factionName,
  data,
  children,
  position = 'right',
  delay = 200,
  titleAccessory,
}) => {
  const lookupId = factionId ?? factionName ?? null;
  const fallbackData = data ?? (factionName ? { name: factionName } : undefined);
  const [resolveRequested, setResolveRequested] = useState(false);
  const baseFaction = useFaction(resolveRequested ? lookupId : null);
  const resolved = resolveFactionTooltipData(baseFaction, fallbackData);
  const requestResolution = useCallback(() => {
    if (lookupId) setResolveRequested(true);
  }, [lookupId]);

  if (!resolved) {
    return (
      <Tooltip
        content={titleAccessory ? { title: factionName || webUIText('Topbar.Faction'), titleAccessory } : null}
        position={position}
        delay={delay}
        variant="sidebar"
        disabled={!titleAccessory}
        onShowIntent={requestResolution}
      >
        <div className="ftt-trigger">
          {children}
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      content={{ afterLines: <FactionTooltipContent faction={resolved} titleAccessory={titleAccessory} /> }}
      position={position}
      delay={delay}
      variant="sidebar"
      onShowIntent={requestResolution}
    >
      <div className="ftt-trigger">
        {children}
      </div>
    </Tooltip>
  );
};

export default FactionTooltip;
