import FoederatiPoliticsPanel from './FoederatiPoliticsPanel';
import { startTransition } from 'react';
import FactionEdictEntry from './FactionEdictEntry';
import TribalSuccessionPanel from './TribalSuccessionPanel';
import ConfederationPanel from './ConfederationPanel';
import { useConfederationData } from './confederationData';
import EntityLink from '../../common/entities/EntityLink';
import { buildIncomeTooltip } from '../../topbar/IncomeBreakdownDetails';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import Portrait from '../../common/portraits/Portrait';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import CultureLink from '../../common/culture/CultureLink';
import GovernmentTooltip from '../../common/tooltips/GovernmentTooltip';
import ReligionLink from '../../common/religion/ReligionLink';
import { cultureIconPath } from '../../../utils/cultureIcons';
import { religionIconPath } from '../../../utils/religionIcons';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import Badge from '../../common/data-display/stats/Badge';
import HeirAssignmentModal from '../../modals/characters/HeirAssignmentModal';
import { useGameActions } from '../../../context/GameContext';
import { usePlayerFactionSummaryBridgeState } from '../../../bridge/app/usePlayerFactionBridge';
import {
  useFactionInteractionsBridge,
  type FactionInteractionsState,
  type FactionInteractionView,
} from '../../../bridge/diplomacy/useFactionInteractionsBridge';
import { useFactionBridgeState } from '../../../bridge/diplomacy/useFactionBridge';
import { useCultureDevelopmentBridge } from '../../../bridge/culture/useCultureDevelopmentBridge';
import { cultureDevelopmentTooltipFooter, cultureDevelopmentTooltipLines } from '../../common/culture/cultureDevelopmentTooltip';
import { useFamilyTreeBridgeState, type FamilyTreeData, type FamilyTreePerson } from '../../../bridge/characters/useCharactersBridge';
import { useBridgeQuery } from '../../../bridge/core/useBridgeQuery';
import type { GetIncomeBreakdownResponse } from '../../../bridge-types.generated.ts';
import type { Faction } from '../../../data/types';
import { formatPersonActivity } from '../../../utils/displayLabels';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { webUIText, useWebUIText, type WebUITextFormatter } from '../../../localization/WebUITextContext';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import { CourtPositionsPanel, FactionModifierCard, PolicyEntry } from './FactionOverviewShared';
import './FactionOverviewScreen.css';

function factionOverviewTabs(t: WebUITextFormatter, hasCourt: boolean, courtTitle?: string) {
  return [
    { id: 'overview', label: t('FactionOverview.TabOverview') },
    ...(hasCourt ? [{ id: 'court', label: courtTitle || t('FactionOverview.TabCourt') }] : []),
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

function StatCell({ icon, label, value, delta, deltaTone, tooltip, tone }: {
  icon: string; label: string; value: string; delta?: string;
  deltaTone?: 'positive' | 'negative' | 'muted';
  tooltip?: TooltipContent; tone?: 'gold' | 'positive' | 'negative';
}) {
  return (
    <Tooltip content={tooltip} delay={200}>
      <div className="fov-stat" tabIndex={0}>
        <img className="fov-stat-icon" src={icon} alt="" draggable={false} />
        <span className="fov-stat-copy">
          <span className="fov-stat-label">{label}</span>
          <span className={`fov-stat-val${tone ? ` fov-stat-val--${tone}` : ''}`}>
            <span className="fov-stat-main">{value}</span>
            {delta && <span className={`fov-stat-delta fov-stat-delta--${deltaTone}`}>{delta}</span>}
          </span>
        </span>
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
  const lines: TooltipLine[] = [];

  if (subjectPopulation > 0 || subjectSettlements > 0 || (faction.vassalCount ?? 0) > 0) {
    lines.push({
      label: t('FactionOverview.PopulationDirect'),
      value: fmtFull(directPopulation),
    });
    lines.push({
      label: t('FactionOverview.PopulationSubjects'),
      value: fmtFull(subjectPopulation),
    });
  }

  const growthLines = populationGrowthLines(faction.populationGrowthBreakdown);
  if (growthLines.length > 0) {
    lines.push({ label: t('FactionOverview.PopulationMonthlyChange'), value: fmtSigned(monthlyChange), isHeader: true });
    lines.push(...growthLines);
  }

  return {
    title: t('Common.Population'),
    body: t('FactionOverview.PopulationTooltipBody'),
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
          cultureId: faction.cultureId,
          cultureInfo: faction.cultureInfo,
          religion: faction.religion,
          religionId: faction.religionId,
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
            diplomaticStatus={faction.diplomaticStatus}
            subjectSubtype={faction.subjectSubtype}
            isPlayer={faction.isPlayer}
            isRebel={faction.isRebel}
          />
        </FactionTooltip>
        <Portrait
          personId={faction.rulerId}
          src={faction.rulerPortrait}
          layers={faction.rulerPortraitLayers}
          name={faction.rulerName}
          size={faction.realmProgress?.available ? 'lg' : 'xl'}
          onClick={() => faction.rulerId && onOpenCharacter(faction.rulerId)}
        />
        <div className="fov-faction-info">
          <div className="fov-ruler-row">
            <button
              type="button"
              className="fov-current-ruler-name"
              onClick={() => faction.rulerId && onOpenCharacter(faction.rulerId)}
            >
              {faction.rulerName || t('FactionOverview.NoRuler')}
            </button>
          </div>
          {faction.dominantCourtierName ? (
            <div className="fov-court-power">
              <button
                type="button"
                className="fov-current-ruler-name"
                onClick={() => faction.dominantCourtierId && onOpenCharacter(faction.dominantCourtierId)}
              >
                {t('FactionOverview.PowerBehindTheThrone')}: {faction.dominantCourtierName}
              </button>
              {faction.dominantCourtierParts && faction.dominantCourtierParts.length > 0 ? (
                <div className="fov-identity-row">{faction.dominantCourtierParts.join(', ')}</div>
              ) : null}
            </div>
          ) : faction.splitCourt ? (
            <div className="fov-court-power">{t('FactionOverview.ControlDivided')}</div>
          ) : null}
          <div className="fov-identity-row">
              <CultureLink info={faction.cultureInfo} cultureId={faction.cultureId || faction.cultureInfo?.id || ''} className="fov-identity-item">
                <img
                  className="fov-identity-icon"
                  src={cultureIconPath(faction.cultureInfo)}
                  alt=""
                  draggable={false}
                />
                {faction.culture || t('FactionOverview.NoCulture')}
              </CultureLink>
            <ReligionLink info={faction.religionInfo} religionId={faction.religionId || faction.religionInfo?.id || ''} className="fov-identity-item">
              <img className="fov-identity-icon" src={religionIconPath(faction.religionId || faction.religionInfo?.id)} alt="" draggable={false} />
              {faction.religion || t('FactionOverview.NoReligion')}
            </ReligionLink>
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

function StatsBar({ faction, totals, income }: {
  faction: Faction; totals: ReturnType<typeof getIncomeTotals>; income: GetIncomeBreakdownResponse | null;
}) {
  const t = useWebUIText();
  const monthlyChange = faction.populationMonthlyChange ?? 0;
  const incomeDetails: TooltipContent = income ? buildIncomeTooltip(income) : {
    lines: [
      { label: t('FactionOverview.Income'), value: fmtSigned(totals.incomeTotal) },
      { label: t('FactionOverview.Expenses'), value: fmtSigned(-totals.expenseTotal) },
    ],
  };
  const stats: { id: string; icon: string; label: string; value: string; tooltip?: TooltipContent; tone?: 'gold' | 'positive' | 'negative'; delta?: string; deltaTone?: 'positive' | 'negative' | 'muted' }[] = [
    { id: 'treasury', icon: '/assets/icons/I_Coins.png', label: t('Common.Treasury'), value: fmtFull(faction.gold), tone: 'gold', tooltip: incomeDetails },
    { id: 'net', icon: '/assets/icons/I_Coins.png', label: t('FactionOverview.Net'), value: fmtSigned(totals.net), tone: totals.net >= 0 ? 'positive' : 'negative', tooltip: incomeDetails },
    { id: 'settlements', icon: '/assets/icons/I_Domain.png', label: t('Economy.Settlements'), value: fmtFull(faction.settlements), tooltip: {
      body: t('FactionOverview.SettlementsTooltip'),
      lines: faction.settlementBreakdown.map(entry => ({ label: <EntityLink type="settlement" id={entry.id}>{entry.name}</EntityLink> })),
    } },
    { id: 'population', icon: '/assets/icons/I_Population.png', label: t('Common.Population'), value: fmtNum(faction.population),
      delta: monthlyChange === 0 ? undefined : t('FactionOverview.PopulationDelta', { Change: fmtSigned(monthlyChange) }),
      deltaTone: monthlyChange > 0 ? 'positive' : monthlyChange < 0 ? 'negative' : 'muted', tooltip: buildPopulationTooltip(faction, t) },
    { id: 'army', icon: '/assets/icons/I_ArmiesQuickButton.png', label: t('FactionOverview.ArmyStrength'), value: fmtNum(faction.strength), tooltip: {
      body: t('FactionOverview.ArmyStrengthTooltip'),
      lines: faction.strengthBreakdown.map(entry => ({ label: entry.name, value: formatNumber(entry.value) })),
    } },
    { id: 'capital', icon: '/assets/icons/I_Capital.png', label: t('FactionOverview.Capital'), value: faction.capital || t('Common.None') },
  ];
  return (
    <div className="fov-stats-section">
      <div className="fov-stats-bar">
        {stats.map(stat => <StatCell key={stat.id} {...stat} />)}
      </div>
    </div>
  );
}

function SuccessionStrip({
  familyTree,
  onOpenCharacter,
  onAssignHeir,
  compact = false,
}: {
  familyTree: FamilyTreeData | null;
  onOpenCharacter: (id: string) => void;
  onAssignHeir?: () => void;
  compact?: boolean;
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
    title: t(line.length > 0 ? 'FactionOverview.LineOfSuccession' : 'FactionOverview.NoSuccessor'),
    lines: [
      ...line.slice(0, 5).map((person, i) => ({ label: `#${i + 1} ${person.relationToRuler || person.shortTitle}`, value: person.name })),
    ],
  };

  return (
    <div className="fov-succession-heir">
      <Tooltip content={tooltip} delay={200} variant="sidebar">
        <div
          className="fov-succession-main"
          role={successor ? 'button' : undefined}
          tabIndex={successor ? 0 : undefined}
          onClick={() => successor && onOpenCharacter(successor.id)}
        >
          <Portrait
            personId={successor?.id}
            src={successor?.portrait}
            name={successor?.name ?? t('FactionOverview.NoSuccessor')}
            size={compact ? 'md' : 'lg'}
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
      {onAssignHeir && <button type="button" className="btn--outline fov-succession-assign" onClick={onAssignHeir}>
        {t('Common.Assign')}
      </button>}
    </div>
  );
}

function RealmProgress({ faction }: { faction: Faction }) {
  const progress = faction.realmProgress;
  const details = useCultureDevelopmentBridge(progress?.available ? faction.cultureId || null : null);
  if (!progress?.available) return null;
  const nextUnlock = details?.gates.find(gate => gate.isNext);
  const developmentTooltip: TooltipContent = {
    title: webUIText('CultureDevelopment.Development'),
    titleAccessory: <CultureLink cultureId={faction.cultureId || ''} showTooltip={false}>{faction.culture}</CultureLink>,
    body: webUIText('CultureDevelopment.Description'),
    lines: details ? cultureDevelopmentTooltipLines(details, webUIText, nextUnlock) : undefined,
    footer: details ? cultureDevelopmentTooltipFooter(webUIText, nextUnlock) : undefined,
  };
  return (
    <div className="fov-realm-progress">
      <Tooltip content={developmentTooltip} bubbleClassName="fov-development-tooltip" delay={150}>
        <div className="fov-realm-metric" tabIndex={0}><img src={cultureIconPath(faction.cultureInfo)} alt="" /><span>{webUIText('CultureDevelopment.Development')}</span><strong>{formatNumber(progress.development, { maximumFractionDigits: 1 })}</strong></div>
      </Tooltip>
      <Tooltip content={{
          title: webUIText('Realm.SettledLand'),
          body: progress.kingdomCitiesRequired > 0 ? webUIText('Realm.KingdomCities', { Count: formatNumber(progress.kingdomCitiesRequired) }) : undefined,
          lines: [{ label: webUIText('Realm.SettledLand'), value: formatNumber(progress.raisedCities) }, { label: webUIText('Economy.Settlements'), value: formatNumber(progress.provinces) }],
        }} delay={150}>
        <div className="fov-realm-metric" tabIndex={0}><img src="/assets/icons/I_Town_Metal.png" alt="" /><span>{webUIText('Realm.SettledLand')}</span><strong>{formatNumber(progress.raisedCities)} / {formatNumber(progress.provinces)}</strong></div>
      </Tooltip>
    </div>
  );
}

function OverviewTab({
  faction,
  totals,
  income,
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
  income: GetIncomeBreakdownResponse | null;
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
  const confederation = useConfederationData(faction.id);
  const succession = useBridgeQuery({ action: 'game.get_succession_forecast', map: data => data.forecast });
  const centralisation = faction.policies.find(policy => policy.id === 'centralisation');
  const policies = faction.policies.filter(policy => policy.id !== 'centralisation');

  return (
    <div className={`fov-wrap${faction.realmProgress?.available ? ' fov-wrap--warbands' : ''}`}>
      <div className="fov-overview-summary">
        <div className="fov-overview-identity-row">
          <div className="fov-overview-primary">
            <FactionHeader faction={faction} onOpenCharacter={onOpenCharacter} />
          </div>
          {!faction.generatesLeaderOnSuccession && !succession?.enabled && (
            <div className="fov-overview-heir">
              <SuccessionStrip familyTree={familyTree} onOpenCharacter={onOpenCharacter} onAssignHeir={faction.canAppointHeir ? onAssignHeir : undefined} compact={faction.realmProgress?.available} />
            </div>
          )}
        </div>

        <StatsBar faction={faction} totals={totals} income={income} />
      </div>
      {succession?.enabled && <TribalSuccessionPanel data={succession} />}
      <ConfederationPanel data={confederation} />
      <RealmProgress faction={faction} />
      <div className="fov-policies-layout" data-tutorial-target="FactionPolicies PoliciesTabButton">
        <div className="fov-policies-col">
          <SectionHeading variant="ornate" title={t('FactionOverview.Policies')} />
          <div className="fov-policies-list">
            <FoederatiPoliticsPanel factionId={faction.id} factionName={faction.name} data={faction.foederatiPolitics} />
            {!centralisation && policies.length === 0 ? (
              faction.foederatiPolitics?.enabled ? null : <div className="fov-empty-state">{t('FactionOverview.NoPolicies')}</div>
            ) : (
              <>
                {centralisation && (
                  <PolicyEntry
                    key={centralisation.id}
                    factionId={faction.id}
                    policy={centralisation}
                    blockedByInteraction={interactionsActive && !centralisation.inProgress}
                    featured
                  />
                )}
                {policies.map(policy => (
                  <PolicyEntry
                    key={policy.id}
                    factionId={faction.id}
                    policy={policy}
                    blockedByInteraction={interactionsActive && !policy.inProgress}
                  />
                ))}
              </>
            )}
          </div>
        </div>
        <div className="fov-policies-col">
          <SectionHeading variant="ornate" title={t('FactionOverview.Edicts')} />
          <div className="fov-edicts-list">
            {edictsPending ? null : edicts.length === 0 ? (
              <div className="fov-empty-state">{t('FactionOverview.NoEdicts')}</div>
            ) : edicts.map(edict => (
              <FactionEdictEntry key={edict.id} confederation={confederation} edict={edict} factionId={faction.id} interactionsState={interactionsState} onStart={onStartEdict} onCancel={onCancelEdict} />
            ))}
          </div>
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
      <div className="fov-ruler-entry" onClick={() => onOpenCharacter(person.id)}>
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
    startTransition(() => setActiveTab(factionOverviewTabFromScreenId(screenId)));
  }, [screenId]);
  const [heirModalOpen, setHeirModalOpen] = useState(false);
  const playerFaction = usePlayerFactionSummaryBridgeState(true);
  const playerFactionId = playerFaction.summary?.id ?? null;
  const hasCourt = playerFaction.summary?.hasImperialCourt === true;
  const selectedTab = activeTab === 'court' && !hasCourt ? 'overview' : activeTab;
  const factionState = useFactionBridgeState(playerFactionId, 'overview', true, true);
  const faction = factionState.faction;
  const income = useIncomeBreakdown();
  const familyTreeState = useFamilyTreeBridgeState(undefined, activeTab === 'rulers' ? 'history' : 'succession', true, true);
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
    switch (selectedTab) {
      case 'overview':
        return (
          <OverviewTab
            faction={faction}
            totals={totals}
            income={income}
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
        return <CourtPositionsPanel suspend enabled={activeTab === 'court'} onOpenCharacter={openCharacter} />;
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
        tabs={<SidebarTabBar tabs={factionOverviewTabs(t, hasCourt, playerFaction.summary?.courtTitle)} activeTab={selectedTab} onTabChange={setActiveTab} />}
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
