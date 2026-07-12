import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import type { TutorialSpotlightResponse } from '../../../bridge-types.generated.ts';
import { renderEventTextChunk } from '../../../utils/eventTextFlow';
import { renderRichText } from '../../../utils/richText';
import CloseButton from '../../common/buttons/CloseButton';
import './TutorialSpotlightOverlay.css';

interface TutorialSpotlightOverlayProps {
  spotlight: TutorialSpotlightResponse;
  onResolve: (eventId: string) => void;
  onDismiss: (eventId: string) => void;
  onNavigate: (direction: -1 | 1) => void;
  onLinkClick: (type: string, id: string) => void;
}

interface SpotlightRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface CardSize {
  width: number;
  height: number;
}

type PanelSide = 'top' | 'bottom' | 'left' | 'right' | 'full';

const CUTOUT_PADDING = 8;
const PANEL_GAP = 16;
const EDGE_MARGIN = 16;
const INFO_PANEL_WIDTH = 390;
const INFO_PANEL_HEIGHT = 280;
const DEFAULT_CARD_SIZE: CardSize = { width: INFO_PANEL_WIDTH, height: INFO_PANEL_HEIGHT };

const TARGET_ALIASES: Record<string, string[]> = {
  GoldDisplay: ['GoldDisplay', 'ResourceDisplay'],
  IncomeText: ['IncomeText', 'GoldDisplay', 'ResourceDisplay'],
  LeaderPortrait: ['LeaderPortrait', 'LeaderPortraitSlot'],
  PausePlayButton: ['PausePlayButton', 'TimeControls'],
  SpeedButton: ['SpeedButton', 'TimeControls'],
  SeasonDisplay: ['SeasonDisplay', 'DateDisplay'],
  DateDisplay: ['DateDisplay', 'SeasonDisplay'],
  ScreenButtonGroup: ['ScreenButtonGroup'],
  MilitaryButton: ['MilitaryButton', 'ScreenButton:military'],
  DiplomacyButton: ['DiplomacyButton', 'ScreenButton:diplomacy'],
  FactionButton: ['FactionButton', 'ScreenButton:faction'],
  CharacterSearchButton: ['CharacterSearchButton', 'ScreenButton:characters'],
  PowerBlocsButton: ['PowerBlocsButton', 'ScreenButton:powerblocs'],
  SettlementFinderButton: ['SettlementFinderButton', 'ScreenButton:ledger', 'LedgerButton'],
  EncyclopediaButton: ['EncyclopediaButton', 'ScreenButton:encyclopedia'],
  BuildQueueButton: ['BuildQueueButton'],
  VictoryConditionsButton: ['VictoryConditionsButton'],
  PinnedItemsToggleButton: ['PinnedItemsToggleButton'],
  MapModeButtonGroup: ['MapModeButtonGroup'],
  NewFormationButton: ['NewFormationButton'],
  SettlementDiplomacyButton: ['SettlementDiplomacyButton'],
  DiplomacyTabButton: ['DiplomacyTabButton', 'DiplomacySidebar', 'ScreenContent'],
  GovernorTabButton: ['GovernorTabButton', 'SidebarTab:governors'],
  ProvinceAppointmentsTab: ['ProvinceAppointmentsTab', 'SidebarTab:appointments'],
  ImperialCourtTabButton: ['ImperialCourtTabButton', 'SidebarTab:court'],
  PoliciesTabButton: ['PoliciesTabButton', 'FactionPolicies', 'SidebarTab:overview', 'ScreenContent'],
  MakePeaceButton: ['MakePeaceButton'],
  TotalConquestButton: ['TotalConquestButton', 'PeaceTerm:rebel_conquest', 'PeaceTerm:annex_faction'],
  OfferGiftButton: ['OfferGiftButton', 'Interaction:OfferGift'],
  ProposeMarriageButton: ['ProposeMarriageButton', 'Interaction:ProposeMarriage'],
  MilitaryAllianceOption: ['MilitaryAllianceOption'],
  DiplomatPortrait: ['DiplomatPortrait'],
  SubornFoederatiButton: ['SubornFoederatiButton', 'Interaction:SubornFoederatiInteraction'],
  InviteFoederatiButton: ['InviteFoederatiButton', 'Interaction:InviteFoederatiInteraction'],
  MakePromiseButton: ['MakePromiseButton', 'Interaction:MakePromiseInteraction'],
  TaxRateIncreaseButton: ['TaxRateIncreaseButton', 'Policy:TaxRate'],
  GrandFestivalButton: ['GrandFestivalButton', 'Interaction:GrandFestival'],
  TutorialProgress: ['TutorialProgress'],
  WarningsContainer: ['WarningsContainer'],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normaliseIdentifier(value: string): string {
  const tail = value.split('/').pop()?.split('.').pop() ?? value;
  return tail.replace(/_C$/i, '').toLowerCase();
}

function targetTokens(element: Element): string[] {
  const attr = element.getAttribute('data-tutorial-target') ?? '';
  return attr.split(/\s+/).filter(Boolean);
}

function isVisibleElement(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1 && rect.right > 0 && rect.bottom > 0
    && rect.left < window.innerWidth && rect.top < window.innerHeight;
}

function findByTutorialToken(tokens: string[]): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll('[data-tutorial-target]'));
  for (const token of tokens) {
    const found = candidates.find(element => targetTokens(element).includes(token) && isVisibleElement(element));
    if (found instanceof HTMLElement) return found;
  }
  return null;
}

function findByDetail(attributeName: string, detail: string): HTMLElement | null {
  const expected = normaliseIdentifier(detail);
  if (!expected) return null;

  const candidates = Array.from(document.querySelectorAll(`[${attributeName}]`));
  for (const element of candidates) {
    const value = element.getAttribute(attributeName) ?? '';
    if (normaliseIdentifier(value) === expected && isVisibleElement(element) && element instanceof HTMLElement) {
      return element;
    }
  }
  return null;
}

function findSpotlightTarget(spotlight: TutorialSpotlightResponse): HTMLElement | null {
  if (!spotlight.isVisible) return null;

  if (spotlight.isBuildingTarget && spotlight.targetDetail) {
    const building = findByDetail('data-tutorial-building-id', spotlight.targetDetail);
    if (building) return building;
    window.dispatchEvent(new CustomEvent('tutorial:building-target-request', { detail: spotlight.targetDetail }));
    return null;
  }

  if (spotlight.isUnitTarget && spotlight.targetDetail) {
    const unit = findByDetail('data-tutorial-unit-id', spotlight.targetDetail);
    if (unit) return unit;
    return null;
  }

  const aliases = TARGET_ALIASES[spotlight.target] ?? [spotlight.target];
  return findByTutorialToken([spotlight.target, ...aliases]);
}

function elementUnitCount(element: HTMLElement | null): number {
  if (!element) return 0;
  const raw = element.getAttribute('data-tutorial-unit-count') ?? '0';
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rectForElement(element: HTMLElement | null): SpotlightRect | null {
  if (!element) return null;
  const raw = element.getBoundingClientRect();
  if (raw.width <= 1 || raw.height <= 1) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const left = clamp(raw.left - CUTOUT_PADDING, 0, viewportWidth);
  const top = clamp(raw.top - CUTOUT_PADDING, 0, viewportHeight);
  const right = clamp(raw.right + CUTOUT_PADDING, left, viewportWidth);
  const bottom = clamp(raw.bottom + CUTOUT_PADDING, top, viewportHeight);
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function rectsEqual(left: SpotlightRect | null, right: SpotlightRect | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return Math.abs(left.left - right.left) < 0.5
    && Math.abs(left.top - right.top) < 0.5
    && Math.abs(left.width - right.width) < 0.5
    && Math.abs(left.height - right.height) < 0.5;
}

function splitSpotlightParagraphs(body: string): string[] {
  const paragraphs: string[] = [];
  let current: string[] = [];
  const normalised = body.split('\r\n').join('\n').split('\r').join('\n');

  for (const line of normalised.split('\n')) {
    if (line.trim().length === 0) {
      if (current.length > 0) {
        paragraphs.push(current.join('\n').trim());
        current = [];
      }
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    paragraphs.push(current.join('\n').trim());
  }

  return paragraphs;
}

function panelStyle(side: PanelSide, rect: SpotlightRect | null): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  if (!rect || side === 'full') {
    return { left: 0, top: 0, width: viewportWidth, height: viewportHeight };
  }

  if (side === 'top') return { left: 0, top: 0, width: viewportWidth, height: rect.top };
  if (side === 'bottom') return { left: 0, top: rect.bottom, width: viewportWidth, height: Math.max(0, viewportHeight - rect.bottom) };
  if (side === 'left') return { left: 0, top: rect.top, width: rect.left, height: rect.height };
  return { left: rect.right, top: rect.top, width: Math.max(0, viewportWidth - rect.right), height: rect.height };
}

function cardOverlapsTarget(left: number, top: number, size: CardSize, rect: SpotlightRect): boolean {
  const avoidLeft = rect.left - PANEL_GAP;
  const avoidTop = rect.top - PANEL_GAP;
  const avoidRight = rect.right + PANEL_GAP;
  const avoidBottom = rect.bottom + PANEL_GAP;
  return left < avoidRight
    && left + size.width > avoidLeft
    && top < avoidBottom
    && top + size.height > avoidTop;
}

function clampCardPosition(left: number, top: number, size: CardSize, viewportWidth: number, viewportHeight: number): CSSProperties {
  return {
    left: clamp(left, EDGE_MARGIN, Math.max(EDGE_MARGIN, viewportWidth - size.width - EDGE_MARGIN)),
    top: clamp(top, EDGE_MARGIN, Math.max(EDGE_MARGIN, viewportHeight - size.height - EDGE_MARGIN)),
  };
}

function panelPosition(rect: SpotlightRect | null, cardSize: CardSize): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const size = {
    width: Math.max(1, cardSize.width || INFO_PANEL_WIDTH),
    height: Math.max(1, cardSize.height || INFO_PANEL_HEIGHT),
  };

  if (!rect) {
    return clampCardPosition(
      (viewportWidth - size.width) * 0.5,
      (viewportHeight - size.height) * 0.5,
      size,
      viewportWidth,
      viewportHeight,
    );
  }

  const cutCenterX = (rect.left + rect.right) * 0.5;
  const cutCenterY = (rect.top + rect.bottom) * 0.5;
  const candidates = [
    { left: cutCenterX - size.width * 0.5, top: rect.bottom + PANEL_GAP },
    { left: cutCenterX - size.width * 0.5, top: rect.top - PANEL_GAP - size.height },
    { left: rect.right + PANEL_GAP, top: cutCenterY - size.height * 0.5 },
    { left: rect.left - PANEL_GAP - size.width, top: cutCenterY - size.height * 0.5 },
  ];

  for (const candidate of candidates) {
    const clamped = clampCardPosition(candidate.left, candidate.top, size, viewportWidth, viewportHeight);
    const left = Number(clamped.left);
    const top = Number(clamped.top);
    if (!cardOverlapsTarget(left, top, size, rect)) {
      return clamped;
    }
  }

  return clampCardPosition(cutCenterX - size.width * 0.5, rect.bottom + PANEL_GAP, size, viewportWidth, viewportHeight);
}

export default function TutorialSpotlightOverlay({
  spotlight,
  onResolve,
  onDismiss,
  onNavigate,
  onLinkClick,
}: TutorialSpotlightOverlayProps) {
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const [targetEventId, setTargetEventId] = useState('');
  const [cardSize, setCardSize] = useState<CardSize>(DEFAULT_CARD_SIZE);
  const targetElementRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const eventId = spotlight.eventId;
  const pageTotal = Math.max(0, spotlight.totalPages);
  const pageText = pageTotal > 1 ? `${spotlight.currentPage + 1}/${pageTotal}` : '';
  const bodyParagraphs = useMemo(() => splitSpotlightParagraphs(spotlight.body), [spotlight.body]);

  useEffect(() => {
    if (!spotlight.isVisible) {
      targetElementRef.current = null;
      const frameId = window.requestAnimationFrame(() => {
        setTargetEventId('');
        setTargetRect(null);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    let frameId = 0;
    const tick = () => {
      const element = findSpotlightTarget(spotlight);
      targetElementRef.current = element;
      const nextRect = rectForElement(element);
      setTargetRect(previous => (rectsEqual(previous, nextRect) ? previous : nextRect));
      const nextTargetEventId = nextRect ? eventId : '';
      setTargetEventId(previous => (previous === nextTargetEventId ? previous : nextTargetEventId));
      frameId = window.requestAnimationFrame(tick);
    };

    tick();
    return () => window.cancelAnimationFrame(frameId);
  }, [eventId, spotlight]);

  useEffect(() => {
    if (!spotlight.isVisible) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCardSize(previous => (
        Math.abs(previous.width - rect.width) < 0.5 && Math.abs(previous.height - rect.height) < 0.5
          ? previous
          : { width: rect.width, height: rect.height }
      ));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [spotlight.isVisible, spotlight.title, spotlight.body, spotlight.currentPage, spotlight.totalPages]);

  useEffect(() => {
    if (!spotlight.isVisible || !eventId) return undefined;

    const handler = (event: MouseEvent) => {
      const target = targetElementRef.current;
      if (!target || !(event.target instanceof Node) || !target.contains(event.target)) return;

      if (spotlight.isBuildingTarget) return;

      window.setTimeout(() => {
        if (spotlight.isUnitTarget) {
          const latestTarget = findSpotlightTarget(spotlight);
          if (elementUnitCount(latestTarget) < spotlight.requiredUnitCount) return;
        }

        onResolve(eventId);
      }, 0);
    };

    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [eventId, onResolve, spotlight]);

  const panels = useMemo<PanelSide[]>(() => (targetRect ? ['top', 'bottom', 'left', 'right'] : ['full']), [targetRect]);
  const needsResolvedTarget = spotlight.isBuildingTarget;
  const hasResolvedTarget = targetRect !== null && targetEventId === eventId;

  if (!spotlight.isVisible) return null;
  if (needsResolvedTarget && !hasResolvedTarget) return null;

  const handleNavigateMouseDown = (event: ReactMouseEvent<HTMLButtonElement>, direction: -1 | 1) => {
    event.preventDefault();
    event.stopPropagation();
    if (direction < 0 && !spotlight.canGoBack) return;
    if (direction > 0 && !spotlight.canGoForward) return;
    onNavigate(direction);
  };

  return (
    <div className="tutorial-spotlight-overlay">
      {panels.map(side => (
        <div
          key={side}
          className={`tutorial-spotlight-panel tutorial-spotlight-panel--${side}`}
          style={panelStyle(side, targetRect)}
        />
      ))}
      {targetRect && (
        <div
          className="tutorial-spotlight-cutout"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}
      <div ref={cardRef} className="tutorial-spotlight-card" style={panelPosition(targetRect, cardSize)}>
        <div className="tutorial-spotlight-card-head">
          <h2>{spotlight.title}</h2>
          <CloseButton size="sm" onClick={() => onDismiss(eventId)} />
        </div>
        <div className="tutorial-spotlight-card-body">
          {bodyParagraphs.map((paragraph, index) => (
            <p key={`${index}:${paragraph}`}>
              {renderRichText(paragraph.replace(/\n/g, '<br/>'), {
                onLinkClick,
                blockBullets: true,
                transformText: (chunk, key) => renderEventTextChunk(chunk, `tutorial-spotlight-${String(index)}-${key}`),
              })}
            </p>
          ))}
        </div>
        <div className="tutorial-spotlight-card-foot">
          <button
            type="button"
            className={`tutorial-spotlight-nav${!spotlight.canGoBack ? ' tutorial-spotlight-nav--disabled' : ''}`}
            disabled={!spotlight.canGoBack}
            onMouseDown={(event) => handleNavigateMouseDown(event, -1)}
          >
            <img src="/assets/icons/I_NavPrevious.png" alt="" className="tutorial-spotlight-nav-icon" draggable={false} />
          </button>
          {pageText && <span className="tutorial-spotlight-page">{pageText}</span>}
          <button
            type="button"
            className={`tutorial-spotlight-nav${!spotlight.canGoForward ? ' tutorial-spotlight-nav--disabled' : ''}`}
            disabled={!spotlight.canGoForward}
            onMouseDown={(event) => handleNavigateMouseDown(event, 1)}
          >
            <img src="/assets/icons/I_NavNext.png" alt="" className="tutorial-spotlight-nav-icon" draggable={false} />
          </button>
        </div>
      </div>
    </div>
  );
}
