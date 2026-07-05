import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
/**
 * Horizontal card grid of courtier types, single-select, with a gold cost
 * and Promote/Close footer. Courtier type definitions come from the game's
 * the courtier type registry via the bridge (title, description, portrait, stat
 * ranges, age range).
 */
import { useCallback, useMemo, useState } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import type {
  CourtierType,
  StatKey,
  StatRange,
} from '../../../data/courtierTypes';
import { formatNumber } from '../../../utils/numberFormat';
import { useModalPresence } from '../../../hooks/useModalPresence';
import './CourtierPromotionModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  settlementName?: string;
  playerGold?: number;
  promotionCost?: number;
  types: CourtierType[];
  onPromote?: (courtierTypeId: string) => Promise<{ success: boolean; message: string }>;
}

const STAT_ORDER: StatKey[] = [
  'tactics', 'authority', 'cunning', 'governance', 'loyalty', 'constitution',
];

const STAT_LABEL: Record<StatKey, string> = {
  get tactics() { return webUIText('Common.Tactics'); },
  get authority() { return webUIText('Common.Authority'); },
  get cunning() { return webUIText('Common.Cunning'); },
  get governance() { return webUIText('Common.Governance'); },
  get loyalty() { return webUIText('Common.Loyalty'); },
  get constitution() { return webUIText('Common.Constitution'); },
};

const STAT_ICON: Record<StatKey, string> = {
  tactics:      '/assets/icons/StatIcons/I_Tactics.png',
  authority:    '/assets/icons/StatIcons/I_Authority.png',
  cunning:      '/assets/icons/StatIcons/I_Cunning.png',
  governance:   '/assets/icons/StatIcons/I_Governance.png',
  loyalty:      '/assets/icons/StatIcons/I_Loyalty.png',
  constitution: '/assets/icons/StatIcons/I_Constitution.png',
};

function formatRange(r: StatRange): string { return webUIText("Auto.Fix.Return.componentsmodalsCourtierPromotionModal.53.1", { Value1: formatNumber(r.min), Value2: formatNumber(r.max) }); }
function rangeMid(r: StatRange): number { return (r.min + r.max) / 2; }

function statTint(mid: number): string {
  if (mid >= 6) return 'var(--green-light)';
  if (mid >= 3) return 'var(--green)';
  if (mid >= 0) return 'var(--gold-light)';
  if (mid >= -3) return 'var(--orange)';
  return 'var(--red)';
}

// Courtier type stat distributions are centred on 0 and clamped
// roughly to [-10, +10]. Give the bar a bit of visual breathing room on
// either side so negative values still render as a non-empty track.
const STAT_MIN = -10;
const STAT_MAX = 12;
const STAT_SPAN = STAT_MAX - STAT_MIN;

export default function CourtierPromotionModal({
  open, onClose, settlementName = '', playerGold = 0,
  promotionCost = 500, types, onPromote,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);

  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.courtier-promotion',
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const canAfford = playerGold >= promotionCost;
  const selected = useMemo(
    () => types.find(c => c.id === selectedId) ?? null,
    [types, selectedId],
  );

  const handlePromote = useCallback(() => {
    if (!selected || !canAfford || promoting) return;
    if (!onPromote) {
      close();
      return;
    }
    setPromoting(true);
    onPromote(selected.id).finally(() => setPromoting(false));
  }, [selected, canAfford, close, onPromote, promoting]);

  if (!mounted) return null;

  return (
    <div
      className={`cpm-overlay${closing ? ' cpm-overlay--closing' : ''}`}
      onMouseDown={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        className={`modal cpm-modal${closing ? ' cpm-modal--closing' : ''}`}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <div className="cpm-header">
          <div className="cpm-header-left">
            <img src="/assets/icons/I_Characters.png" alt="" className="cpm-header-icon" draggable={false} />
            <div className="cpm-header-text">
              <h2 className="cpm-title"><WebUIText textKey="Auto.ComponentsModalsCourtierPromotionModal.115.1" /></h2>
              <span className="cpm-subtitle">{settlementName}</span>
            </div>
          </div>
          <CloseButton size="sm" onClick={close} />
        </div>

        <div className="cpm-body">
          <div className="cpm-card-row">
            {types.map((type) => (
              <CourtierCard
                key={type.id}
                type={type}
                selected={selectedId === type.id}
                onSelect={() => setSelectedId(type.id)}
              />
            ))}
          </div>
        </div>

        <div className="cpm-footer">
          <div className={`cpm-cost${canAfford ? '' : ' cpm-cost--broke'}`}>
            <img src="/assets/icons/I_Coins.png" alt="" className="cpm-cost-icon" draggable={false} />
            <span className="cpm-cost-label"><WebUIText textKey="Auto.ComponentsModalsCourtierPromotionModal.138.2" /></span>
            <span className="cpm-cost-value">{formatNumber(promotionCost)}</span>
            <span className="cpm-cost-sep" />
            <span className="cpm-cost-wallet">{webUIText("Auto.Fix.Expr.componentsmodalsCourtierPromotionModal.142.1", { Value1: formatNumber(playerGold) })}</span>
          </div>
          <div className="cpm-footer-actions">
            <GameButton variant="outline" onClick={close}><WebUIText textKey="Auto.ComponentsModalsCourtierPromotionModal.144.3" /></GameButton>
            <button
              type="button"
              className={`btn--burgundy cpm-promote-btn${!selected || !canAfford || promoting ? ' cpm-promote-btn--disabled' : ''}`}
              disabled={!selected || !canAfford || promoting}
              onMouseDown={() => { if (selected && canAfford && !promoting) handlePromote(); }}
            >
              {selected ? webUIText("Auto.Fix.ExprTrue.componentsmodalsCourtierPromotionModal.152.1", { Title: selected.title }) : webUIText("Auto.Fix.ExprFalse.componentsmodalsCourtierPromotionModal.152.1")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourtierCard({
  type, selected, onSelect,
}: {
  type: CourtierType;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Tooltip
      position="top"
      delay={250}
      content={{
        title: type.title,
        body: type.description,
        lines: [
          { label: webUIText('Auto.Prop.ComponentsModalsCourtierPromotionModal.176.1'), isHeader: true },
          ...STAT_ORDER.map((key) => ({
            label: STAT_LABEL[key],
            value: formatRange(type.stats[key]),
            valueColor: statTint(rangeMid(type.stats[key])),
            valueIcon: STAT_ICON[key],
          })),
          { label: webUIText('Auto.Prop.ComponentsModalsCourtierPromotionModal.183.2'), get value() { return webUIText("Auto.Prop.componentsmodalsCourtierPromotionModal.183.1", { Value1: formatNumber(type.ageRange.min), Value2: formatNumber(type.ageRange.max) }); } },
          { label: webUIText('Auto.Prop.ComponentsModalsCourtierPromotionModal.184.3'), get value() { return webUIText("Auto.Prop.componentsmodalsCourtierPromotionModal.184.1", { Value1: formatNumber(type.minTraits), Value2: formatNumber(type.maxTraits) }); } },
        ],
      }}
    >
      <button
        type="button"
        className={`cpm-card${selected ? ' cpm-card--selected' : ''}`}
        onMouseDown={onSelect}
      >
        <div
          className="cpm-card-bg"
          style={{ backgroundImage: `url('${type.background}')` }}
        />
        <img
          src={type.foreground}
          alt=""
          className="cpm-card-fg"
          draggable={false}
        />
        <div className="cpm-card-vignette" />

        {selected && (
          <>
            <span className="cpm-card-corner cpm-card-corner--tl" />
            <span className="cpm-card-corner cpm-card-corner--tr" />
            <span className="cpm-card-corner cpm-card-corner--bl" />
            <span className="cpm-card-corner cpm-card-corner--br" />
          </>
        )}

        <div className="cpm-card-content">
          <div className="cpm-card-title">{type.title}</div>
          <div className="cpm-card-stats">
            {STAT_ORDER.map((key) => {
              const range = type.stats[key];
              const colour = statTint(rangeMid(range));
              const clampedMin = Math.max(STAT_MIN, Math.min(STAT_MAX, range.min));
              const clampedMax = Math.max(STAT_MIN, Math.min(STAT_MAX, range.max));
              const leftPct = ((clampedMin - STAT_MIN) / STAT_SPAN) * 100;
              const widthPct = ((clampedMax - clampedMin) / STAT_SPAN) * 100;
              return (
                <div key={key} className="cpm-stat-row">
                  <img src={STAT_ICON[key]} alt="" className="cpm-stat-icon" draggable={false} />
                  <div className="cpm-stat-track">
                    <span
                      className="cpm-stat-fill"
                      style={{
                        left: `${leftPct.toFixed(2)}%`,
                        width: `${widthPct.toFixed(2)}%`,
                        backgroundColor: colour,
                      }}
                    />
                  </div>
                  <span className="cpm-stat-range" style={{ color: colour }}>
                    {formatRange(range)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </button>
    </Tooltip>
  );
}
