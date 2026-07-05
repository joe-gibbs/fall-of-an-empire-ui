import React from 'react';
import Tooltip from '../common/tooltips/Tooltip';
import { useConvoyGlanceFiltersBridge } from '../../bridge/military-map/useConvoyGlanceFiltersBridge';
import type { ConvoyGlanceFactionFilter } from '../../bridge-types.generated.ts';

import { webUIText, WebUIText } from '../../localization/WebUITextContext';
const RELATION_LABEL_KEYS: Record<string, string> = {
  own: 'ConvoyFilter.Relation.Realm',
  ally: 'Common.Ally',
  enemy: 'Common.Enemy',
  neutral: 'Common.Neutral',
};

function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}

function relationLabel(relation: string): string {
  return webUIText(RELATION_LABEL_KEYS[relation] ?? 'Common.Neutral');
}

interface FactionRowProps {
  faction: ConvoyGlanceFactionFilter;
  onToggle: (factionName: string, active: boolean) => void;
}

function FactionRow({ faction, onToggle }: FactionRowProps) {
  const rowClass = `convoy-filter-row ${faction.active ? 'is-active' : 'is-muted'} convoy-filter-row--${faction.relation || 'neutral'}`;

  return (
    <Tooltip
      content={{
        title: faction.name,
        lines: [
          { label: webUIText('Auto.Prop.ComponentsBottombarConvoyFilterPanel.35.1'), value: relationLabel(faction.relation) },
          { label: webUIText('Auto.Prop.ComponentsBottombarConvoyFilterPanel.36.2'), value: formatCount(faction.convoyCount) },
        ],
      }}
      position="left"
      delay={450}
    >
      <button
        type="button"
        className={rowClass}
        onMouseDown={(event) => {
          event.preventDefault();
          onToggle(faction.name, !faction.active);
        }}
      >
        <span className="convoy-filter-check">
          <span />
        </span>
        <span
          className="convoy-filter-swatch"
          style={{
            backgroundColor: faction.colour,
            borderTopColor: faction.secondaryColour,
            borderRightColor: faction.secondaryColour,
            borderBottomColor: faction.secondaryColour,
            borderLeftColor: faction.secondaryColour,
          }}
        />
        <span className="convoy-filter-name">{faction.name}</span>
        <span className="convoy-filter-count">{formatCount(faction.convoyCount)}</span>
      </button>
    </Tooltip>
  );
}

const ConvoyFilterPanel: React.FC = () => {
  const {
    state,
    setShowConvoys,
    setFactionActive,
    showAllFactions,
    showNoFactions,
  } = useConvoyGlanceFiltersBridge();

  if (!state) {
    return null;
  }

  const totalConvoys = state.factions.reduce((sum, faction) => sum + faction.convoyCount, 0);
  const visibleConvoys = state.factionFilterActive
    ? state.factions.filter(faction => faction.active).reduce((sum, faction) => sum + faction.convoyCount, 0)
    : totalConvoys;
  const countLabel = state.factionFilterActive
    ? `${formatCount(visibleConvoys)} / ${formatCount(totalConvoys)}`
    : formatCount(totalConvoys);

  return (
    <div className={`convoy-filter-panel ${state.showConvoys ? '' : 'is-disabled'}`}>
      <div className="convoy-filter-header">
        <div className="convoy-filter-title">
          <img src="/assets/icons/I_Resources.png" alt="" draggable={false} />
          <div>
            <div className="convoy-filter-heading"><WebUIText textKey="Auto.ComponentsBottombarConvoyFilterPanel.97.2" /></div>
          </div>
        </div>
        <div className="convoy-filter-total">{countLabel}</div>
      </div>

      <div className="convoy-filter-toolbar">
        <Tooltip content={webUIText(state.showConvoys ? 'ConvoyFilter.HideConvoyGlances' : 'ConvoyFilter.ShowConvoyGlances')} position="left" delay={450}>
          <button
            type="button"
            className={`convoy-filter-master ${state.showConvoys ? 'is-on' : ''}`}
            onMouseDown={(event) => {
              event.preventDefault();
              setShowConvoys(!state.showConvoys);
            }}
          >
            <span className="convoy-filter-switch"><span /></span>
            <span>{webUIText(state.showConvoys ? 'ConvoyFilter.Shown' : 'ConvoyFilter.Hidden')}</span>
          </button>
        </Tooltip>
        <div className="convoy-filter-presets">
          <button
            type="button"
            className="convoy-filter-preset"
            onMouseDown={(event) => {
              event.preventDefault();
              showAllFactions();
            }}
          >
            <WebUIText textKey="Auto.ComponentsBottombarConvoyFilterPanel.126.3" />
          </button>
          <button
            type="button"
            className="convoy-filter-preset"
            onMouseDown={(event) => {
              event.preventDefault();
              showNoFactions();
            }}
          >
            <WebUIText textKey="Auto.ComponentsBottombarConvoyFilterPanel.136.4" />
          </button>
        </div>
      </div>

      <div className="convoy-filter-list">
        {state.factions.length === 0 ? (
          <div className="convoy-filter-empty"><WebUIText textKey="Auto.ComponentsBottombarConvoyFilterPanel.143.5" /></div>
        ) : state.factions.map(faction => (
          <FactionRow
            key={faction.id || faction.name}
            faction={faction}
            onToggle={setFactionActive}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(ConvoyFilterPanel);
