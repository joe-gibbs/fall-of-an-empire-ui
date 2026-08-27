import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode, type UIEvent } from 'react';
import Portrait, { type PortraitBorderTier } from '../../common/portraits/Portrait';
import Tooltip from '../../common/tooltips/Tooltip';
import CloseButton from '../../common/buttons/CloseButton';
import { StyledScrollbar } from '../../common/layout/scrolling/StyledScrollArea';
import ModalDragHandle from '../../common/layout/shell/ModalDragHandle';
import { TraitIcon } from '../../common/entities/TraitIcon';
import type { CharacterTrait, PortraitLayerData } from '../../../data/types';
import { getStatColor } from '../../../utils/colorFormatters';
import { formatNumber } from '../../../utils/numberFormat';
import { UI_PERFORMANCE } from '../../../config/uiPerformance';
import { UI_PRESENTATION } from '../../../config/presentation';
import { useDraggableOffset } from '../../../hooks/useDraggableOffset';
import type { CandidateModalPrefix } from './CandidateSelectionUtils';
import './CandidateSelectionModal.css';

import { webUIText } from '../../../localization/WebUITextContext';
const CANDIDATE_LIST_VIRTUALISE_THRESHOLD = UI_PERFORMANCE.virtualListThreshold;
const CANDIDATE_LIST_OVERSCAN = 6;
const CANDIDATE_ROW_HEIGHT_REM = 4;
const DEFAULT_ROOT_FONT_SIZE = UI_PRESENTATION.rootFontSizePx;

function currentRootFontSize(): number {
  const parsed = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ROOT_FONT_SIZE;
}

interface CandidateModalFrameProps {
  prefix: CandidateModalPrefix;
  closing: boolean;
  onClose: () => void;
  headerIcon: string;
  title: string;
  modalClassName?: string;
  children: ReactNode;
}

export function CandidateModalFrame({
  prefix,
  closing,
  onClose,
  headerIcon,
  title,
  modalClassName,
  children,
}: CandidateModalFrameProps) {
  const { offsetStyle, onHandleMouseDown } = useDraggableOffset({ disabled: closing });

  return (
    <div
      className={`${prefix}-overlay${closing ? ` ${prefix}-overlay--closing` : ''}`}
      onClick={event => {
        if (event.button !== 0) return;
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="modal-drag-frame" style={offsetStyle}>
        <div
          className={`modal ${prefix}-modal${modalClassName ? ` ${modalClassName}` : ''}${closing ? ` ${prefix}-modal--closing` : ''}`}
          onClick={event => event.stopPropagation()}
        >
          <ModalDragHandle className={`${prefix}-drag-handle`} onMouseDown={onHandleMouseDown} />
          <CandidateModalHeader prefix={prefix} icon={headerIcon} title={title} onClose={onClose} />
          {children}
        </div>
      </div>
    </div>
  );
}

interface CandidateModalHeaderProps {
  prefix: CandidateModalPrefix;
  icon: string;
  title: string;
  onClose: () => void;
}

export function CandidateModalHeader({ prefix, icon, title, onClose }: CandidateModalHeaderProps) {
  return (
    <div className={`${prefix}-header`}>
      <div className={`${prefix}-header-left`}>
        <img src={icon} alt="" className={`${prefix}-header-icon`} draggable={false} />
        <h2 className={`${prefix}-title`}>{title}</h2>
      </div>
      <CloseButton size="sm" onClick={onClose} />
    </div>
  );
}

export function CandidateMissionBar({ prefix, children }: { prefix: CandidateModalPrefix; children: ReactNode }) {
  return <div className={`${prefix}-mission`}>{children}</div>;
}

export function CandidateMissionDescription({ prefix, children }: { prefix: CandidateModalPrefix; children: ReactNode }) {
  return <span className={`${prefix}-mission-desc`}>{children}</span>;
}

interface CandidateMissionStatProps {
  prefix: CandidateModalPrefix;
  label: string;
  value: ReactNode;
  icon?: string;
  className?: string;
}

export function CandidateMissionStat({ prefix, label, value, icon, className }: CandidateMissionStatProps) {
  return (
    <div className={`${prefix}-mission-stat${className ? ` ${className}` : ''}`}>
      {icon && <img src={icon} alt="" className={`${prefix}-mission-stat-icon`} draggable={false} />}
      <span className={`${prefix}-mission-stat-label`}>{label}</span>
      <span className={`${prefix}-mission-stat-value`}>{value}</span>
    </div>
  );
}

export function CandidateBody({ prefix, children }: { prefix: CandidateModalPrefix; children: ReactNode }) {
  return <div className={`${prefix}-body`}>{children}</div>;
}

interface CandidateSortOption<TSort extends string> {
  id: TSort;
  label: string;
}

interface CandidateListPaneProps<TItem, TSort extends string> {
  prefix: CandidateModalPrefix;
  items: TItem[];
  selectedId: string | null;
  getId: (item: TItem) => string;
  activeSort: TSort;
  sortOptions: CandidateSortOption<TSort>[];
  onSortChange: (sort: TSort) => void;
  countLabel: string;
  emptyLabel: string;
  headerAction?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  renderRow: (item: TItem, active: boolean) => ReactNode;
}

export function CandidateListPane<TItem, TSort extends string>({
  prefix,
  items,
  selectedId,
  getId,
  activeSort,
  sortOptions,
  onSortChange,
  countLabel,
  emptyLabel,
  headerAction,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  renderRow,
}: CandidateListPaneProps<TItem, TSort>) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [rootFontSize, setRootFontSize] = useState<number>(DEFAULT_ROOT_FONT_SIZE);

  const useVirtualRows = items.length > CANDIDATE_LIST_VIRTUALISE_THRESHOLD;
  const rowHeight = Math.max(1, rootFontSize * CANDIDATE_ROW_HEIGHT_REM);
  const visibleCount = useVirtualRows
    ? Math.ceil((viewportHeight || rowHeight * 10) / rowHeight) + CANDIDATE_LIST_OVERSCAN * 2
    : items.length;
  const startIndex = useVirtualRows
    ? Math.max(0, Math.floor(scrollTop / rowHeight) - CANDIDATE_LIST_OVERSCAN)
    : 0;
  const endIndex = useVirtualRows
    ? Math.min(items.length, startIndex + visibleCount)
    : items.length;
  const topSpacer = useVirtualRows ? startIndex * rowHeight : 0;
  const bottomSpacer = useVirtualRows ? Math.max(0, items.length - endIndex) * rowHeight : 0;
  const visibleItems = useVirtualRows ? items.slice(startIndex, endIndex) : items;
  const bodyContentSignal = `${items.length}:${useVirtualRows ? 1 : 0}:${rowHeight}`;
  const showSearch = typeof onSearchChange === 'function';

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
    setViewportHeight(event.currentTarget.clientHeight);
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      setRootFontSize(currentRootFontSize());
      const viewport = viewportRef.current;
      if (viewport) setViewportHeight(viewport.clientHeight);
    };

    const id = window.setTimeout(updateViewport, 0);
    window.addEventListener('resize', updateViewport);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', updateViewport);
    };
  }, [items.length, useVirtualRows]);

  useEffect(() => {
    if (!useVirtualRows) return;

    const id = window.setTimeout(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollTop = 0;
      setScrollTop(0);
      setViewportHeight(viewport.clientHeight);
    }, 0);

    return () => window.clearTimeout(id);
  }, [activeSort, items.length, searchValue, useVirtualRows]);

  return (
    <div className={`${prefix}-list-pane`}>
      <div className={`${prefix}-list-head`}>
        <span className={`${prefix}-list-count`}>{countLabel}</span>
        {headerAction}
        <div className={`${prefix}-list-sort-group`}>
          {sortOptions.map(option => (
            <button
              key={option.id}
              type="button"
              className={`${prefix}-list-sort-btn${activeSort === option.id ? ` ${prefix}-list-sort-btn--active` : ''}`}
              onClick={() => onSortChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {showSearch && (
        <div className={`${prefix}-list-search`}>
          <input
            type="search"
            className={`${prefix}-list-search-input`}
            value={searchValue ?? ''}
            onChange={event => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      <div ref={scrollFrameRef} className="candidate-list-scroll-frame styled-scroll-area styled-scroll-area--fill">
        <div
          ref={viewportRef}
          className={`styled-scroll-area__viewport ${prefix}-list-scroll${useVirtualRows ? ' candidate-list-scroll--virtualized' : ''}`}
          onScroll={useVirtualRows ? handleScroll : undefined}
        >
          {items.length === 0 ? (
            <div className={`${prefix}-empty`}>{emptyLabel}</div>
          ) : (
            <>
              {topSpacer > 0 && <div className="candidate-list-spacer" style={{ height: topSpacer }} />}
              {visibleItems.map(item => renderRow(item, getId(item) === selectedId))}
              {bottomSpacer > 0 && <div className="candidate-list-spacer" style={{ height: bottomSpacer }} />}
            </>
          )}
        </div>
        <StyledScrollbar frameRef={scrollFrameRef} viewportRef={viewportRef} contentSignal={bodyContentSignal} />
      </div>
    </div>
  );
}

interface CandidateRowProps {
  prefix: CandidateModalPrefix;
  active: boolean;
  onSelect: () => void;
  onViewCharacter?: () => void;
  personId?: string;
  resolvePerson?: boolean;
  portraitSrc?: string;
  portraitLayers?: PortraitLayerData;
  portraitName: string;
  name: string;
  subParts?: ReactNode[];
  statIcon?: string;
  statValue?: ReactNode;
  statColor?: string;
  statTooltip?: {
    title?: string;
    body?: string;
    footer?: string;
  };
  score?: ReactNode;
  scoreColor?: string;
  extra?: ReactNode;
  busy?: boolean;
  portraitBorderTier?: PortraitBorderTier;
  activity?: string;
  commanderKind?: string;
  isPlayerCharacter?: boolean;
  isRuler?: boolean;
  isHeir?: boolean;
  isDesignatedHeir?: boolean;
  isPreviousRuler?: boolean;
  tutorialTarget?: string;
}

export function CandidateRow({
  prefix,
  active,
  onSelect,
  onViewCharacter,
  personId,
  resolvePerson = false,
  portraitSrc,
  portraitLayers,
  portraitName,
  name,
  subParts = [],
  statIcon,
  statValue,
  statColor,
  statTooltip,
  score,
  scoreColor,
  extra,
  busy = false,
  portraitBorderTier,
  activity,
  commanderKind,
  isPlayerCharacter,
  isRuler,
  isHeir,
  isDesignatedHeir,
  isPreviousRuler,
  tutorialTarget,
}: CandidateRowProps) {
  const statNode = statValue !== undefined ? (
    <div className={`${prefix}-row-stat`}>
      {statIcon && <img src={statIcon} alt="" className={`${prefix}-row-stat-icon`} draggable={false} />}
      <span className={`${prefix}-row-stat-val`} style={statColor ? { color: statColor } : undefined}>{statValue}</span>
    </div>
  ) : null;

  return (
    <div
      className={`${prefix}-row${active ? ` ${prefix}-row--active` : ''}${busy ? ` ${prefix}-row--busy` : ''}`}
      data-tutorial-target={tutorialTarget}
      onClick={onSelect}
    >
      <div className={`${prefix}-row-portrait`}>
        <Portrait
          personId={personId}
          resolvePerson={resolvePerson}
          src={portraitSrc}
          layers={portraitLayers}
          name={portraitName}
          size="row"
          shape="circle"
          borderTier={portraitBorderTier}
          activity={activity}
          commanderKind={commanderKind}
          isPlayerCharacter={isPlayerCharacter}
          isRuler={isRuler}
          isHeir={isHeir}
          isDesignatedHeir={isDesignatedHeir}
          isPreviousRuler={isPreviousRuler}
        />
      </div>
      <div className={`${prefix}-row-info`}>
        <span className={`${prefix}-row-name`}>{name}</span>
        {subParts.length > 0 && (
          <span className={`${prefix}-row-sub`}>
            {subParts.map((part, index) => (
              <Fragment key={index}>
                {index > 0 && <span className={`${prefix}-row-sub-dot`}>-</span>}
                <span>{part}</span>
              </Fragment>
            ))}
          </span>
        )}
      </div>
      {extra}
      {score !== undefined && (
        <span className={`${prefix}-row-chance`} style={scoreColor ? { color: scoreColor } : undefined}>{score}</span>
      )}
      {statTooltip && statNode ? (
        <Tooltip content={statTooltip} position="top" delay={200}>
          {statNode}
        </Tooltip>
      ) : statNode}
      {onViewCharacter && (
        <Tooltip content={webUIText('Common.View')} position="top" delay={180}>
          <button
            type="button"
            className="candidate-row-view-btn"
            aria-label={webUIText('Common.View')}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onViewCharacter();
            }}
          >
            <img src="/assets/icons/I_Characters.png" alt="" className="candidate-row-view-icon" draggable={false} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export function CandidateDetailPane({ prefix, children }: { prefix: CandidateModalPrefix; children: ReactNode }) {
  return <div className={`${prefix}-detail-pane`}>{children}</div>;
}

interface CandidateHeroProps {
  prefix: CandidateModalPrefix;
  personId?: string;
  resolvePerson?: boolean;
  portraitSrc?: string;
  portraitLayers?: PortraitLayerData;
  name: string;
  title?: string;
}

export function CandidateHero({ prefix, personId, resolvePerson = false, portraitSrc, portraitLayers, name, title }: CandidateHeroProps) {
  return (
    <div className={`${prefix}-hero`}>
      <Portrait personId={personId} resolvePerson={resolvePerson} src={portraitSrc} layers={portraitLayers} name={name} size="hero" shape="rect" showBorder={false} />
      <div className={`${prefix}-hero-scrim`}>
        {title && <span className={`${prefix}-hero-title`}>{title}</span>}
        <span className={`${prefix}-hero-name`}>{name}</span>
      </div>
    </div>
  );
}

interface CandidateChanceBlockProps {
  prefix: CandidateModalPrefix;
  label: string;
  tier: string;
  colour: string;
  value: ReactNode;
  scale: number;
  valueIcon?: string;
  valueMaxLabel?: string;
  fillClassName?: string;
  bonusLabel?: string;
  bonusValue?: ReactNode;
}

export function CandidateChanceBlock({
  prefix,
  label,
  tier,
  colour,
  value,
  scale,
  valueIcon,
  valueMaxLabel,
  fillClassName = '',
  bonusLabel,
  bonusValue,
}: CandidateChanceBlockProps) {
  const clampedScale = Math.max(0, Math.min(1, scale));
  return (
    <div className={`${prefix}-chance-block`}>
      <div className={`${prefix}-chance-head`}>
        <div className={`${prefix}-chance-head-left`}>
          <span className={`${prefix}-chance-label`}>{label}</span>
          <span className={`${prefix}-chance-tier`} style={{ color: colour }}>
            {tier}
          </span>
        </div>
        <div className={`${prefix}-chance-value-wrap`}>
          {valueIcon && <img src={valueIcon} alt="" className={`${prefix}-chance-stat-icon`} />}
          <span className={`${prefix}-chance-value`} style={{ color: colour }}>
            {value}
          </span>
          {valueMaxLabel && <span className={`${prefix}-chance-value-max`}>{valueMaxLabel}</span>}
        </div>
      </div>
      <div className={`${prefix}-chance-bar`}>
        <div
          className={`${prefix}-chance-bar-fill${fillClassName ? ` ${fillClassName}` : ''}`}
          style={{ transform: `scaleX(${clampedScale})` }}
        />
        <span className={`${prefix}-chance-bar-tick`} style={{ left: '25%' }} />
        <span className={`${prefix}-chance-bar-tick`} style={{ left: '50%' }} />
        <span className={`${prefix}-chance-bar-tick`} style={{ left: '75%' }} />
      </div>
      {bonusLabel && (
        <div className={`${prefix}-chance-bonus`}>
          <span className={`${prefix}-chance-bonus-label`}>{bonusLabel}</span>
          <span className={`${prefix}-chance-bonus-val`}>{bonusValue}</span>
        </div>
      )}
    </div>
  );
}

interface CandidateStatChip {
  key: string;
  label: string;
  icon: string;
  value: number;
  color?: string;
  primary?: boolean;
  tooltipBody?: string;
  extra?: ReactNode;
}

export function CandidateStatChips({ prefix, stats }: { prefix: CandidateModalPrefix; stats: CandidateStatChip[] }) {
  return (
    <div className={`${prefix}-stat-row`}>
      {stats.map(stat => (
        <Tooltip
          key={stat.key}
          position="top"
          delay={200}
          content={{
            title: stat.label,
            body: stat.tooltipBody,
          }}
        >
          <div className={`${prefix}-stat-chip${stat.primary ? ` ${prefix}-stat-chip--primary` : ''}`}>
            <img src={stat.icon} alt="" className={`${prefix}-stat-chip-icon`} />
            <span className={`${prefix}-stat-chip-val`} style={{ color: stat.color ?? getStatColor(stat.value) }}>
              {formatNumber(stat.value)}
            </span>
            {stat.extra}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}

export function CandidateSection({ prefix, title, children }: { prefix: CandidateModalPrefix; title: string; children: ReactNode }) {
  return (
    <div>
      <div className={`${prefix}-section-label`}>{title}</div>
      {children}
    </div>
  );
}

interface CandidateTraitsProps {
  prefix: CandidateModalPrefix;
  traits: CharacterTrait[];
  formatFooter?: (trait: CharacterTrait) => string | undefined;
}

export function CandidateTraits({ prefix, traits, formatFooter }: CandidateTraitsProps) {
  if (traits.length === 0) return null;

  return (
    <CandidateSection prefix={prefix} title={webUIText('Auto.Attr.ComponentsModalsCandidateSelectionModal.439.1')}>
      <div className={`${prefix}-traits`}>
        {traits.map(trait => (
          <Tooltip
            key={trait.id}
            position="top"
            delay={150}
            content={{
              title: trait.name,
              body: trait.description,
              footer: formatFooter?.(trait),
            }}
          >
            <TraitIcon trait={trait} className={`${prefix}-trait-icon`} />
          </Tooltip>
        ))}
      </div>
    </CandidateSection>
  );
}

export function CandidateFooter({ prefix, children }: { prefix: CandidateModalPrefix; children: ReactNode }) {
  return <div className={`${prefix}-footer`}>{children}</div>;
}
