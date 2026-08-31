import React, { useMemo, useState } from 'react';
import { useMapModeFiltersBridge } from '../../bridge/military-map/useMapModeFiltersBridge';
import type { MapModeFilterEntry } from '../../bridge-types.generated.ts';
import StyledScrollArea from '../common/layout/scrolling/StyledScrollArea';
import { webUIText, WebUIText } from '../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../utils/assets';
import { MAP_MODE_ICONS } from './mapModeIcons';
import { textMatchesSearch } from '../common/layout/tables/sortUtils';

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString();
}

interface FilterRowProps {
  entry: MapModeFilterEntry;
  radioMode: boolean;
  onToggle: (entryId: string, active: boolean) => void;
  onSelect: (entryId: string) => void;
}

function FilterRow({ entry, radioMode, onToggle, onSelect }: FilterRowProps) {
  const amountLabel = entry.amount > 0
    ? webUIText('MapModeFilter.MonthlyAmount', { Amount: formatAmount(entry.amount) })
    : '';
  const rowClass = `map-filter-row ${entry.active ? 'is-active' : 'is-muted'}${radioMode ? ' is-radio' : ''}`;
  const iconPath = WebkilnAssetPath(entry.iconPath);

  return (
    <button
      type="button"
      className={rowClass}
      aria-label={webUIText(radioMode ? 'MapModeFilter.SelectEntry' : 'MapModeFilter.ToggleEntry', { Name: entry.name })}
      onClick={(event) => {
        event.preventDefault();
        if (radioMode) {
          onSelect(entry.id);
        } else {
          onToggle(entry.id, !entry.active);
        }
      }}
    >
      <span className="map-filter-check">
        <span />
      </span>
      <span
        className="map-filter-swatch"
        style={{ backgroundColor: entry.colour }}
      >
        {iconPath ? <img src={iconPath} alt="" draggable={false} /> : null}
      </span>
      <span className="map-filter-name">{entry.name}</span>
      {amountLabel ? <span className="map-filter-amount">{amountLabel}</span> : null}
    </button>
  );
}

const MapModeFilterPanel: React.FC = () => {
  const { state, setEntryActive, selectEntry, showAll, showNone } = useMapModeFiltersBridge();
  const [search, setSearch] = useState('');

  const modeId = state?.modeId ?? '';
  React.useEffect(() => {
    setSearch('');
  }, [modeId]);

  const visibleEntries = useMemo(() => {
    if (!state) return [];
    const query = search.trim();
    if (!query) return state.entries;
    return state.entries.filter(entry => textMatchesSearch(entry.name, query));
  }, [search, state]);

  if (!state || !state.supported || state.entries.length === 0) {
    return null;
  }

  const activeCount = state.filterActive
    ? state.entries.filter(entry => entry.active).length
    : state.entries.length;
  const modeIconPath = WebkilnAssetPath(MAP_MODE_ICONS[state.modeId] ?? '/assets/icons/I_Resources.png');
  const searchIconPath = WebkilnAssetPath('/assets/icons/I_Search.png');
  const countLabel = webUIText('MapModeFilter.ActiveCount', {
    Active: formatAmount(activeCount),
    Total: formatAmount(state.entries.length),
  });

  return (
    <div className={`map-filter-panel${state.radioMode ? ' map-filter-panel--radio' : ''}`}>
      <div className="map-filter-header">
        <div className="map-filter-title">
          <img src={modeIconPath} alt="" draggable={false} />
          <div className="map-filter-heading">{state.modeLabel}</div>
        </div>
        <div className="map-filter-total">{countLabel}</div>
      </div>

      {!state.radioMode && (
        <div className="map-filter-toolbar">
          <div className="map-filter-search">
            <img src={searchIconPath} alt="" draggable={false} />
            <input
              type="text"
              value={search}
              aria-label={webUIText('MapModeFilter.Search')}
              placeholder={webUIText('MapModeFilter.Search')}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <div className="map-filter-presets">
            <button
              type="button"
              className="map-filter-preset"
              onClick={(event) => {
                event.preventDefault();
                showAll();
              }}
            >
              <WebUIText textKey="Common.All" />
            </button>
            <button
              type="button"
              className="map-filter-preset"
              onClick={(event) => {
                event.preventDefault();
                showNone();
              }}
            >
              <WebUIText textKey="Common.None" />
            </button>
          </div>
        </div>
      )}

      <StyledScrollArea className="map-filter-list" viewportClassName="map-filter-list__viewport" variant="inline">
        {visibleEntries.length === 0 ? (
          <div className="map-filter-empty"><WebUIText textKey="MapModeFilter.NoMatches" /></div>
        ) : visibleEntries.map(entry => (
          <FilterRow
            key={entry.id || entry.name}
            entry={entry}
            radioMode={state.radioMode}
            onToggle={setEntryActive}
            onSelect={selectEntry}
          />
        ))}
      </StyledScrollArea>
    </div>
  );
};

export default React.memo(MapModeFilterPanel);
