import { useState } from 'react';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import FactionRoundel from '../../common/entities/FactionRoundel';
import Tooltip from '../../common/tooltips/Tooltip';
import GameButton from '../../common/buttons/GameButton';
import GrittyPieChart from '../../screens/charts/GrittyPieChart';
import DemographicHistoryModal from '../../modals/diplomacy/DemographicHistoryModal';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { cultureIconPath } from '../../../utils/cultureIcons';
import { religionIconPath } from '../../../utils/religionIcons';
import type { Faction, FactionDemographicShare, FactionSubjectDemographics } from '../../../data/types';
import { useGameActions } from '../../../context/GameContext';
import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import './DiplomacyDemographicsPanel.css';

type MakeupKind = 'culture' | 'religion';

function sortShares(shares: FactionDemographicShare[]): FactionDemographicShare[] {
  return [...shares].sort((a, b) => {
    const byPeople = b.population - a.population;
    if (byPeople !== 0) return byPeople;
    return a.name.localeCompare(b.name);
  });
}

function shareTotal(shares: FactionDemographicShare[]): number {
  return shares.reduce((sum, share) => sum + share.population, 0);
}

function toSegments(shares: FactionDemographicShare[]) {
  return sortShares(shares).map(share => ({
    label: share.name,
    value: share.population,
    colour: share.colour,
    tooltipLines: [{
      label: webUIText('Auto.ComponentsSidebarsDiplomacySidebar.454.6'),
      value: formatNumber(share.population),
    }],
  }));
}

function MakeupLegend({ shares, kind }: { shares: FactionDemographicShare[]; kind: MakeupKind }) {
  const total = shareTotal(shares);
  return (
    <div className="diplo-demo-legend">
      {sortShares(shares).map(share => {
        const percent = total > 0 ? (share.population / total) * 100 : 0;
        const icon = kind === 'culture' ? cultureIconPath(share.iconId) : religionIconPath(share.id);
        const body = (
          <>
            {icon ? <img src={icon} alt="" className="diplo-demo-legend-icon" /> : <span className="diplo-demo-legend-dot" style={{ backgroundColor: share.colour }} />}
            <span className="diplo-demo-legend-name">{share.name}</span>
            <span className="diplo-demo-legend-pct">{formatPercent(percent)}</span>
          </>
        );
        return (
          <Tooltip
            key={share.id}
            wrapperClassName="diplo-demo-legend-item"
            content={{
              title: share.name,
              body: share.description,
              lines: [{
                label: webUIText('Auto.ComponentsSidebarsDiplomacySidebar.454.6'),
                value: formatNumber(share.population),
              }],
            }}
          >
            {body}
          </Tooltip>
        );
      })}
    </div>
  );
}

function HistoryButton({ onClick }: { onClick: () => void }) {
  return (
    <GameButton
      variant="outline"
      icon="/assets/icons/I_Chart.png"
      className="diplo-demo-history-button"
      onClick={onClick}
    >
      {webUIText('DiplomacySidebar.DemographicHistory')}
    </GameButton>
  );
}

function MakeupChart({
  title,
  shares,
  kind,
  size = 110,
  onHistory,
}: {
  title: string;
  shares: FactionDemographicShare[];
  kind: MakeupKind;
  size?: number;
  onHistory: () => void;
}) {
  if (shares.length === 0) return null;
  return (
    <div className="diplo-demo-block">
      <div className="diplo-demo-heading-with-action">
        <SectionHeading variant="ornate" title={title} />
        <HistoryButton onClick={onHistory} />
      </div>
      <div className="diplo-demo-chart">
        <GrittyPieChart segments={toSegments(shares)} size={size} />
        <MakeupLegend shares={shares} kind={kind} />
      </div>
    </div>
  );
}

function SubjectMakeup({
  entry,
  onOpenFaction,
  onOpenHistory,
}: {
  entry: FactionSubjectDemographics;
  onOpenFaction: (factionId: string) => void;
  onOpenHistory: (kind: MakeupKind) => void;
}) {
  const faction = entry.faction;
  return (
    <div className="diplo-demo-subject">
      <button
        type="button"
        className="diplo-demo-subject-header"
        onClick={() => onOpenFaction(faction.id)}
      >
        <FactionRoundel
          factionId={faction.id}
          colour={faction.colour}
          secondaryColour={faction.secondaryColour}
          cultureGroup={faction.cultureGroup}
          emblem={faction.emblem}
          name={faction.name}
          resolveFaction={false}
          diplomaticStatus={faction.diplomaticStatus}
          subjectSubtype={faction.subjectSubtype}
          isPlayer={faction.isPlayer}
          isRebel={faction.isRebel}
          size="xs"
          showRing
        />
        <span className="diplo-demo-subject-name">{faction.name}</span>
        <span className="diplo-demo-subject-pop">{formatNumber(entry.population)}</span>
      </button>
      <div className="diplo-demo-subject-charts">
        {entry.cultures.length > 0 && (
          <div className="diplo-demo-subject-chart">
            <div className="diplo-demo-subject-chart-header">
              <span className="diplo-demo-subject-chart-label">{webUIText('DiplomacySidebar.CultureMakeup')}</span>
              <HistoryButton onClick={() => onOpenHistory('culture')} />
            </div>
            <GrittyPieChart segments={toSegments(entry.cultures)} size={72} />
            <MakeupLegend shares={entry.cultures} kind="culture" />
          </div>
        )}
        {entry.religions.length > 0 && (
          <div className="diplo-demo-subject-chart">
            <div className="diplo-demo-subject-chart-header">
              <span className="diplo-demo-subject-chart-label">{webUIText('DiplomacySidebar.ReligionMakeup')}</span>
              <HistoryButton onClick={() => onOpenHistory('religion')} />
            </div>
            <GrittyPieChart segments={toSegments(entry.religions)} size={72} />
            <MakeupLegend shares={entry.religions} kind="religion" />
          </div>
        )}
      </div>
    </div>
  );
}

interface HistoryTarget {
  factionId: string;
  factionName: string;
  kind: MakeupKind;
}

export default function DiplomacyDemographicsPanel({ faction }: { faction: Faction }) {
  const { openSidebar } = useGameActions();
  const [history, setHistory] = useState<HistoryTarget | null>(null);
  const cultures = faction.cultures ?? [];
  const religions = faction.religions ?? [];
  const subjects = (faction.subjectDemographics ?? []).filter(entry => (
    entry.population > 0 && (entry.cultures.length > 0 || entry.religions.length > 0)
  ));
  const empty = cultures.length === 0 && religions.length === 0 && subjects.length === 0;

  if (empty) {
    return (
      <div className="diplo-demo-empty">
        <WebUIText textKey="DiplomacySidebar.NoDemographicData" />
      </div>
    );
  }

  return (
    <div className="diplo-demo">
      <MakeupChart
        title={webUIText('DiplomacySidebar.CultureMakeup')}
        shares={cultures}
        kind="culture"
        onHistory={() => setHistory({ factionId: faction.id, factionName: faction.name, kind: 'culture' })}
      />
      <MakeupChart
        title={webUIText('DiplomacySidebar.ReligionMakeup')}
        shares={religions}
        kind="religion"
        onHistory={() => setHistory({ factionId: faction.id, factionName: faction.name, kind: 'religion' })}
      />
      {subjects.length > 0 && (
        <>
          <SectionHeading variant="ornate" title={webUIText('DiplomacySidebar.SubjectPeoples')} />
          {subjects.map(entry => (
            <SubjectMakeup
              key={entry.faction.id}
              entry={entry}
              onOpenFaction={(factionId) => openSidebar('diplomacy', factionId)}
              onOpenHistory={(kind) => setHistory({ factionId: entry.faction.id, factionName: entry.faction.name, kind })}
            />
          ))}
        </>
      )}
      <DemographicHistoryModal
        open={Boolean(history)}
        factionId={history?.factionId ?? ''}
        factionName={history?.factionName ?? ''}
        kind={history?.kind ?? 'culture'}
        onClose={() => setHistory(null)}
      />
    </div>
  );
}
