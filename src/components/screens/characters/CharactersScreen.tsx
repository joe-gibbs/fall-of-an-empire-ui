import { createContext, memo, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import Tooltip from '../../common/tooltips/Tooltip';
import GameButton from '../../common/buttons/GameButton';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import { textMatchesSearch } from '../../common/layout/tables/sortUtils';
import DropdownSelect, { type DropdownSelectOption } from '../../common/forms/DropdownSelect';
import CompactStat from '../../common/data-display/stats/CompactStat';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import { useGameActions } from '../../../context/GameContext';
import { usePlayerFactionId } from '../../../data-source/index';
import {
  useCharacterListBridge,
  type CharacterListEntry,
  type CharacterListScope,
  type CharacterListStats,
} from '../../../bridge/characters/useCharactersBridge';
import {
  usePersonInteractionsBridge,
  type PersonInteractionView,
} from '../../../bridge/characters/usePersonInteractionsBridge';
import { usePersonTooltipBridge } from '../../../bridge/characters/usePersonBridge';
import type { Character, StatKey } from '../../../data/types';
import { getComplianceState, getStatColor } from '../../../utils/colorFormatters';
import {
  buildCharacterStatTooltip,
  buildComplianceTooltip,
  characterStatGlossary,
} from '../../../utils/characterTooltipContent';
import { STAT_ICONS } from '../../../utils/iconMaps';
import { formatNumber } from '../../../utils/numberFormat';
import { formatPersonActivity } from '../../../utils/displayLabels';
import { WebkilnAssetPath } from '../../../utils/assets';
import { compareSortValues } from '../../common/layout/tables/sortUtils';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import './CharactersScreen.css';

import { useWebUIText, webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface CharactersScreenProps {
  screenId: string | null;
  onClose: () => void;
}

type SortKey =
  | 'name'
  | 'role'
  | 'age'
  | 'identity'
  | 'authority'
  | 'cunning'
  | 'loyalty'
  | 'compliance'
  | 'fame'
  | 'tactics'
  | 'governance'
  | 'constitution'
  | 'actions';

const FILTERS = [
  { id: 'all', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.41.1'); } },
  { id: 'family', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.42.2'); } },
  { id: 'command', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.43.3'); } },
  { id: 'governance', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.44.4'); } },
  { id: 'agents', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.45.5'); } },
  { id: 'court', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.46.6'); } },
  { id: 'prisoners', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.47.7'); } },
];

const STAT_ORDER: Array<{ key: StatKey; label: string }> = [
  { key: 'tactics', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.52.9'); } },
  { key: 'authority', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.53.10'); } },
  { key: 'cunning', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.54.11'); } },
  { key: 'governance', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.55.12'); } },
  { key: 'loyalty', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.56.13'); } },
  { key: 'constitution', get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.57.14'); } },
];

const EMPTY_CHARACTERS: CharacterListEntry[] = [];
const ALL_FILTER = '__all__';

type FilterOption = DropdownSelectOption;

interface CharacterFilters {
  faction: string;
  role: string;
  culture: string;
  religion: string;
  trait: string;
}

const DEFAULT_CHARACTER_FILTERS: CharacterFilters = {
  faction: ALL_FILTER,
  role: ALL_FILTER,
  culture: ALL_FILTER,
  religion: ALL_FILTER,
  trait: ALL_FILTER,
};

function formatWhole(value: number): string {
  return formatNumber(value);
}

function matchFilter(filterValue: string, rowValue: string): boolean {
  return filterValue === ALL_FILTER || filterValue === rowValue;
}

function characterFilterValue(character: CharacterListEntry, key: keyof CharacterFilters): string {
  switch (key) {
    case 'faction': return character.factionId || character.factionName;
    case 'role': return character.role;
    case 'culture': return character.cultureId || character.culture;
    case 'religion': return character.religionId || character.religion;
    case 'trait': return character.traits.map(trait => trait.id).join(' ');
  }
}

function uniqueFilterOptions(
  characters: CharacterListEntry[],
  allLabel: string,
  getValue: (character: CharacterListEntry) => string,
  getLabel: (character: CharacterListEntry, value: string) => string,
  getIcon?: (character: CharacterListEntry, value: string) => string,
): FilterOption[] {
  const values = new Map<string, { label: string; icon?: string }>();
  characters.forEach(character => {
    const value = getValue(character).trim();
    if (!value || values.has(value)) return;
    values.set(value, {
      label: getLabel(character, value),
      icon: getIcon?.(character, value),
    });
  });
  const options = Array.from(values.entries())
    .map(([value, data]) => ({ value, label: data.label, icon: data.icon }))
    .sort((left, right) => compareSortValues(left.label, right.label));
  return [{ value: ALL_FILTER, label: allLabel }, ...options];
}

function cultureIcon(character: CharacterListEntry, value: string): string {
  const id = character.cultureId || value;
  return id ? WebkilnAssetPath(`/assets/cultures/${id}.png`) : '';
}

function religionIcon(character: CharacterListEntry, value: string): string {
  const id = character.religionId || value;
  return id ? WebkilnAssetPath(`/assets/religions/${id}.png`) : '';
}

function traitFilterOptions(characters: CharacterListEntry[], allLabel: string): FilterOption[] {
  const values = new Map<string, string>();
  characters.forEach(character => {
    character.traits.forEach(trait => {
      const value = trait.id.trim();
      if (!value || values.has(value)) return;
      values.set(value, trait.name);
    });
  });
  const options = Array.from(values.entries())
    .map(([value, label]) => ({ value, label, icon: `/assets/traits/${value}.png` }))
    .sort((left, right) => compareSortValues(left.label, right.label));
  return [{ value: ALL_FILTER, label: allLabel }, ...options];
}

function resolvedFilterValue(value: string, options: FilterOption[]): string {
  return options.some(option => option.value === value) ? value : ALL_FILTER;
}

function characterHasTrait(character: CharacterListEntry, traitId: string): boolean {
  return traitId === ALL_FILTER || character.traits.some(trait => trait.id === traitId);
}

interface CharacterTooltipData {
  request: (personId: string) => void;
  person: Character | null;
}

const CharacterTooltipDataContext = createContext<CharacterTooltipData>({
  request: () => undefined,
  person: null,
});

function CharacterTooltipDataProvider({ children }: { children: ReactNode }) {
  const [personId, setPersonId] = useState<string | null>(null);
  const person = usePersonTooltipBridge(personId);
  const request = useCallback((id: string) => {
    setPersonId(current => (current === id ? current : id));
  }, []);
  const value = useMemo(() => ({ request, person }), [person, request]);
  return (
    <CharacterTooltipDataContext.Provider value={value}>
      {children}
    </CharacterTooltipDataContext.Provider>
  );
}

function useCharacterTooltipData(personId: string) {
  const { request, person } = useContext(CharacterTooltipDataContext);
  const onShowIntent = useCallback(() => request(personId), [personId, request]);
  return {
    onShowIntent,
    character: person?.id === personId ? person : null,
  };
}

function isStatColumn(id: SortKey): boolean {
  return STAT_ORDER.some(stat => stat.key === id);
}

function categoryLabel(category: string): string {
  return FILTERS.find(filter => filter.id === category)?.label ?? webUIText('Common.Other');
}

function activityText(character: CharacterListEntry): string {
  if (character.roleDetail) return character.roleDetail;
  const activity = formatPersonActivity(character.activity);
  if (activity) return activity;
  return character.role;
}

function characterSortValue(character: CharacterListEntry, sortKey: SortKey): string | number {
  switch (sortKey) {
    case 'name': return character.name;
    case 'role': return character.role;
    case 'age': return character.age;
    case 'identity': return `${character.culture} ${character.religion}`;
    case 'compliance': return character.hasCompliance ? character.complianceTowardPlayer : -999;
    case 'fame': return character.fame;
    case 'tactics': return character.stats.tactics;
    case 'authority': return character.stats.authority;
    case 'cunning': return character.stats.cunning;
    case 'governance': return character.stats.governance;
    case 'loyalty': return character.stats.loyalty;
    case 'constitution': return character.stats.constitution;
    case 'actions': return character.isImprisoned ? 1 : 0;
  }
  return character.name;
}

const StatHeaderLabel = memo(function StatHeaderLabel({ stat }: { stat: { key: StatKey; label: string } }) {
  const glossary = characterStatGlossary(stat.key);
  return (
    <CompactStat
      mode="icon"
      icon={STAT_ICONS[stat.key]}
      label={stat.label}
      className="chs-stat-header-label"
      iconClassName="chs-stat-header-icon"
      tooltip={{ title: glossary.title, body: glossary.body }}
    />
  );
});

const CharacterStatCell = memo(function CharacterStatCell({
  characterId,
  stats,
  stat,
}: {
  characterId: string;
  stats: CharacterListStats;
  stat: { key: StatKey; label: string };
}) {
  const value = stats[stat.key];
  const { onShowIntent, character } = useCharacterTooltipData(characterId);
  return (
    <CompactStat
      mode="value"
      icon={STAT_ICONS[stat.key]}
      label={stat.label}
      value={formatWhole(value)}
      valueColor={getStatColor(value)}
      valueClassName="chs-stat-number"
      tooltip={buildCharacterStatTooltip(stat.key, value, character)}
      onShowIntent={onShowIntent}
    />
  );
});

const ComplianceCell = memo(function ComplianceCell({ character }: { character: CharacterListEntry }) {
  const { onShowIntent, character: tooltipCharacter } = useCharacterTooltipData(character.id);
  if (!character.hasCompliance) {
    return <span className="chs-muted">-</span>;
  }

  const state = getComplianceState(character.complianceTowardPlayer);
  return (
    <Tooltip
      content={buildComplianceTooltip(character.complianceTowardPlayer, tooltipCharacter)}
      delay={120}
      onShowIntent={onShowIntent}
    >
      <span className="chs-compliance" style={{ color: state.color }}>
        <img className="chs-compliance-icon" src={state.icon} alt="" />
        <span>{state.label}</span>
      </span>
    </Tooltip>
  );
});

const CharacterPersonCell = memo(function CharacterPersonCell({ character }: { character: CharacterListEntry }) {
  return (
    <>
      <PersonTooltip characterId={character.id} position="right" delay={150}>
        <Portrait
          personId={character.id}
          name={character.name}
          src={character.portrait}
          layers={character.portraitLayers}
          isAlive={character.isAlive}
          isImprisoned={character.isImprisoned}
          activity={character.activity}
          isPlayerCharacter={character.isPlayerCharacter}
          isHeir={character.isHeir}
          size="md"
          showBorder
        />
      </PersonTooltip>
      <div className="chs-person-copy">
        <div className="chs-name-line">
          <span className="chs-name">{character.name}</span>
        </div>
        <div className="chs-title">{character.title || character.factionName}</div>
      </div>
    </>
  );
});

const CharacterRoleCell = memo(function CharacterRoleCell({ character }: { character: CharacterListEntry }) {
  const detail = activityText(character);
  return (
    <>
      <div className="chs-role-line">
        <span className="chs-role">{character.role}</span>
        {character.isHeir && <span className="badge badge--gold chs-small-badge"><WebUIText textKey="Auto.ComponentsScreensCharactersScreen.178.1" /></span>}
      </div>
      <div className="chs-detail">{detail || categoryLabel(character.category)}</div>
    </>
  );
});

const CharacterAgeCell = memo(function CharacterAgeCell({ character }: { character: CharacterListEntry }) {
  return (
    <span className="chs-age">{formatWhole(character.age)}</span>
  );
});

function prisonActionTooltip(action: PersonInteractionView | undefined, fallbackTitle: string) {
  if (!action) {
    return { title: fallbackTitle };
  }

  const blockedReasons = action.reasons
    .filter(reason => reason.status !== 'available')
    .map(reason => ({ label: reason.reason }));

  return {
    title: action.name || fallbackTitle,
    body: action.description,
    lines: blockedReasons.length > 0 ? blockedReasons : undefined,
  };
}

const CharacterPrisonActions = memo(function CharacterPrisonActions({ character }: { character: CharacterListEntry }) {
  const interactions = usePersonInteractionsBridge(character.isImprisoned ? character.id : null);
  const execute = interactions.state?.interactions.find(interaction => interaction.id === 'executecharacter');
  const release = interactions.state?.interactions.find(interaction => interaction.id === 'releasecharacter');

  if (!character.isImprisoned) {
    return <span className="chs-muted">-</span>;
  }

  const actionDisabled = (action: PersonInteractionView | undefined) => (
    !action || action.availability !== 'available' || action.inProgress
  );

  return (
    <div
      className="chs-prison-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <Tooltip
        content={prisonActionTooltip(execute, webUIText('Characters.ExecutePrisoner'))}
        position="left"
        delay={120}
      >
        <GameButton
          variant="outline"
          className="chs-prison-action"
          icon="/assets/person-interactions/icons/ExecuteCharacter.png"
          ariaLabel={webUIText('Characters.ExecutePrisoner')}
          disabled={actionDisabled(execute)}
          onClick={() => void interactions.start('executecharacter')}
        />
      </Tooltip>
      <Tooltip
        content={prisonActionTooltip(release, webUIText('Characters.FreePrisoner'))}
        position="left"
        delay={120}
      >
        <GameButton
          variant="burgundy"
          className="chs-prison-action"
          icon="/assets/person-interactions/icons/ReleaseCharacter.png"
          ariaLabel={webUIText('Characters.FreePrisoner')}
          disabled={actionDisabled(release)}
          onClick={() => void interactions.start('releasecharacter')}
        />
      </Tooltip>
    </div>
  );
});

const CharactersScreen = memo(function CharactersScreen({ screenId, onClose }: CharactersScreenProps) {
  const t = useWebUIText();
  const playerFactionId = usePlayerFactionId();
  const requestedFactionId = screenId || playerFactionId;
  const { openSidebar } = useGameActions();
  const [characterScopeOverride, setCharacterScope] = useState<CharacterListScope | null>(null);
  const data = useCharacterListBridge(requestedFactionId, true, characterScopeOverride ?? 'default');
  const characterScope = characterScopeOverride ?? data?.scope ?? 'faction';
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [characterFilters, setCharacterFilters] = useState<CharacterFilters>(DEFAULT_CHARACTER_FILTERS);

  const characters = data?.characters ?? EMPTY_CHARACTERS;
  const showPrisonActions = filter === 'prisoners';

  const counts = useMemo(() => {
    const next = new Map<string, number>();
    next.set('all', characters.length);
    for (const character of characters) {
      next.set(character.category, (next.get(character.category) ?? 0) + 1);
    }
    return next;
  }, [characters]);

  const filteredCharacters = useMemo(
    () => characters.filter(character => filter === 'all' || character.category === filter),
    [characters, filter],
  );

  const filterOptions = useMemo(() => {
    const allLabel = webUIText('Common.All');
    return {
      faction: uniqueFilterOptions(filteredCharacters, allLabel, character => characterFilterValue(character, 'faction'), character => character.factionName),
      role: uniqueFilterOptions(filteredCharacters, allLabel, character => characterFilterValue(character, 'role'), character => character.role),
      culture: uniqueFilterOptions(filteredCharacters, allLabel, character => characterFilterValue(character, 'culture'), character => character.culture, cultureIcon),
      religion: uniqueFilterOptions(filteredCharacters, allLabel, character => characterFilterValue(character, 'religion'), character => character.religion, religionIcon),
      trait: traitFilterOptions(filteredCharacters, allLabel),
    };
  }, [filteredCharacters]);

  const activeCharacterFilters = useMemo(() => ({
    faction: resolvedFilterValue(characterFilters.faction, filterOptions.faction),
    role: resolvedFilterValue(characterFilters.role, filterOptions.role),
    culture: resolvedFilterValue(characterFilters.culture, filterOptions.culture),
    religion: resolvedFilterValue(characterFilters.religion, filterOptions.religion),
    trait: resolvedFilterValue(characterFilters.trait, filterOptions.trait),
  }), [characterFilters, filterOptions]);

  const setCharacterFilter = useCallback((key: keyof CharacterFilters, value: string) => {
    setCharacterFilters(current => ({ ...current, [key]: value }));
  }, []);

  const scopeOptions = useMemo<FilterOption[]>(() => [
    { value: 'faction', label: t('Economy.Faction'), icon: '/assets/icons/I_IndependentFactions.png' },
    { value: 'realm', label: t('MainMenu.Realm'), icon: '/assets/icons/I_DependentFactions.png' },
  ], [t]);

  const handleOpenCharacter = useCallback((id: string) => openSidebar('character', id), [openSidebar]);

  const filterTabs = useMemo(() => FILTERS
    .filter(tab => tab.id === 'all' || (counts.get(tab.id) ?? 0) > 0)
    .map(tab => ({ id: tab.id, label: t("Auto.Prop.componentsscreensCharactersScreen.223.1", { Label: tab.label, Value2: formatWhole(counts.get(tab.id) ?? 0) }) })),
    [counts, t]);

  const statColumns = useMemo<Array<DataTableColumn<CharacterListEntry, SortKey>>>(() => STAT_ORDER.map(stat => ({
    id: stat.key,
    label: <StatHeaderLabel stat={stat} />,
    render: character => <CharacterStatCell characterId={character.id} stats={character.stats} stat={stat} />,
    sortValue: character => characterSortValue(character, stat.key),
  })), []);

  const prisonActionColumns = useMemo<Array<DataTableColumn<CharacterListEntry, SortKey>>>(() => showPrisonActions ? [{
    id: 'actions',
    label: t('Characters.PrisonActions'),
    render: character => <CharacterPrisonActions character={character} />,
    sortValue: character => character.isImprisoned ? 1 : 0,
  }] : [], [showPrisonActions, t]);

  const columns = useMemo<Array<DataTableColumn<CharacterListEntry, SortKey>>>(() => [
    {
      id: 'name',
      label: t('Auto.Prop.ComponentsScreensCharactersScreen.228.3'),
      render: character => <CharacterPersonCell character={character} />,
      sortValue: character => characterSortValue(character, 'name'),
    },
    {
      id: 'role',
      label: t('Auto.Prop.ComponentsScreensCharactersScreen.234.4'),
      render: character => <CharacterRoleCell character={character} />,
      sortValue: character => characterSortValue(character, 'role'),
    },
    {
      id: 'age',
      label: t('Common.Age'),
      render: character => <CharacterAgeCell character={character} />,
      sortValue: character => characterSortValue(character, 'age'),
    },
    {
      id: 'identity',
      label: t('Auto.Prop.ComponentsScreensCharactersScreen.246.6'),
      render: character => (
        <>
          <span>{character.culture || '-'}</span>
          <span className="chs-muted">{character.religion || '-'}</span>
        </>
      ),
      sortValue: character => characterSortValue(character, 'identity'),
    },
    ...statColumns,
    {
      id: 'compliance',
      label: t('Auto.Prop.ComponentsScreensCharactersScreen.263.8'),
      render: character => <ComplianceCell character={character} />,
      sortValue: character => characterSortValue(character, 'compliance'),
    },
    ...prisonActionColumns,
  ], [prisonActionColumns, statColumns, t]);

  const searchPredicate = useCallback((character: CharacterListEntry, query: string) => {
    const haystack = [
      character.name,
      character.title,
      character.shortTitle,
      character.role,
      character.roleDetail,
      character.status,
      character.culture,
      character.religion,
      character.factionName,
      ...character.traits.map(trait => trait.name),
      activityText(character),
    ].join(' ');
    return textMatchesSearch(haystack, query);
  }, []);

  const filterPredicate = useCallback((character: CharacterListEntry) => (
    matchFilter(activeCharacterFilters.faction, characterFilterValue(character, 'faction')) &&
    matchFilter(activeCharacterFilters.role, characterFilterValue(character, 'role')) &&
    matchFilter(activeCharacterFilters.culture, characterFilterValue(character, 'culture')) &&
    matchFilter(activeCharacterFilters.religion, characterFilterValue(character, 'religion')) &&
    characterHasTrait(character, activeCharacterFilters.trait)
  ), [activeCharacterFilters]);

  const toolsExtra = useMemo(() => (
    <div className="chs-filter-row">
      <DropdownSelect className="chs-filter chs-filter--scope" id="scope" label={t('MainMenu.Realm')} value={characterScope} options={scopeOptions} icon="/assets/icons/I_DependentFactions.png" escapeId="characters.filter.scope" isActive={characterScope !== 'faction'} onChange={value => setCharacterScope(value === 'realm' ? 'realm' : 'faction')} />
      {characterScope === 'realm' && <DropdownSelect className="chs-filter" id="faction" label={t('Economy.Faction')} value={activeCharacterFilters.faction} options={filterOptions.faction} icon="/assets/icons/I_DependentFactions.png" escapeId="characters.filter.faction" isActive={activeCharacterFilters.faction !== ALL_FILTER} onChange={value => setCharacterFilter('faction', value)} />}
      <DropdownSelect className="chs-filter" id="role" label={t('Auto.Prop.ComponentsScreensCharactersScreen.234.4')} value={activeCharacterFilters.role} options={filterOptions.role} icon="/assets/icons/I_Characters.png" escapeId="characters.filter.role" isActive={activeCharacterFilters.role !== ALL_FILTER} onChange={value => setCharacterFilter('role', value)} />
      <DropdownSelect className="chs-filter" id="culture" label={t('Auto.ComponentsSidebarsCharacterSidebar.1155.1')} value={activeCharacterFilters.culture} options={filterOptions.culture} icon="/assets/icons/I_Cultures.png" escapeId="characters.filter.culture" isActive={activeCharacterFilters.culture !== ALL_FILTER} onChange={value => setCharacterFilter('culture', value)} />
      <DropdownSelect className="chs-filter" id="religion" label={t('Auto.ComponentsSidebarsCharacterSidebar.1162.2')} value={activeCharacterFilters.religion} options={filterOptions.religion} icon="/assets/icons/I_Religions.png" escapeId="characters.filter.religion" isActive={activeCharacterFilters.religion !== ALL_FILTER} onChange={value => setCharacterFilter('religion', value)} />
      <DropdownSelect className="chs-filter" id="trait" label={t('Auto.Prop.ComponentsModalsCourtierPromotionModal.184.3')} value={activeCharacterFilters.trait} options={filterOptions.trait} icon="/assets/traits/UnknownTrait.png" escapeId="characters.filter.trait" isActive={activeCharacterFilters.trait !== ALL_FILTER} onChange={value => setCharacterFilter('trait', value)} />
    </div>
  ), [activeCharacterFilters, characterScope, filterOptions, scopeOptions, setCharacterFilter, t]);

  return (
    <ScreenShell
      title={data?.factionName ? webUIText("CharactersScreen.Characters", { FactionName: data.factionName }) : webUIText("Common.Characters")}
      onClose={onClose}
      advisorTopic="charactersScreen"
      tabs={<SidebarTabBar tabs={filterTabs} activeTab={filter} onTabChange={setFilter} />}
      contentClassName="chs-content"
    >
      <CharacterTooltipDataProvider>
      <DataTable
        key={showPrisonActions ? 'characters-prisoners' : 'characters-standard'}
        className={`chs-table-block${showPrisonActions ? ' chs-table-block--prisoners' : ''}`}
        rows={filteredCharacters}
        columns={columns}
        rowKey={character => character.id}
        emptyLabel={webUIText('Auto.ExtraAttr.ComponentsScreensCharactersScreen.282.1')}
        onRowClick={character => handleOpenCharacter(character.id)}
        searchValue={search}
        onSearchChange={setSearch}
        searchLabel={webUIText('Auto.ExtraAttr.ComponentsScreensCharactersScreen.286.2')}
        searchPredicate={searchPredicate}
        filterPredicate={filterPredicate}
        toolsExtra={toolsExtra}
        toolsClassName="chs-controls"
        searchWrapClassName="chs-search"
        searchLabelClassName="chs-control-label"
        searchClassName="chs-search-input"
        wrapperClassName="chs-table"
        bodyScrollFrameClassName="chs-table-body-scroll"
        headerRowClassName="chs-header-row"
        bodyClassName="chs-table-body"
        headerCellClassName={column => {
          const classKey = column.id === 'name' ? 'person' : isStatColumn(column.id) ? 'stat' : column.id;
          return `chs-header-cell chs-header-cell--${classKey}`;
        }}
        bodyCellClassName={(_character, column) => {
          const classKey = column.id === 'name' ? 'person' : isStatColumn(column.id) ? 'stat' : column.id;
          return `chs-cell chs-cell--${classKey}`;
        }}
        activeHeaderClassName="chs-header-cell--active"
        rowClassName="chs-row"
        emptyClassName="chs-empty"
        defaultSortKey="role"
        virtualized
        virtualizeThreshold={30}
        virtualRowHeightRem={5.7}
        virtualOverscan={8}
        styledScrollbar
      />
      </CharacterTooltipDataProvider>
    </ScreenShell>
  );
});

export default CharactersScreen;

registerTopbarButton({
  id: 'characters',
  get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.337.15'); },
  icon: '/assets/icons/I_Characters.png',
  tooltip: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.340.16'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.341.17'); },
    lines: [
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.343.18'); } },
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensCharactersScreen.344.19'); } },
    ],
  },
  order: 30,
});
registerScreen({
  id: 'characters',
  render: ({ screenId, onClose }) => <CharactersScreen screenId={screenId} onClose={onClose} />,
  topbarId: 'characters',
  advisorTopic: 'charactersScreen',
  bridgeNames: ['characters', 'characterlist', 'court'],
});
