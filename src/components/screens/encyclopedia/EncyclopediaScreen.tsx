import { Fragment, useState, useMemo, useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode, WheelEvent as ReactWheelEvent } from 'react';
import { useDeferredMount } from '../../../hooks/useDeferredMount';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import Tooltip from '../../common/tooltips/Tooltip';
import UnitTooltip from '../../common/tooltips/UnitTooltip';
import type { UnitTooltipData } from '../../common/tooltips/UnitTooltip';
import BuildingEffects from '../../common/content/BuildingEffects';
import { getGlossaryEntry } from '../../../data/glossary';
import { useEncyclopediaBridge } from '../../../bridge/settlements-economy/useEncyclopediaBridge';
import { startBuildingPlacementBridge } from '../../../bridge/military-map/useBottomBarOperationsBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import type { EncyclopediaEntryDTO, EncyclopediaBuildingDTO, EncyclopediaCultureDTO, EncyclopediaResourceCostDTO, EncyclopediaUnitDTO } from '../../../bridge-types.generated.ts';
import { formatNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import { conceptIconPath, TIER_ICONS } from '../../../utils/iconMaps';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import './EncyclopediaScreen.css';

import { useWebUIText, webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface Props {
  onClose: () => void;
}

/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

// Article entries come from the game's Encyclopedia/ markdown files via the
// `game.get_encyclopedia_entries` bridge action. See ArticlesPanel below.

const FRONT_PAGE_ID = 'front-page';

type BuildingCategory = 'defensive' | 'military' | 'naval' | 'economic' | 'cultural' | 'administrative' | 'infrastructure' | 'other';

type BuildingChain = EncyclopediaBuildingDTO[];

const EMPTY_ENTRIES: EncyclopediaEntryDTO[] = [];
const EMPTY_CATEGORIES: string[] = [];
const EMPTY_CULTURES: EncyclopediaCultureDTO[] = [];
const EMPTY_BUILDINGS: EncyclopediaBuildingDTO[] = [];
const EMPTY_UNITS: EncyclopediaUnitDTO[] = [];

const BUILDING_CATEGORIES: BuildingCategory[] = ['defensive', 'military', 'naval', 'economic', 'cultural', 'administrative', 'infrastructure', 'other'];

const BUILDING_CATEGORY_LABEL_KEYS: Record<BuildingCategory, string> = {
  defensive: 'Ledger.BuildingCategory.Defensive',
  military: 'Ledger.BuildingCategory.Military',
  naval: 'Ledger.BuildingCategory.Naval',
  economic: 'Ledger.BuildingCategory.Economic',
  cultural: 'Ledger.BuildingCategory.Cultural',
  administrative: 'Ledger.BuildingCategory.Administrative',
  infrastructure: 'Ledger.BuildingCategory.Infrastructure',
  other: 'Economy.Other',
};

const BUILDING_CAT_COLORS: Record<BuildingCategory, string> = {
  defensive: '#8888a0',
  military: '#c06060',
  naval: '#6090c0',
  economic: '#c0a850',
  cultural: '#a070c0',
  administrative: '#60a080',
  infrastructure: '#b09060',
  other: '#909090',
};

const ARMY_TYPE_ORDER = ['infantry', 'cavalry', 'ranged', 'siege', 'special'];
const NAVY_TYPE_ORDER = ['scout', 'transport', 'galley', 'trireme', 'quinquereme', 'siege'];

const UNIT_TYPE_ICONS: Record<string, string> = {
  infantry: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  cavalry: '/assets/icons/UnitTypes/I_ArmyCavalry.png',
  ranged: '/assets/icons/UnitTypes/I_ArmyRanged.png',
  siege: '/assets/icons/UnitTypes/I_ArmySiege.png',
  special: '/assets/icons/UnitTypes/I_ArmySpecial.png',
};

const DEFAULT_ARMY_TOOLTIP_PORTRAIT = '/assets/ui-shadowed/ArmySidebar/Property_1_T_Army_Background.png';
const DEFAULT_NAVY_TOOLTIP_PORTRAIT = '/assets/ui-shadowed/ArmySidebar/Property_1_T_Navy_Background.png';

function selectedCultureId(cultures: EncyclopediaCultureDTO[], requested: string): string {
  if (requested && cultures.some(culture => culture.id === requested)) {
    return requested;
  }
  return cultures[0]?.id ?? '';
}

function normaliseBuildingCategory(value: string): BuildingCategory {
  switch (value) {
    case 'defensive':
    case 'military':
    case 'naval':
    case 'economic':
    case 'cultural':
    case 'administrative':
    case 'infrastructure':
    case 'other':
      return value;
    default:
      return 'other';
  }
}

function buildingCategoryLabel(category: BuildingCategory): string {
  return webUIText(BUILDING_CATEGORY_LABEL_KEYS[category]);
}

function toKebabCase(value: string): string {
  const id = value.toLowerCase();
  if (id === 'roadsdirt') {
    return 'dirt-roads';
  }
  if (id === 'roadspaved') {
    return 'paved-roads';
  }
  if (id === 'roadsmetropolitan') {
    return 'metropolitan-roads';
  }
  if (id === 'shabarimdyeworks') {
    return 'dye-works';
  }
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function buildingPortrait(building: EncyclopediaBuildingDTO): string | undefined {
  return building.assetKey ? WebkilnAssetPath(`/assets/buildings/portraits/${toKebabCase(building.assetKey)}.png`) : undefined;
}

function unitTypeIcon(type: string | undefined, isNaval = false): string | undefined {
  const normalisedType = (type ?? '').toLowerCase();
  const path = normalisedType === 'siege' && isNaval
    ? '/assets/icons/UnitTypes/I_NavySiege.png'
    : UNIT_TYPE_ICONS[normalisedType];
  return path ? WebkilnAssetPath(path) : undefined;
}

function resourceCosts(costs: EncyclopediaResourceCostDTO[]) {
  return costs.map(cost => ({
    name: cost.name,
    displayName: cost.displayName,
    amount: cost.amount,
    icon: WebkilnAssetPath(`/assets/resources/${cost.name}.png`),
  }));
}

function unitTooltipData(unit: EncyclopediaUnitDTO): UnitTooltipData {
  return {
    name: unit.name,
    description: unit.description,
    portrait: unit.portrait
      ? WebkilnAssetPath(unit.portrait)
      : WebkilnAssetPath(unit.isNaval ? DEFAULT_NAVY_TOOLTIP_PORTRAIT : DEFAULT_ARMY_TOOLTIP_PORTRAIT),
    typeLabel: unit.unitTypeLabel || unit.unitType,
    typeIcon: unitTypeIcon(unit.unitType, unit.isNaval) ?? WebkilnAssetPath(unit.isNaval ? '/assets/icons/I_NaviesQuickButton.png' : '/assets/icons/UnitTypes/I_ArmySpecial.png'),
    tier: unit.tier,
    culture: unit.cultureName || undefined,
    cultureIcon: unit.cultureIcon ? WebkilnAssetPath(unit.cultureIcon) : undefined,
    maxStrength: unit.maxStrength,
    price: unit.price,
    buildTime: unit.buildTimeDays,
    upkeep: unit.upkeep,
    foodConsumption: unit.foodConsumption,
    speed: unit.speed,
    attackSpeed: unit.attackSpeed,
    damage: {
      pierce: unit.pierceDamage,
      crush: unit.crushDamage,
      slash: unit.slashDamage,
    },
    armour: {
      pierce: unit.pierceArmour,
      crush: unit.crushArmour,
      slash: unit.slashArmour,
    },
    resourceCost: resourceCosts(unit.resourceCost),
    monthlyConsumption: resourceCosts(unit.monthlyConsumption),
    immuneToWinterAttrition: unit.immuneToWinterAttrition,
    immuneToDesertAttrition: unit.immuneToDesertAttrition,
    canAttackWhileMoving: unit.canAttackWhileMoving,
  };
}

function compareByTierThenName(a: EncyclopediaUnitDTO, b: EncyclopediaUnitDTO): number {
  return a.tier - b.tier || a.name.localeCompare(b.name);
}

function compareBuildingsByName(a: EncyclopediaBuildingDTO, b: EncyclopediaBuildingDTO): number {
  return a.name.localeCompare(b.name);
}

export default function EncyclopediaScreen({ onClose }: Props) {
  const t = useWebUIText();
  const [activeTab, setActiveTab] = useState('articles');
  const ready = useDeferredMount();
  const encyclopedia = useEncyclopediaBridge();
  const entries = encyclopedia?.entries ?? EMPTY_ENTRIES;
  const categories = encyclopedia?.categories ?? EMPTY_CATEGORIES;
  const buildingCultures = encyclopedia?.buildingCultures ?? EMPTY_CULTURES;
  const buildings = encyclopedia?.buildings ?? EMPTY_BUILDINGS;
  const unitCultures = encyclopedia?.unitCultures ?? EMPTY_CULTURES;
  const units = encyclopedia?.units ?? EMPTY_UNITS;

  const tabs = [
    { id: 'articles', label: t('Encyclopedia.Articles') },
    { id: 'buildings', label: t('Encyclopedia.Buildings') },
    { id: 'units', label: t('Encyclopedia.Units') },
  ];

  return (
    <ScreenShell
      title={t('Encyclopedia.ScreenTitle')}
      onClose={onClose}
      advisorTopic="encyclopediaScreen"
      tabs={<SidebarTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />}
      contentClassName="enc-screen-content"
    >
      {ready && activeTab === 'articles' && <ArticlesPanel entries={entries} categories={categories} />}
      {ready && activeTab === 'buildings' && <BuildingsPanel buildings={buildings} cultures={buildingCultures} onClose={onClose} />}
      {ready && activeTab === 'units' && <UnitsPanel units={units} cultures={unitCultures} />}
    </ScreenShell>
  );
}

interface CultureTabsProps {
  cultures: EncyclopediaCultureDTO[];
  activeCulture: string;
  onCultureChange: (cultureId: string) => void;
}

function CultureTabs({ cultures, activeCulture, onCultureChange }: CultureTabsProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startScrollLeft: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const stripWidthRem = cultures.reduce((total, culture) => {
    const iconWidth = culture.icon ? 2.15 : 1.2;
    const textWidth = culture.label.length * 0.58;
    return total + Math.max(7.5, Math.min(15, iconWidth + textWidth));
  }, 0);

  const wheelDeltaPixels = useCallback((event: ReactWheelEvent<HTMLDivElement>): number => {
    const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (event.deltaMode === 1) return rawDelta * 42;
    if (event.deltaMode === 2) {
      return rawDelta * ((viewportRef.current?.clientWidth ?? 0) * 0.85);
    }
    return rawDelta;
  }, []);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || viewport.scrollWidth <= viewport.clientWidth) return;

    const delta = wheelDeltaPixels(event);
    if (delta === 0) return;

    event.preventDefault();
    viewport.scrollLeft += delta;
  }, [wheelDeltaPixels]);

  const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (event.button !== 0 || !viewport || viewport.scrollWidth <= viewport.clientWidth) return;

    dragRef.current = {
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
    };
    suppressClickRef.current = false;
  }, []);

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport) return;

    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 3) suppressClickRef.current = true;
    event.preventDefault();
    viewport.scrollLeft = drag.startScrollLeft - delta;
  }, []);

  const stopDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  return (
    <div className="enc-culture-scroll">
      <div
        ref={viewportRef}
        className="enc-culture-scroll__viewport"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onClickCapture={handleClickCapture}
      >
        <div className="enc-culture-tabs" style={{ width: `${Math.max(1, stripWidthRem)}rem` }}>
          {cultures.map(cultureOption => {
            const icon = cultureOption.icon ? WebkilnAssetPath(cultureOption.icon) : undefined;
            return (
              <button
                key={cultureOption.id}
                className={`enc-culture-tab${activeCulture === cultureOption.id ? ' enc-culture-tab--active' : ''}`}
                onClick={() => onCultureChange(cultureOption.id)}
              >
                {icon && <img src={icon} alt="" draggable={false} />}
                {cultureOption.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ArticlesPanelProps {
  entries: EncyclopediaEntryDTO[];
  categories: string[];
}

function ArticlesPanel({ entries, categories }: ArticlesPanelProps) {
  const t = useWebUIText();
  const [currentEntryId, setCurrentEntryId] = useState<string>(FRONT_PAGE_ID);
  const [searchText, setSearchText] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const byId = useMemo(() => {
    const map = new Map<string, EncyclopediaEntryDTO>();
    for (const entry of entries) map.set(entry.id, entry);
    return map;
  }, [entries]);

  const navigateTo = useCallback((id: string) => {
    setHistory(prev => (currentEntryId ? [...prev, currentEntryId] : prev));
    setCurrentEntryId(id);
  }, [currentEntryId]);

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrentEntryId(prev);
  }, [history]);

  const lowerSearch = searchText.toLowerCase();
  const filteredEntries = searchText.length < 2
    ? entries
    : entries.filter(e =>
        e.title.toLowerCase().includes(lowerSearch) ||
        e.category.toLowerCase().includes(lowerSearch),
      );

  const grouped = useMemo(() => {
    const frontPage = filteredEntries.find(e => e.id === FRONT_PAGE_ID);
    const orderedCategories = categories.length > 0
      ? categories
      : filteredEntries.reduce<string[]>((acc, e) => {
          if (e.id !== FRONT_PAGE_ID && !acc.includes(e.category)) acc.push(e.category);
          return acc;
        }, []);

    const groups: Array<{ category: string; entries: EncyclopediaEntryDTO[] }> = [];
    for (const cat of orderedCategories) {
      const list = filteredEntries.filter(e => e.category === cat && e.id !== FRONT_PAGE_ID);
      if (list.length > 0) groups.push({ category: cat, entries: list });
    }
    return { frontPage, groups };
  }, [filteredEntries, categories]);

  const currentEntry = byId.get(currentEntryId) ?? byId.get(FRONT_PAGE_ID) ?? entries[0];

  if (!currentEntry) {
    return <div className="enc-empty">{t('Encyclopedia.NoArticles')}</div>;
  }

  return (
    <div className="enc-articles">
      {/* Sidebar */}
      <div className="enc-sidebar">
        <div className="enc-sidebar-search">
          <div className="search-field enc-search">
            <img src="/assets/icons/I_Search.png" alt="" className="search-field__icon" draggable={false} />
            <input
              type="text"
              className="search-field__input"
              placeholder={t('Encyclopedia.SearchArticles')}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
        </div>
        <StyledScrollArea className="enc-entry-list">
          {grouped.frontPage && (
            <button
              className={`enc-entry-btn${currentEntryId === FRONT_PAGE_ID ? ' enc-entry-btn--selected' : ''}`}
              onClick={() => navigateTo(FRONT_PAGE_ID)}
            >
              {grouped.frontPage.title}
            </button>
          )}
          {grouped.groups.map(({ category, entries: list }) => (
            <div key={category}>
              <div className="enc-cat-header">{category}</div>
              {list.map(entry => (
                <button
                  key={entry.id}
                  className={`enc-entry-btn${currentEntryId === entry.id ? ' enc-entry-btn--selected' : ''}`}
                  onClick={() => navigateTo(entry.id)}
                >
                  {entry.title}
                </button>
              ))}
            </div>
          ))}
        </StyledScrollArea>
      </div>

      {/* Reader */}
      <div className="enc-reader">
        <div className="enc-reader-header">
          <button
            className={`enc-back-btn${history.length === 0 ? ' enc-back-btn--disabled' : ''}`}
            onClick={goBack}
            disabled={history.length === 0}
            aria-label={t('Common.Back')}
          >
            <span className="enc-back-icon" aria-hidden="true" />
          </button>
          <h2 className="enc-article-title">{currentEntry.title}</h2>
          <span className="enc-article-category">{currentEntry.category}</span>
        </div>
        <StyledScrollArea className="enc-reader-body">
          <div className="enc-article-content">
            <Markdown source={currentEntry.content} entries={byId} onNavigate={navigateTo} />
          </div>
        </StyledScrollArea>
      </div>
    </div>
  );
}

/* Markdown renderer */

// Parses and renders the markdown subset used by Encyclopedia/*.md files.

interface MarkdownProps {
  source: string;
  entries: Map<string, EncyclopediaEntryDTO>;
  onNavigate: (id: string) => void;
}

function Markdown({ source, entries, onNavigate }: MarkdownProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(source), [source]);
  return (
    <>
      {blocks.map((block, i) => renderMarkdownBlock(block, i, entries, onNavigate))}
    </>
  );
}

type MarkdownBlock =
  | { kind: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { kind: 'hr' }
  | { kind: 'ul'; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

function isMarkdownTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.indexOf('|', 1) > 0;
}

function splitMarkdownTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map(cell => cell.trim());
}

function isMarkdownTableDivider(line: string): boolean {
  if (!isMarkdownTableRow(line)) return false;
  const cells = splitMarkdownTableRow(line);
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function normaliseTableRow(row: string[], columnCount: number): string[] {
  const cells = row.slice(0, columnCount);
  while (cells.length < columnCount) cells.push('');
  return cells;
}

function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'p', text: paragraph.join(' ') });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ kind: 'ul', items: list });
      list = [];
    }
  };
  const flushQuote = () => {
    if (quote.length > 0) {
      blocks.push({ kind: 'quote', lines: quote });
      quote = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const raw = lines[lineIndex];
    const line = raw.trim();
    if (line === '') {
      flushAll();
      continue;
    }
    const nextLine = lineIndex + 1 < lines.length ? lines[lineIndex + 1].trim() : '';
    if (isMarkdownTableRow(line) && isMarkdownTableDivider(nextLine)) {
      flushAll();
      const headers = splitMarkdownTableRow(line);
      const rows: string[][] = [];
      lineIndex += 2;
      while (lineIndex < lines.length) {
        const rowLine = lines[lineIndex].trim();
        if (!isMarkdownTableRow(rowLine)) {
          lineIndex--;
          break;
        }
        if (!isMarkdownTableDivider(rowLine)) {
          rows.push(normaliseTableRow(splitMarkdownTableRow(rowLine), headers.length));
        }
        lineIndex++;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }
    if (line === '---' || line === '***' || line === '___') {
      flushAll();
      blocks.push({ kind: 'hr' });
      continue;
    }
    if (line.startsWith('# ')) {
      flushAll();
      blocks.push({ kind: 'h1', text: line.slice(2) });
      continue;
    }
    if (line.startsWith('## ')) {
      flushAll();
      blocks.push({ kind: 'h2', text: line.slice(3) });
      continue;
    }
    if (line.startsWith('### ')) {
      flushAll();
      blocks.push({ kind: 'h3', text: line.slice(4) });
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      flushQuote();
      list.push(line.slice(2));
      continue;
    }
    if (line.startsWith('>')) {
      flushParagraph();
      flushList();
      quote.push(line.replace(/^>\s?/, ''));
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(line);
  }
  flushAll();
  return blocks;
}

function renderMarkdownBlock(
  block: MarkdownBlock,
  key: number,
  entries: Map<string, EncyclopediaEntryDTO>,
  onNavigate: (id: string) => void,
): ReactNode {
  const inline = (text: string) => renderMarkdownInline(text, entries, onNavigate);
  switch (block.kind) {
    case 'h1': return <h1 key={key}>{inline(block.text)}</h1>;
    case 'h2': return <h2 key={key}>{inline(block.text)}</h2>;
    case 'h3': return <h3 key={key}>{inline(block.text)}</h3>;
    case 'p':  return <p key={key} className="enc-md-flow">{inline(block.text)}</p>;
    case 'hr': return <hr key={key} />;
    case 'ul':
      return (
        <div key={key} className="enc-md-list">
          {block.items.map((item, i) => (
            <div key={i} className="enc-md-list-item">
              <span className="enc-md-list-marker" />
              <span className="enc-md-list-item-body">{inline(item)}</span>
            </div>
          ))}
        </div>
      );
    case 'quote':
      return (
        <blockquote key={key}>
          {block.lines.map((line, i) => <p key={i} className="enc-md-flow">{inline(line)}</p>)}
        </blockquote>
      );
    case 'table':
      return (
        <div key={key} className={`enc-md-table enc-md-table--cols-${Math.min(block.headers.length, 4)}`}>
          <div className="enc-md-table-row enc-md-table-row--head">
            {block.headers.map((header, i) => (
              <div key={i} className="enc-md-table-cell enc-md-table-cell--head">
                {inline(header)}
              </div>
            ))}
          </div>
          {block.rows.map((row, rowIndex) => (
            <div key={rowIndex} className="enc-md-table-row">
              {row.map((cell, cellIndex) => (
                <div key={cellIndex} className="enc-md-table-cell">
                  {inline(cell)}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
  }
}

function isWhitespaceChar(value: string): boolean {
  return value.trim().length === 0;
}

function pushMarkdownTextNodes(nodes: ReactNode[], text: string): void {
  let token = '';
  let pendingSpace = false;

  const flushSpace = () => {
    if (!pendingSpace) return;
    nodes.push(<span key={`space-${nodes.length}`} className="enc-md-space" />);
    pendingSpace = false;
  };

  const flushToken = () => {
    if (token.length === 0) return;
    flushSpace();
    nodes.push(
      <span key={`token-${nodes.length}`} className="enc-md-token">
        {token}
      </span>,
    );
    token = '';
  };

  for (const char of text) {
    if (isWhitespaceChar(char)) {
      flushToken();
      pendingSpace = true;
    } else {
      token += char;
    }
  }

  flushToken();
  flushSpace();
}

function decodeMarkdownUrlValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getConceptIconPath(conceptId: string): string {
  return conceptIconPath(conceptId);
}

function renderMarkdownInline(
  text: string,
  entries: Map<string, EncyclopediaEntryDTO>,
  onNavigate: (id: string) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buffer = '';
  let i = 0;

  const flushBuffer = () => {
    if (buffer.length > 0) {
      pushMarkdownTextNodes(nodes, buffer);
      buffer = '';
    }
  };

  while (i < text.length) {
    // Icon: ![alt](ConceptId)
    if (text[i] === '!' && text[i + 1] === '[') {
      const close = text.indexOf(']', i + 2);
      if (close > 0 && text[close + 1] === '(') {
        const paren = text.indexOf(')', close + 2);
        if (paren > 0) {
          const conceptId = text.slice(close + 2, paren);
          flushBuffer();
          nodes.push(
            <img
              key={nodes.length}
              className="enc-md-icon"
              src={getConceptIconPath(conceptId)}
              alt=""
              draggable={false}
            />,
          );
          i = paren + 1;
          continue;
        }
      }
    }
    // Link: [text](url)
    if (text[i] === '[') {
      const close = text.indexOf(']', i + 1);
      if (close > 0 && text[close + 1] === '(') {
        const paren = text.indexOf(')', close + 2);
        if (paren > 0) {
          const linkText = text.slice(i + 1, close);
          const url = text.slice(close + 2, paren);
          flushBuffer();
          if (url.startsWith('encyclopedia://')) {
            const id = url.slice('encyclopedia://'.length);
            const exists = entries.has(id);
            nodes.push(
              <span
                key={nodes.length}
                className={`enc-article-link enc-md-inline${exists ? '' : ' enc-article-link--missing'}`}
                onMouseDown={() => { if (exists) onNavigate(id); }}
              >
                {renderMarkdownInline(linkText, entries, onNavigate)}
              </span>,
            );
          } else if (url.startsWith('glossary://')) {
            const term = url.slice('glossary://'.length);
            const entry = getGlossaryEntry(term);
            const content = entry ?? { title: decodeMarkdownUrlValue(term).replace(/[_-]+/g, ' ').trim() || linkText };
            nodes.push(
              <Tooltip key={nodes.length} content={content} position="top" inline>
                <span className="enc-article-def text-with-help enc-md-inline">
                  {renderMarkdownInline(linkText, entries, onNavigate)}
                </span>
              </Tooltip>,
            );
          } else {
            nodes.push(
              <span key={nodes.length} className="enc-article-link enc-article-link--missing enc-md-inline">
                {renderMarkdownInline(linkText, entries, onNavigate)}
              </span>,
            );
          }
          i = paren + 1;
          continue;
        }
      }
    }
    // Bold: **text**
    if (text[i] === '*' && text[i + 1] === '*') {
      const close = text.indexOf('**', i + 2);
      if (close > 0) {
        flushBuffer();
        nodes.push(
          <strong key={nodes.length} className="enc-md-strong enc-md-inline">
            {renderMarkdownInline(text.slice(i + 2, close), entries, onNavigate)}
          </strong>,
        );
        i = close + 2;
        continue;
      }
    }
    // Italic: *text*
    if (text[i] === '*') {
      const close = text.indexOf('*', i + 1);
      if (close > 0) {
        flushBuffer();
        nodes.push(
          <span key={nodes.length} className="enc-md-em enc-md-inline">
            {renderMarkdownInline(text.slice(i + 1, close), entries, onNavigate)}
          </span>,
        );
        i = close + 1;
        continue;
      }
    }
    buffer += text[i];
    i++;
  }
  flushBuffer();
  return nodes;
}

/* ═══════════════════════════════════════════════════════════════════
   BUILDINGS PANEL
   Culture group filter + category filter + building chains
   ═══════════════════════════════════════════════════════════════════ */

interface BuildingsPanelProps {
  buildings: EncyclopediaBuildingDTO[];
  cultures: EncyclopediaCultureDTO[];
  onClose: () => void;
}

function BuildingsPanel({ buildings, cultures, onClose }: BuildingsPanelProps) {
  const [culture, setCulture] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<BuildingCategory>>(new Set(BUILDING_CATEGORIES));

  const activeCulture = selectedCultureId(cultures, culture);
  const lowerSearch = searchText.toLowerCase();
  const placeOnMapLabel = webUIText('BottomBar.BuildingPlacement.PlaceOnMap');

  const placeBuildingOnMap = useCallback((building: EncyclopediaBuildingDTO) => {
    startBuildingPlacementBridge(building.assetKey)
      .then(response => {
        if (response.active) onClose();
      })
      .catch(acknowledgeBridgeFailure);
  }, [onClose]);

  const toggleCategory = (category: BuildingCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        if (next.size > 1) next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const cultureBuildings = useMemo(() => (
    buildings.filter(building => building.cultureId === activeCulture)
  ), [activeCulture, buildings]);

  const chains = useMemo(() => {
    const byId = new Map(cultureBuildings.map(building => [building.id, building]));
    const childrenByParent = new Map<string, EncyclopediaBuildingDTO[]>();

    for (const building of cultureBuildings) {
      if (!building.developedFrom || !byId.has(building.developedFrom)) continue;
      const siblings = childrenByParent.get(building.developedFrom) ?? [];
      siblings.push(building);
      childrenByParent.set(building.developedFrom, siblings);
    }

    for (const children of childrenByParent.values()) {
      children.sort(compareBuildingsByName);
    }

    const roots = cultureBuildings
      .filter(building => !building.developedFrom || !byId.has(building.developedFrom))
      .sort(compareBuildingsByName);

    const result: BuildingChain[] = [];
    const walk = (building: EncyclopediaBuildingDTO, chain: BuildingChain, seen: Set<string>) => {
      if (seen.has(building.id)) {
        result.push(chain);
        return;
      }

      const nextSeen = new Set(seen);
      nextSeen.add(building.id);
      const children = (childrenByParent.get(building.id) ?? []).filter(child => !nextSeen.has(child.id));
      if (children.length === 0) {
        result.push(chain);
        return;
      }

      for (const child of children) {
        walk(child, [...chain, child], nextSeen);
      }
    };

    for (const root of roots) {
      walk(root, [root], new Set());
    }

    return result;
  }, [cultureBuildings]);

  const filteredByCategory = useMemo(() => {
    const result: Partial<Record<BuildingCategory, BuildingChain[]>> = {};
    for (const category of BUILDING_CATEGORIES) {
      if (!activeCategories.has(category)) continue;
      const categoryChains = chains
        .filter(chain => normaliseBuildingCategory(chain[0].category) === category)
        .filter(chain => {
          if (searchText.length < 2) return true;
          return chain.some(building => (
            building.name.toLowerCase().includes(lowerSearch)
            || building.description.toLowerCase().includes(lowerSearch)
          ));
        });
      if (categoryChains.length > 0) result[category] = categoryChains;
    }
    return result;
  }, [activeCategories, chains, lowerSearch, searchText.length]);

  return (
    <div className="enc-buildings">
      <div className="enc-toolbar">
        <CultureTabs cultures={cultures} activeCulture={activeCulture} onCultureChange={setCulture} />
        <div className="search-field enc-search">
          <img src="/assets/icons/I_Search.png" alt="" className="search-field__icon" draggable={false} />
          <input
            type="text"
            className="search-field__input"
            placeholder={webUIText('Auto.Attr.ComponentsScreensEncyclopediaScreen.646.1')}
            value={searchText}
            onChange={event => setSearchText(event.target.value)}
          />
        </div>
      </div>
      <div className="enc-toolbar">
        <div className="enc-cat-pills">
          {BUILDING_CATEGORIES.map(category => (
            <button
              key={category}
              className={`enc-cat-pill${activeCategories.has(category) ? ' enc-cat-pill--active' : ''}`}
              style={{ color: activeCategories.has(category) ? BUILDING_CAT_COLORS[category] : undefined }}
              onClick={() => toggleCategory(category)}
            >
              {buildingCategoryLabel(category)}
            </button>
          ))}
        </div>
      </div>

      <StyledScrollArea className="enc-buildings-body" viewportClassName="enc-catalogue-scroll__viewport">
        {Object.keys(filteredByCategory).length === 0 && (
          <div className="enc-empty"><WebUIText textKey="Auto.ComponentsScreensEncyclopediaScreen.670.1" /></div>
        )}
        {(Object.entries(filteredByCategory) as [BuildingCategory, BuildingChain[]][]).map(([category, categoryChains]) => (
          <div key={category} className={`enc-bldg-category enc-bldg-cat--${category}`}>
            <div className="enc-bldg-cat-heading">
              <span className="enc-bldg-cat-name">{buildingCategoryLabel(category)}</span>
              <span className="enc-bldg-cat-count">
                {formatNumber(categoryChains.reduce((count, chain) => count + chain.length, 0))}
              </span>
              <div className="enc-bldg-cat-rule" />
            </div>
            <div className="enc-bldg-chains">
              {categoryChains.map(chain => (
                <div key={chain.map(building => building.id).join('>')} className="enc-bldg-chain">
                  {chain.map((building, index) => {
                    const portrait = buildingPortrait(building);
                    const chainLevel = index + 1;
                    const categoryId = normaliseBuildingCategory(building.category);
                    return (
                      <Fragment key={building.id}>
                        {index > 0 && <span className="enc-bldg-arrow" aria-hidden="true" />}
                        <div className="enc-bldg-node-wrap">
                          <Tooltip
                            content={{
                              title: building.name,
                              body: (
                                <>
                                  {building.description && <div>{building.description}</div>}
                                  <BuildingEffects text={building.effectsHtml} />
                                </>
                              ),
                              lines: [
                                { label: webUIText('Auto.Prop.ComponentsScreensEncyclopediaScreen.692.2'), value: building.categoryLabel || buildingCategoryLabel(categoryId), valueColor: BUILDING_CAT_COLORS[categoryId] },
                                { label: webUIText('Auto.Prop.ComponentsScreensEncyclopediaScreen.693.3'), value: formatNumber(chainLevel) },
                              ],
                            }}
                            position="top"
                          >
                            <div className="enc-bldg-node">
                              <div className="enc-bldg-icon">
                                {portrait ? <img src={portrait} alt="" draggable={false} /> : building.name.charAt(0)}
                              </div>
                              <span className="enc-bldg-name">{building.name}</span>
                              <span className="enc-bldg-level">{webUIText('EncyclopediaScreen.Level', { Value1: formatNumber(chainLevel) })}</span>
                            </div>
                          </Tooltip>
                          <div className="enc-bldg-place-wrap">
                            <Tooltip
                              content={{ title: placeOnMapLabel, body: webUIText('BottomBar.BuildingPlacement.PlaceOnMapBody') }}
                              position="top"
                              delay={150}
                            >
                              <button
                                type="button"
                                className="enc-bldg-place-btn"
                                aria-label={webUIText('BottomBar.BuildingPlacement.PlaceNamedOnMap', { Name: building.name })}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  placeBuildingOnMap(building);
                                }}
                              >
                                <img src="/assets/icons/I_Region.png" alt="" className="enc-bldg-place-icon" draggable={false} />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </StyledScrollArea>
    </div>
  );
}

interface UnitsPanelProps {
  units: EncyclopediaUnitDTO[];
  cultures: EncyclopediaCultureDTO[];
}

function UnitsPanel({ units, cultures }: UnitsPanelProps) {
  const [culture, setCulture] = useState('');
  const [searchText, setSearchText] = useState('');

  const activeCulture = selectedCultureId(cultures, culture);
  const lowerSearch = searchText.toLowerCase();

  const filtered = useMemo(() => (
    units.filter(unit => {
      if (unit.cultureId !== activeCulture) return false;
      if (searchText.length >= 2) {
        const nameMatches = unit.name.toLowerCase().includes(lowerSearch);
        const typeMatches = unit.unitTypeLabel.toLowerCase().includes(lowerSearch);
        return nameMatches || typeMatches;
      }
      return true;
    })
  ), [activeCulture, lowerSearch, searchText.length, units]);

  const armyByType = useMemo(() => {
    const result: Record<string, EncyclopediaUnitDTO[]> = {};
    for (const type of ARMY_TYPE_ORDER) {
      const typeUnits = filtered
        .filter(unit => !unit.isNaval && unit.unitType === type)
        .sort(compareByTierThenName);
      if (typeUnits.length > 0) result[type] = typeUnits;
    }
    return result;
  }, [filtered]);

  const navyByType = useMemo(() => {
    const result: Record<string, EncyclopediaUnitDTO[]> = {};
    for (const type of NAVY_TYPE_ORDER) {
      const typeUnits = filtered
        .filter(unit => unit.isNaval && unit.unitType === type)
        .sort(compareByTierThenName);
      if (typeUnits.length > 0) result[type] = typeUnits;
    }
    return result;
  }, [filtered]);

  const hasArmy = Object.keys(armyByType).length > 0;
  const hasNavy = Object.keys(navyByType).length > 0;

  return (
    <div className="enc-units">
      <div className="enc-toolbar">
        <CultureTabs cultures={cultures} activeCulture={activeCulture} onCultureChange={setCulture} />
        <div className="search-field enc-search">
          <img src="/assets/icons/I_Search.png" alt="" className="search-field__icon" draggable={false} />
          <input
            type="text"
            className="search-field__input"
            placeholder={webUIText('Auto.Attr.ComponentsScreensEncyclopediaScreen.783.4')}
            value={searchText}
            onChange={event => setSearchText(event.target.value)}
          />
        </div>
      </div>

      <StyledScrollArea className="enc-units-body" viewportClassName="enc-catalogue-scroll__viewport">
        {!hasArmy && !hasNavy && (
          <div className="enc-empty"><WebUIText textKey="Auto.ComponentsScreensEncyclopediaScreen.793.2" /></div>
        )}

        {ARMY_TYPE_ORDER.map(type => {
          const typeUnits = armyByType[type];
          if (!typeUnits) return null;
          const icon = unitTypeIcon(type);
          return (
            <div key={type} className="enc-unit-row enc-unit-row--army">
              <div className="enc-unit-row-heading">
                {icon && <img className="enc-unit-row-icon" src={icon} alt="" draggable={false} />}
                <span className="enc-unit-type-name">{typeUnits[0]?.unitTypeLabel || type}</span>
                <span className="enc-unit-row-count">{formatNumber(typeUnits.length)}</span>
                <div className="enc-unit-row-rule" />
              </div>
              <div className="enc-unit-grid">
                {typeUnits.map(unit => (
                  <UnitCard key={unit.id} unit={unit} />
                ))}
              </div>
            </div>
          );
        })}

        {hasArmy && hasNavy && (
          <div className="enc-navy-divider">
            <span className="enc-navy-divider-line" />
            <span className="enc-navy-divider-label"><WebUIText textKey="Auto.ComponentsScreensEncyclopediaScreen.823.3" /></span>
            <span className="enc-navy-divider-line" />
          </div>
        )}

        {NAVY_TYPE_ORDER.map(type => {
          const typeUnits = navyByType[type];
          if (!typeUnits) return null;
          const icon = unitTypeIcon(type, true);
          return (
            <div key={type} className="enc-unit-row enc-unit-row--navy">
              <div className="enc-unit-row-heading">
                {icon && <img className="enc-unit-row-icon" src={icon} alt="" draggable={false} />}
                <span className="enc-unit-type-name">{typeUnits[0]?.unitTypeLabel || type}</span>
                <span className="enc-unit-row-count">{formatNumber(typeUnits.length)}</span>
                <div className="enc-unit-row-rule" />
              </div>
              <div className="enc-unit-grid">
                {typeUnits.map(unit => (
                  <UnitCard key={unit.id} unit={unit} />
                ))}
              </div>
            </div>
          );
        })}
      </StyledScrollArea>
    </div>
  );
}

function UnitCard({ unit }: { unit: EncyclopediaUnitDTO }) {
  const tierIcon = WebkilnAssetPath(TIER_ICONS[unit.tier] ?? TIER_ICONS[1]);
  const portrait = unit.portrait ? WebkilnAssetPath(unit.portrait) : undefined;

  return (
    <Tooltip
      content={{ afterLines: <UnitTooltip data={unitTooltipData(unit)} /> }}
      position="top"
    >
      <div className="enc-unit-card">
        <div className="enc-unit-portrait">
          {portrait ? (
            <img src={portrait} alt={unit.name} draggable={false} />
          ) : (
            <span className="enc-unit-portrait-placeholder">
              {unit.name.charAt(0)}
            </span>
          )}
          <div className="enc-unit-tier">
            <img src={tierIcon} alt={webUIText('Auto.Attr.componentsscreensEncyclopediaScreen.881.1', { Tier: unit.tier })} draggable={false} />
          </div>
        </div>
        <span className="enc-unit-card-name">{unit.name}</span>
        <span className="enc-unit-card-type">{unit.unitTypeLabel || unit.unitType}</span>
        <div className="enc-unit-stats-row">
          <span className="enc-unit-stat"><img className="enc-unit-stat-icon" src={WebkilnAssetPath('/assets/icons/I_Damage_Slash.png')} alt="" draggable={false} /><span className="enc-unit-stat-val">{formatNumber(unit.attack)}</span></span>
          <span className="enc-unit-stat"><img className="enc-unit-stat-icon" src={WebkilnAssetPath('/assets/icons/I_Armour_Slash.png')} alt="" draggable={false} /><span className="enc-unit-stat-val">{formatNumber(unit.armour)}</span></span>
          <span className="enc-unit-stat"><img className="enc-unit-stat-icon" src={WebkilnAssetPath('/assets/icons/I_Swords.png')} alt="" draggable={false} /><span className="enc-unit-stat-val">{formatNumber(unit.attackSpeed, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span></span>
          <span className="enc-unit-stat"><img className="enc-unit-stat-icon" src={WebkilnAssetPath('/assets/icons/I_Speed.png')} alt="" draggable={false} /><span className="enc-unit-stat-val">{formatNumber(unit.speed)}</span></span>
        </div>
      </div>
    </Tooltip>
  );
}

registerTopbarButton({
  id: 'encyclopedia',
  get label() { return webUIText('Topbar.Encyclopedia'); },
  labelKey: 'Topbar.Encyclopedia',
  icon: '/assets/icons/I_Encyclopedia.png',
  placement: 'right',
  tooltip: {
    get title() { return webUIText('Topbar.Encyclopedia'); },
    titleKey: 'Topbar.Encyclopedia',
    get body() { return webUIText('Topbar.EncyclopediaTooltipBody'); },
    bodyKey: 'Topbar.EncyclopediaTooltipBody',
    lines: [
      {
        get label() { return webUIText('Topbar.EncyclopediaTooltipLineOne'); },
        labelKey: 'Topbar.EncyclopediaTooltipLineOne',
      },
      {
        get label() { return webUIText('Topbar.EncyclopediaTooltipLineTwo'); },
        labelKey: 'Topbar.EncyclopediaTooltipLineTwo',
      },
    ],
  },
  order: 80,
});
registerScreen({
  id: 'encyclopedia',
  render: ({ onClose }) => <EncyclopediaScreen onClose={onClose} />,
  topbarId: 'encyclopedia',
  advisorTopic: 'encyclopediaScreen',
});
