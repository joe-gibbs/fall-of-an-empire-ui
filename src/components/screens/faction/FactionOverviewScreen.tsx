import { useCallback, useEffect, useMemo, useState } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import Portrait from '../../common/portraits/Portrait';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import CultureTooltip from '../../common/tooltips/CultureTooltip';
import GovernmentTooltip from '../../common/tooltips/GovernmentTooltip';
import ReligionTooltip from '../../common/tooltips/ReligionTooltip';
import { cultureIconPath } from '../../../utils/cultureIcons';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import InteractionCard from '../../common/interactions/InteractionCard';
import Badge from '../../common/data-display/stats/Badge';
import HeirAssignmentModal from '../../modals/characters/HeirAssignmentModal';
import { BureaucraticInlineValue, BureaucraticRushTooltipAction } from '../../bureaucracy/BureaucraticThroughput';
import { bureaucraticTooltipLine } from '../../bureaucracy/BureaucraticThroughputModel';
import { useGameActions } from '../../../context/GameContext';
import { usePlayerFactionSummaryBridgeState } from '../../../bridge/app/usePlayerFactionBridge';
import {
  useFactionInteractionsBridge,
  type FactionInteractionsState,
  type FactionInteractionView,
} from '../../../bridge/diplomacy/useFactionInteractionsBridge';
import { useFactionBridgeState } from '../../../bridge/diplomacy/useFactionBridge';
import { useFamilyTreeBridgeState, type FamilyTreeData, type FamilyTreePerson } from '../../../bridge/characters/useCharactersBridge';
import { useBridgeQuery } from '../../../bridge/core/useBridgeQuery';
import type { GetIncomeBreakdownResponse } from '../../../bridge-types.generated.ts';
import type { Faction } from '../../../data/types';
import { formatPersonActivity } from '../../../utils/displayLabels';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { displayTextToPlain } from '../../../utils/displayText';
import { webUIText, useWebUIText, type WebUITextFormatter } from '../../../localization/WebUITextContext';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import { CourtPositionsPanel, FactionModifierCard, PolicyEntry } from './FactionOverviewShared';
import './FactionOverviewScreen.css';

function factionOverviewTabs(t: WebUITextFormatter) {
  return [
    { id: 'overview', label: t('FactionOverview.TabOverview') },
    { id: 'court', label: t('FactionOverview.TabCourt') },
    { id: 'rulers', label: t('FactionOverview.TabRulers') },
  ];
}

function fmtNum(value: number | undefined): string {
  return formatNumber(value);
}

function fmtFull(value: number | undefined): string {
  return formatNumber(value);
}

function fmtSigned(value: number | undefined): string {
  return formatSignedNumber(value);
}

function useIncomeBreakdown(): GetIncomeBreakdownResponse | null {
  return useBridgeQuery({
    action: 'game.get_income_breakdown',
    map: data => data,
  });
}

function getIncomeTotals(income: GetIncomeBreakdownResponse | null, faction: Faction | null) {
  const incomeTotal = income?.incomeTotal ?? faction?.income ?? 0;
  const expenseTotal = income?.expenseTotal ?? 0;
  const net = income?.netIncome ?? faction?.income ?? 0;
  return { incomeTotal, expenseTotal, net };
}

function firstPlainLine(lines: FactionInteractionView['descriptionLines'], fallback: string | null | undefined): string {
  const structured = displayTextToPlain(lines);
  const source = structured || fallback || '';
  return source
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean) ?? '';
}

function edictTooltip(edict: FactionInteractionView, factionId: string, t: WebUITextFormatter): TooltipContent {
  const edictBureaucraticLoad = edict.bureaucraticLoad;
  const throughputLine = bureaucraticTooltipLine(edictBureaucraticLoad);
  const description = firstPlainLine(edict.descriptionLines, edict.description);
  const lines: TooltipLine[] = [
    { label: t('Common.Cost'), value: edict.goldCost > 0 ? fmtFull(edict.goldCost) : t('Common.Free'), valueIcon: edict.goldCost > 0 ? '/assets/icons/I_Coins.png' : undefined },
    { label: t('Common.Duration'), value: `${edict.durationDays} ${t(edict.durationDays === 1 ? 'Common.Day' : 'Common.Days')}` },
    ...(throughputLine ? [throughputLine] : []),
  ];

  if (edict.cooldownDays > 0) {
    lines.push({ label: t('FactionOverview.Cooldown'), value: `${edict.cooldownDays} ${t(edict.cooldownDays === 1 ? 'Common.Day' : 'Common.Days')}` });
  }
  if (edict.reasons.length > 0) {
    lines.push({ label: t('FactionOverview.Unavailable'), isHeader: true });
    for (const reason of edict.reasons) {
      lines.push({ label: reason.reason });
    }
  }

  return {
    title: edict.name,
    body: description,
    lines,
    afterLines: edict.inProgress ? (
      <BureaucraticRushTooltipAction
        actionId={`edict:${edict.id}`}
        targetFactionId={factionId}
        daysSaved={edict.bureaucraticRushDaysSaved}
        overloadLoad={edict.bureaucraticRushLoad}
      />
    ) : undefined,
  };
}

function StatCell({
  icon,
  label,
  value,
  delta,
  deltaTone,
  tooltip,
  className = '',
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'positive' | 'negative' | 'muted';
  tooltip: TooltipContent;
  className?: string;
  tone?: 'gold' | 'positive' | 'negative';
}) {
  const valueClass = `fov-stat-val${tone ? ` fov-stat-val--${tone}` : ''}${delta ? ' fov-stat-val--has-delta' : ''}`;
  const deltaClass = deltaTone ? `fov-stat-delta fov-stat-delta--${deltaTone}` : 'fov-stat-delta';
  return (
    <Tooltip content={tooltip} delay={200}>
      <div className={`fov-stat${className ? ` ${className}` : ''}`}>
        <img className="fov-stat-icon" src={icon} alt="" draggable={false} />
        <div className="fov-stat-copy">
          <span className="fov-stat-label">{label}</span>
          <span className={valueClass}>
            <span className="fov-stat-main">{value}</span>
            {delta ? <span className={deltaClass}>{delta}</span> : null}
          </span>
        </div>
      </div>
    </Tooltip>
  );
}

function populationGrowthLines(
  sources: Faction['populationGrowthBreakdown'] | undefined,
): TooltipLine[] {
  if (!sources || sources.length === 0) return [];
  const sorted = [...sources].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return sorted.map(source => {
    const rounded = Math.round(source.value);
    return {
      label: source.name,
      value: formatSignedNumber(rounded),
      valueColor: rounded > 0 ? 'var(--green)' : rounded < 0 ? 'var(--red)' : 'var(--text-muted)',
    };
  });
}

function buildPopulationTooltip(faction: Faction, t: WebUITextFormatter): TooltipContent {
  const monthlyChange = faction.populationMonthlyChange ?? 0;
  const directPopulation = faction.directPopulation ?? faction.population;
  const subjectPopulation = faction.subjectPopulation ?? 0;
  const subjectSettlements = faction.subjectSettlements ?? 0;
  const lines: TooltipLine[] = [
    {
      label: t('FactionOverview.PopulationDirect'),
      value: fmtFull(directPopulation),
    },
  ];

  if (subjectPopulation > 0 || subjectSettlements > 0 || (faction.vassalCount ?? 0) > 0) {
    lines.push({
      label: t('FactionOverview.PopulationSubjects'),
      value: fmtFull(subjectPopulation),
    });
    if (subjectSettlements > 0) {
      lines.push({
        label: t('FactionOverview.SubjectSettlements'),
        value: fmtFull(subjectSettlements),
      });
    }
  }

  const growthLines = populationGrowthLines(faction.populationGrowthBreakdown);
  if (growthLines.length > 0) {
    lines.push({ label: t('FactionOverview.PopulationMonthlyChange'), isHeader: true });
    lines.push(...growthLines);
  }

  return {
    title: t('Common.Population'),
    body: t('FactionOverview.PopulationTooltipBody', {
      Total: fmtFull(faction.population),
      Change: fmtSigned(monthlyChange),
    }),
    lines,
  };
}

function FactionHeader({
  faction,
  onOpenCharacter,
}: {
  faction: Faction;
  onOpenCharacter: (id: string) => void;
}) {
  const t = useWebUIText();
  return (
    <div className="fov-header-row">
      <div className="fov-faction-header">
        <FactionTooltip data={{
          id: faction.id,
          name: faction.name,
          rulerName: faction.rulerName,
          culture: faction.culture,
          cultureInfo: faction.cultureInfo,
          religion: faction.religion,
          religionInfo: faction.religionInfo,
          capital: faction.capital,
          population: faction.population,
          settlements: faction.settlements,
          armies: faction.armyCount,
          vassals: faction.vassalCount,
          income: faction.income,
          gold: faction.gold,
        }} delay={150}>
          <FactionRoundel
            factionId={faction.id}
            colour={faction.colour}
            secondaryColour={faction.secondaryColour}
            cultureGroup={faction.cultureGroup}
            emblem={faction.emblem}
            name={faction.name}
            size="lg"
            showRing
          />
        </FactionTooltip>
        <Portrait
          personId={faction.rulerId}
          src={faction.rulerPortrait}
          layers={faction.rulerPortraitLayers}
          name={faction.rulerName}
          size="xl"
          onClick={() => faction.rulerId && onOpenCharacter(faction.rulerId)}
        />
        <div className="fov-faction-info">
          <div className="fov-ruler-row">
            <button
              type="button"
              className="fov-current-ruler-name"
              onMouseDown={() => faction.rulerId && onOpenCharacter(faction.rulerId)}
            >
              {faction.rulerName || t('FactionOverview.NoRuler')}
            </button>
          </div>
          <div className="fov-identity-row">
            <CultureTooltip info={faction.cultureInfo} fallbackName={faction.culture} fallbackId={faction.cultureId}>
              <span className="fov-identity-item">
                <img
                  className="fov-identity-icon"
                  src={cultureIconPath(faction.cultureId || faction.cultureInfo?.id)}
                  alt=""
                  draggable={false}
                />
                {faction.culture || t('FactionOverview.NoCulture')}
              </span>
            </CultureTooltip>
            <ReligionTooltip info={faction.religionInfo} fallbackName={faction.religion} fallbackId={faction.religionId}>
              <span className="fov-identity-item">
                <img className="fov-identity-icon" src="/assets/icons/I_Religions.png" alt="" draggable={false} />
                {faction.religion || t('FactionOverview.NoReligion')}
              </span>
            </ReligionTooltip>
            <GovernmentTooltip
              government={faction.government}
              displayName={faction.governmentDisplayName}
              description={faction.governmentDescription}
              capabilities={faction.governmentCapabilities}
            >
              <span className="fov-identity-item">
                <img className="fov-identity-icon" src="/assets/icons/I_Domain.png" alt="" draggable={false} />
                {faction.governmentDisplayName || faction.government || t('MainMenu.Government')}
              </span>
            </GovernmentTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsBar({ faction }: { faction: Faction }) {
  const t = useWebUIText();
  const monthlyChange = faction.populationMonthlyChange ?? 0;
  const populationDelta = monthlyChange === 0
    ? undefined
    : t('FactionOverview.PopulationDelta', { Change: fmtSigned(monthlyChange) });
  const populationDeltaTone = monthlyChange > 0 ? 'positive' : monthlyChange < 0 ? 'negative' : 'muted';

  return (
    <div className="fov-stats-bar">
      <StatCell icon="/assets/icons/I_Domain.png" label={t('Economy.Settlements')} value={fmtFull(faction.settlements)} tooltip={{ title: t('Economy.Settlements'), body: t('FactionOverview.SettlementsTooltip') }} />
      <StatCell
        icon="/assets/icons/I_Population.png"
        label={t('Common.Population')}
        value={fmtNum(faction.population)}
        delta={populationDelta}
        deltaTone={populationDeltaTone}
        tooltip={buildPopulationTooltip(faction, t)}
      />
      <StatCell icon="/assets/icons/I_ArmiesQuickButton.png" label={t('FactionOverview.ArmyStrength')} value={fmtNum(faction.strength)} tooltip={{ title: t('FactionOverview.ArmyStrength'), body: t('FactionOverview.ArmyStrengthTooltip') }} />
      <StatCell icon="/assets/icons/I_Capital.png" label={t('FactionOverview.Capital')} value={faction.capital || t('Common.None')} tooltip={{ title: t('FactionOverview.Capital'), body: faction.capital || t('Common.None') }} />
    </div>
  );
}

function SuccessionStrip({
  familyTree,
  onOpenCharacter,
  onAssignHeir,
}: {
  familyTree: FamilyTreeData | null;
  onOpenCharacter: (id: string) => void;
  onAssignHeir: () => void;
}) {
  const t = useWebUIText();
  const people = useMemo(() => {
    const map = new Map<string, FamilyTreePerson>();
    for (const person of familyTree?.nodes ?? []) map.set(person.id, person);
    return map;
  }, [familyTree]);

  const designated = familyTree?.designatedHeirId ? people.get(familyTree.designatedHeirId) : undefined;
  const heir = familyTree?.heirId ? people.get(familyTree.heirId) : undefined;
  const successor = designated
    ?? heir
    ?? familyTree?.groups.succession.map(id => people.get(id)).find((person): person is FamilyTreePerson => Boolean(person))
    ?? null;
  const line = (familyTree?.groups.succession ?? []).map(id => people.get(id)).filter(Boolean) as FamilyTreePerson[];

  const tooltip: TooltipContent = {
    title: successor?.name ?? t('FactionOverview.NoSuccessor'),
    body: successor?.isDesignatedHeir ? t('FactionOverview.DesignatedHeirBody') : t('FactionOverview.LikelySuccessorBody'),
    lines: [
      ...(successor ? [
        { label: t('Common.Relation'), value: successor.relationToRuler || t('Common.Court') },
        { label: t('Common.Age'), value: formatNumber(successor.age) },
      ] : []),
      ...(line.length > 0 ? [{ label: t('FactionOverview.LineOfSuccession'), isHeader: true }] : []),
      ...line.slice(0, 5).map((person, i) => ({ label: `#${i + 1} ${person.relationToRuler || person.shortTitle}`, value: person.name })),
    ],
  };

  return (
    <div className="fov-succession-heir">
      <Tooltip content={tooltip} delay={200} variant="sidebar">
        <div className="fov-succession-main" onMouseDown={() => successor && onOpenCharacter(successor.id)}>
          <Portrait
            personId={successor?.id}
            src={successor?.portrait}
            name={successor?.name ?? t('FactionOverview.NoSuccessor')}
            size="lg"
            activity={successor?.activity}
            isRuler={successor?.isRuler}
            isHeir={successor?.isHeir}
            isDesignatedHeir={successor?.isDesignatedHeir}
            isPreviousRuler={successor?.isPreviousRuler}
          />
          <div className="fov-succession-info">
            <div className="fov-succession-title">{successor?.isDesignatedHeir ? t('FactionOverview.DesignatedHeir') : t('FactionOverview.LikelySuccessor')}</div>
            <div className="fov-succession-name">{successor?.name ?? t('Common.None')}</div>
            <div className="fov-succession-law">{successor?.relationToRuler || t('FactionOverview.SuccessionUnavailable')}</div>
          </div>
        </div>
      </Tooltip>
      <button type="button" className="fov-succession-assign" onMouseDown={onAssignHeir}>
        {t('Common.Assign')}
      </button>
    </div>
  );
}

function OverviewTab({
  faction,
  totals,
  familyTree,
  edictsPending,
  edicts,
  interactionsState,
  interactionsActive,
  onStartEdict,
  onCancelEdict,
  onOpenCharacter,
  onAssignHeir,
}: {
  faction: Faction;
  totals: ReturnType<typeof getIncomeTotals>;
  familyTree: FamilyTreeData | null;
  edictsPending: boolean;
  edicts: FactionInteractionView[];
  interactionsState: FactionInteractionsState | null;
  interactionsActive: boolean;
  onStartEdict: (id: string) => void;
  onCancelEdict: () => void;
  onOpenCharacter: (id: string) => void;
  onAssignHeir: () => void;
}) {
  const t = useWebUIText();

  return (
    <div className="fov-wrap">
      <div className="fov-overview-summary">
        <div className="fov-overview-identity-row">
          <div className="fov-overview-primary">
            <FactionHeader faction={faction} onOpenCharacter={onOpenCharacter} />
          </div>
          {!faction.generatesLeaderOnSuccession && (
            <div className="fov-overview-heir">
              <SuccessionStrip familyTree={familyTree} onOpenCharacter={onOpenCharacter} onAssignHeir={onAssignHeir} />
            </div>
          )}
        </div>

        <div className="fov-overview-metrics-row">
          <div className="fov-finance-summary fov-metric-panel">
            <div className="fov-finance-top-row">
              <div className="fov-finance-primary">
                <span className="fov-detail-label">{t('Common.Treasury')}</span>
                <span className="fov-finance-treasury-value">{fmtFull(faction.gold)}</span>
              </div>
              <div className="fov-finance-primary">
                <span className="fov-detail-label">{t('FactionOverview.Net')}</span>
                <span className={`fov-finance-net-value ${totals.net >= 0 ? 'info-value--positive' : 'info-value--negative'}`}>{fmtSigned(totals.net)}</span>
              </div>
            </div>
            <div className="fov-finance-breakdown">
              <div className="info-row"><span className="info-label">{t('FactionOverview.Income')}</span><span className="info-value info-value--positive">+{fmtFull(totals.incomeTotal)}</span></div>
              <div className="info-row"><span className="info-label">{t('FactionOverview.Expenses')}</span><span className="info-value info-value--negative">-{fmtFull(totals.expenseTotal)}</span></div>
            </div>
          </div>
          <StatsBar faction={faction} />
        </div>
      </div>

      <SectionHeading variant="ornate" title={t('FactionOverview.Modifiers')} />
      <div className="fov-modifier-grid">
        {faction.modifiers.length === 0 ? (
          <div className="fov-empty-state">{t('FactionOverview.NoActiveModifiers')}</div>
        ) : faction.modifiers.map(modifier => (
          <FactionModifierCard key={modifier.key} modifier={modifier} />
        ))}
      </div>

      <div className="fov-policies-layout" data-tutorial-target="FactionPolicies PoliciesTabButton">
        <div className="fov-policies-col">
          <SectionHeading variant="ornate" title={t('FactionOverview.Policies')} />
          <div className="fov-policies-list">
            {faction.policies.length === 0 ? (
              <div className="fov-empty-state">{t('FactionOverview.NoPolicies')}</div>
            ) : faction.policies.map(policy => (
              <PolicyEntry
                key={policy.id}
                factionId={faction.id}
                policy={policy}
                blockedByInteraction={interactionsActive && !policy.inProgress}
              />
            ))}
          </div>
        </div>
        <div className="fov-policies-col">
          <SectionHeading variant="ornate" title={t('FactionOverview.Edicts')} />
          <div className="fov-edicts-list">
            {edictsPending ? null : edicts.length === 0 ? (
              <div className="fov-empty-state">{t('FactionOverview.NoEdicts')}</div>
            ) : edicts.map(edict => {
              const canStart = edict.availability === 'available' && !edict.inProgress && edict.cooldownRemainingDays <= 0;
              const matchesOutcome = interactionsState?.lastCompletedInteractionId === edict.id;
              const outcome: 'success' | 'failure' | undefined = matchesOutcome
                ? interactionsState!.lastInteractionSucceeded ? 'success' : 'failure'
                : undefined;
              const outcomeKey = matchesOutcome
                ? `${interactionsState!.lastInteractionCompletedDate}:${edict.id}`
                : undefined;
              return (
                <Tooltip key={edict.id} content={edictTooltip(edict, faction.id, t)} position="left" delay={150} bubbleClassName="fov-tooltip-bubble">
                    <InteractionCard
                    title={edict.name}
                    description={firstPlainLine(edict.descriptionLines, edict.description)}
                    image={edict.iconUrl}
                    bgImage={edict.backgroundUrl}
                    cooldown={edict.goldCost > 0 ? t('FactionOverview.GoldCost', { Amount: fmtFull(edict.goldCost) }) : undefined}
                    durationDays={edict.durationDays}
                    inProgress={edict.inProgress}
                    remainingDays={edict.remainingDays}
                    cooldownDays={edict.cooldownDays}
                    cooldownRemainingDays={edict.cooldownRemainingDays}
                    outcome={outcome}
                    outcomeText={matchesOutcome ? interactionsState!.lastInteractionOutcomeText : undefined}
                    outcomeKey={outcomeKey}
                    tutorialTarget={`Interaction:${edict.id}${edict.id === 'grandfestival' ? ' GrandFestivalButton' : ''}`}
                    meta={<BureaucraticInlineValue value={edict.bureaucraticLoad} compact />}
                    onClick={canStart ? () => onStartEdict(edict.id) : undefined}
                    onCancel={edict.inProgress ? onCancelEdict : undefined}
                  />
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RulerEntry({
  person,
  isCurrent,
  onOpenCharacter,
}: {
  person: FamilyTreePerson;
  isCurrent: boolean;
  onOpenCharacter: (id: string) => void;
}) {
  const t = useWebUIText();
  const tooltip: TooltipContent = {
    title: person.name,
    body: person.title,
    lines: [
      { label: t('Common.Age'), value: formatNumber(person.age) },
      { label: t('Common.Relation'), value: person.relationToRuler || t('Common.Court') },
      { label: t('Common.Fame'), value: fmtFull(person.fame), valueColor: 'var(--gold)' },
      { label: t('Common.Status'), value: isCurrent ? t('FactionOverview.CurrentRuler') : person.isAlive ? t('Common.Living') : t('FactionOverview.FormerRuler') },
    ],
  };

  return (
    <Tooltip content={tooltip} delay={200} variant="sidebar">
      <div className="fov-ruler-entry" onMouseDown={() => onOpenCharacter(person.id)}>
        <div className="fov-ruler-portrait-col">
          <Portrait
            personId={person.id}
            src={person.portrait}
            layers={person.portraitLayers}
            name={person.name}
            isAlive={person.isAlive}
            size="lg"
            activity={person.activity}
            isRuler={person.isRuler}
            isHeir={person.isHeir}
            isDesignatedHeir={person.isDesignatedHeir}
            isPreviousRuler={person.isPreviousRuler}
          />
        </div>
        <div className="fov-ruler-info">
          <div className="fov-ruler-name">
            {person.name}
            {isCurrent && <Badge text={t('Common.Current')} colour="var(--gold)" />}
          </div>
          <div className="fov-ruler-reign">{person.title || person.shortTitle || t('FactionOverview.Ruler')}</div>
          <div className="fov-ruler-death">{person.isAlive ? formatPersonActivity(person.activity) || t('Common.Living') : t('Common.Deceased')}</div>
          <div className="fov-ruler-achievements">
            {person.culture && <div className="fov-ruler-achievement">{person.culture}</div>}
            {person.religion && <div className="fov-ruler-achievement">{person.religion}</div>}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

function RulersTab({
  familyTree,
  pending,
  onOpenCharacter,
}: {
  familyTree: FamilyTreeData | null;
  pending: boolean;
  onOpenCharacter: (id: string) => void;
}) {
  const t = useWebUIText();
  const people = useMemo(() => {
    const map = new Map<string, FamilyTreePerson>();
    for (const person of familyTree?.nodes ?? []) map.set(person.id, person);
    return map;
  }, [familyTree]);

  const rulers = useMemo(() => {
    const result: FamilyTreePerson[] = [];
    const current = familyTree?.rulerId ? people.get(familyTree.rulerId) : undefined;
    if (current) result.push(current);
    const previousRulerIds = familyTree?.groups.previousRulers ?? [];
    for (let index = previousRulerIds.length - 1; index >= 0; index -= 1) {
      const id = previousRulerIds[index];
      const person = people.get(id);
      if (person && !result.find(existing => existing.id === person.id)) result.push(person);
    }
    return result;
  }, [familyTree, people]);

  return (
    <div className="fov-wrap">
      <SectionHeading variant="ornate" title={t('FactionOverview.RulerHistory')} />
      {pending ? null : rulers.length === 0 ? (
        <div className="fov-empty-state">{t('FactionOverview.NoRulerHistory')}</div>
      ) : (
        <div className="fov-rulers-timeline">
          {rulers.map(person => (
            <RulerEntry
              key={person.id}
              person={person}
              isCurrent={person.id === familyTree?.rulerId}
              onOpenCharacter={onOpenCharacter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function factionOverviewTabFromScreenId(screenId: string | null): string {
  const normalised = (screenId ?? '').toLowerCase();
  if (normalised === 'court' || normalised === 'imperialcourt') return 'court';
  if (normalised === 'rulers' || normalised === 'history') return 'rulers';
  return 'overview';
}

export default function FactionOverviewScreen({ screenId, onClose }: { screenId: string | null; onClose: () => void }) {
  const t = useWebUIText();
  const [activeTab, setActiveTab] = useState(() => factionOverviewTabFromScreenId(screenId));
  useEffect(() => {
    setActiveTab(factionOverviewTabFromScreenId(screenId));
  }, [screenId]);
  const [heirModalOpen, setHeirModalOpen] = useState(false);
  const playerFaction = usePlayerFactionSummaryBridgeState();
  const playerFactionId = playerFaction.summary?.id ?? null;
  const factionState = useFactionBridgeState(playerFactionId, 'overview');
  const faction = factionState.faction;
  const income = useIncomeBreakdown();
  const familyTreeState = useFamilyTreeBridgeState(undefined, activeTab === 'rulers' ? 'history' : 'succession');
  const familyTree = familyTreeState.familyTree;
  const interactions = useFactionInteractionsBridge(playerFactionId);
  const { openSidebar } = useGameActions();

  const totals = getIncomeTotals(income, faction);
  const edicts = useMemo(
    () => (interactions.state?.interactions ?? []).filter(interaction => interaction.isEdict && interaction.name.trim()),
    [interactions.state],
  );
  const interactionsActive = useMemo(
    () => Boolean(interactions.state?.interactions.some(interaction => interaction.inProgress)),
    [interactions.state],
  );

  const openCharacter = useCallback((id: string) => {
    if (id) openSidebar('character', id);
  }, [openSidebar]);

  const startEdict = useCallback((id: string) => {
    interactions.start(id);
  }, [interactions]);

  const cancelEdict = useCallback(() => {
    interactions.cancel();
  }, [interactions]);

  const content = faction ? (() => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            faction={faction}
            totals={totals}
            familyTree={familyTree}
            edictsPending={interactions.pending}
            edicts={edicts}
            interactionsState={interactions.state}
            interactionsActive={interactionsActive}
            onStartEdict={startEdict}
            onCancelEdict={cancelEdict}
            onOpenCharacter={openCharacter}
            onAssignHeir={() => setHeirModalOpen(true)}
          />
        );
      case 'court':
        return <CourtPositionsPanel enabled={activeTab === 'court'} onOpenCharacter={openCharacter} />;
      case 'rulers':
        return <RulersTab familyTree={familyTree} pending={familyTreeState.pending} onOpenCharacter={openCharacter} />;
      default:
        return null;
    }
  })() : playerFaction.pending || factionState.pending ? null : (
    <div className="fov-wrap">
      <div className="fov-empty-state">{t('FactionOverview.NoPlayerFactionData')}</div>
    </div>
  );

  return (
    <>
      <ScreenShell
        title={t('FactionOverview.ScreenTitle')}
        onClose={onClose}
        advisorTopic="factionOverviewScreen"
        tabs={<SidebarTabBar tabs={factionOverviewTabs(t)} activeTab={activeTab} onTabChange={setActiveTab} />}
        styledScrollContent
      >
        {content}
      </ScreenShell>
      {!faction?.generatesLeaderOnSuccession && (
        <HeirAssignmentModal
          open={heirModalOpen}
          currentHeirId={familyTree?.heirId || undefined}
          currentDesignatedHeirId={familyTree?.designatedHeirId || undefined}
          onClose={() => setHeirModalOpen(false)}
          onOpenCharacter={openCharacter}
        />
      )}
    </>
  );
}

registerTopbarButton({
  id: 'faction',
  get label() { return webUIText('Topbar.Faction'); },
  labelKey: 'Topbar.Faction',
  icon: '/assets/icons/I_IndependentFactions.png',
  order: 10,
  factionMode: 'all',
});
registerScreen({
  id: 'factionOverview',
  render: ({ screenId, onClose }) => <FactionOverviewScreen screenId={screenId} onClose={onClose} />,
  topbarId: 'faction',
  advisorTopic: 'factionOverviewScreen',
  bridgeNames: ['factionoverview', 'faction'],
  factionMode: 'independent',
});
