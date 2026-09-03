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
      />
      {iconPath ? <img className="map-filter-icon" src={iconPath} alt="" draggable={false} /> : null}
      <span className="map-filter-name">{entry.name}</span>
      {amountLabel ? <span className="map-filter-amount">{amountLabel}</span> : null}
    </button>
  );
}

const MapModeFilterPanel: React.FC = () => {
  const {
    state,
    setEntryActive,
    setEntriesActive,
    selectEntry,
    showAll,
    showNone,
    setFlowRoleActive,
  } = useMapModeFiltersBridge();
  const [search, setSearch] = useState('');
  const [collapsedResourceGroups, setCollapsedResourceGroups] = useState<Set<string>>(() => new Set());

  const modeId = state?.modeId ?? '';
  React.useEffect(() => {
    setSearch('');
    setCollapsedResourceGroups(new Set());
  }, [modeId]);

  const toggleResourceGroupCollapsed = (groupId: string) => {
    setCollapsedResourceGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const visibleEntries = useMemo(() => {
    if (!state) return [];
    const query = search.trim();
    if (!query) return state.entries;
    return state.entries.filter(entry => textMatchesSearch(entry.name, query));
  }, [search, state]);

  const resourceGroups = useMemo(() => {
    const groups: Array<{ id: string; name: string; entries: MapModeFilterEntry[] }> = [];
    visibleEntries.forEach((entry) => {
      const groupId = entry.groupId || 'other';
      let group = groups.find(candidate => candidate.id === groupId);
      if (!group) {
        group = { id: groupId, name: entry.groupName, entries: [] };
        groups.push(group);
      }
      group.entries.push(entry);
    });
    return groups;
  }, [visibleEntries]);

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

      {state.modeId === 'resources' && (
        <div className="resource-flow-legend">
          <button
            type="button"
            className={`map-filter-preset resource-flow-legend__entry${state.collectionRoutesActive ? ' is-active' : ' is-muted'}`}
            onClick={() => setFlowRoleActive('collection', !state.collectionRoutesActive)}
          >
            <span className="resource-flow-legend__sample is-collection"><span /></span>
            <WebUIText textKey="ResourceFlow.CollectionLegend" />
          </button>
          <button
            type="button"
            className={`map-filter-preset resource-flow-legend__entry${state.distributionRoutesActive ? ' is-active' : ' is-muted'}`}
            onClick={() => setFlowRoleActive('distribution', !state.distributionRoutesActive)}
          >
            <span className="resource-flow-legend__sample is-distribution"><span /></span>
            <WebUIText textKey="ResourceFlow.DistributionLegend" />
          </button>
        </div>
      )}

      <StyledScrollArea className="map-filter-list" viewportClassName="map-filter-list__viewport" variant="inline">
        {visibleEntries.length === 0 ? (
          <div className="map-filter-empty"><WebUIText textKey="MapModeFilter.NoMatches" /></div>
        ) : state.modeId === 'resources' ? resourceGroups.map(group => {
          const allGroupEntries = state.entries.filter(entry => entry.groupId === group.id);
          const activeCount = allGroupEntries.filter(entry => entry.active).length;
          const allActive = activeCount === allGroupEntries.length;
          const groupStateClass = allActive ? ' is-active' : activeCount > 0 ? ' is-mixed' : ' is-muted';
          const collapsed = search.trim() === '' && collapsedResourceGroups.has(group.id);
          return (
            <div key={group.id} className="map-filter-group">
              <div className={`map-filter-group-header${groupStateClass}`}>
                <button
                  type="button"
                  className="map-filter-group-toggle"
                  aria-label={webUIText('MapModeFilter.ToggleEntry', { Name: group.name })}
                  onClick={() => setEntriesActive(allGroupEntries.map(entry => entry.id), !allActive)}
                >
                  <span className="map-filter-check"><span /></span>
                </button>
                <button
                  type="button"
                  className={`map-filter-group-disclosure${collapsed ? ' is-collapsed' : ''}`}
                  aria-expanded={!collapsed}
                  onClick={() => toggleResourceGroupCollapsed(group.id)}
                >
                  <span>{group.name}</span>
                </button>
              </div>
              {!collapsed && (
                <div className="map-filter-group-entries">
                  {group.entries.map(entry => (
                    <FilterRow
                      key={entry.id || entry.name}
                      entry={entry}
                      radioMode={state.radioMode}
                      onToggle={setEntryActive}
                      onSelect={selectEntry}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }) : visibleEntries.map(entry => (
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
