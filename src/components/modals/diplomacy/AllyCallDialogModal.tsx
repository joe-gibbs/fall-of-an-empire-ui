import { useCallback, useMemo, useState } from 'react';
import type { AllyCallDialogAlly, AllyCallDialogEvent } from '../../../bridge-types.generated.ts';
import { webUIText } from '../../../localization/WebUITextContext';
import { successChanceColour } from '../../../utils/colorFormatters';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import CloseButton from '../../common/buttons/CloseButton';
import FactionRoundel from '../../common/entities/FactionRoundel';
import GameButton from '../../common/buttons/GameButton';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import { useModalPresence } from '../../../hooks/useModalPresence';
import './AllyCallDialogModal.css';

interface Props {
  state: AllyCallDialogEvent;
  onRespond: (requestId: string, selectedAllyIds: string[], cancelled: boolean) => void;
}

function strengthLabelKey(ratio: number): string {
  if (ratio > 1.5) return 'Diplomacy.AllyCall.StrengthMuchStronger';
  if (ratio > 1.1) return 'Diplomacy.AllyCall.StrengthStronger';
  if (ratio > 0.9) return 'Diplomacy.AllyCall.StrengthEqual';
  if (ratio > 0.5) return 'Diplomacy.AllyCall.StrengthWeaker';
  return 'Diplomacy.AllyCall.StrengthMuchWeaker';
}

function strengthTone(ratio: number): string {
  if (ratio > 1.1) return 'good';
  if (ratio > 0.9) return 'even';
  if (ratio > 0.5) return 'low';
  return 'bad';
}

function strengthComparisonPercent(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 50;
  if (ratio <= 0.1) return Math.max(0, Math.min(10, 10 - (0.1 - ratio) * 50));
  if (ratio >= 10) return Math.max(90, Math.min(100, 90 + (ratio - 10) * 0.5));

  const logRatio = Math.log(ratio) / Math.log(10);
  return 50 + logRatio * 40;
}

function strengthBarColour(percent: number): 'green' | 'red' | 'gold' {
  if (percent >= 60) return 'green';
  if (percent <= 40) return 'red';
  return 'gold';
}

function impactColour(value: number): string {
  if (value > 0) return 'var(--green-light)';
  if (value < 0) return 'var(--red-light)';
  return 'var(--text-muted)';
}

function formatImpact(value: number): string {
  return `${formatSignedNumber(value)}%`;
}

function formatOpinionImpact(opinion: number, impact: number): string {
  return `${formatSignedNumber(opinion)} (${formatImpact(impact)})`;
}

function limitReasonText(limitReason: string): string {
  switch (limitReason) {
    case 'enemyFavoured':
      return webUIText('Diplomacy.AllyCall.LimitEnemyFavoured');
    case 'enemyOverwhelming':
      return webUIText('Diplomacy.AllyCall.LimitEnemyOverwhelming');
    case 'enemyFriendly':
      return webUIText('Diplomacy.AllyCall.LimitEnemyFriendly');
    case 'allyCold':
      return webUIText('Diplomacy.AllyCall.LimitAllyCold');
    default:
      return webUIText('Diplomacy.AllyCall.LimitUnknown');
  }
}

function buildLikelihoodTooltip(ally: AllyCallDialogAlly): TooltipContent {
  const reason = ally.callLikelihoodReason;
  const lines: TooltipLine[] = [
    {
      label: webUIText('Diplomacy.AllyCall.LikelihoodBase'),
      value: formatPercent(reason.basePercent),
    },
    {
      label: webUIText('Diplomacy.AllyCall.LikelihoodOpinionOfYou'),
      value: formatOpinionImpact(reason.allyOpinion, reason.opinionImpactPercent),
      valueColor: impactColour(reason.opinionImpactPercent),
    },
    {
      label: webUIText('Diplomacy.AllyCall.LikelihoodOpinionOfEnemy'),
      value: formatOpinionImpact(reason.enemyOpinion, reason.enemyOpinionImpactPercent),
      valueColor: impactColour(reason.enemyOpinionImpactPercent),
    },
    {
      label: webUIText('Diplomacy.AllyCall.LikelihoodWarBalance'),
      value: `${formatPercent(reason.strengthBalancePercent)} (${formatImpact(reason.strengthImpactPercent)})`,
      valueColor: impactColour(reason.strengthImpactPercent),
    },
    {
      label: webUIText('Diplomacy.AllyCall.LikelihoodOtherWars'),
      value: reason.activeWarCount > 0
        ? `${formatNumber(reason.activeWarCount)} (${formatImpact(reason.warImpactPercent)})`
        : webUIText('Common.None'),
      valueColor: impactColour(reason.warImpactPercent),
    },
  ];

  if (reason.acceptanceCapPercent < 100 && reason.limitReason) {
    lines.push({
      label: webUIText('Diplomacy.AllyCall.LikelihoodLimit'),
      value: `${limitReasonText(reason.limitReason)} (${formatPercent(reason.acceptanceCapPercent)})`,
      valueColor: 'var(--red-light)',
    });
  }

  return {
    title: webUIText('Diplomacy.AllyCall.LikelihoodTooltipTitle', {
      Chance: formatPercent(ally.callLikelihoodPercent),
    }),
    body: webUIText('Diplomacy.AllyCall.LikelihoodTooltipBody'),
    lines,
  };
}

export default function AllyCallDialogModal({ state, onRespond }: Props) {
  const [selectionByRequest, setSelectionByRequest] = useState<Record<string, string[]>>({});

  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open: state.open,
    onClose: () => onRespond(state.requestId, [], true),
    escapeId: 'modal.ally-call',
    allowFromInput: true,
  });

  const defaultSelectedIds = useMemo(() => (
    state.open ? state.allies.map(ally => ally.id) : []
  ), [state.open, state.allies]);
  const selectedIds = selectionByRequest[state.requestId] ?? defaultSelectedIds;
  const selectedCount = selectedIds.length;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const enemyName = state.enemyName || webUIText('Diplomacy.AllyCall.UnknownEnemy');
  const title = state.isDefensive
    ? webUIText('Diplomacy.AllyCall.DefensiveTitle')
    : webUIText('Diplomacy.AllyCall.OffensiveTitle');
  const subtitle = state.isDefensive
    ? webUIText('Diplomacy.AllyCall.DefensiveSubtitle', { Enemy: enemyName })
    : webUIText('Diplomacy.AllyCall.OffensiveSubtitle', { Enemy: enemyName });
  const cancelText = state.isDefensive
    ? webUIText('Diplomacy.AllyCall.FightAlone')
    : webUIText('Common.Cancel');
  const confirmText = state.isDefensive
    ? webUIText('Diplomacy.AllyCall.CallSelected')
    : webUIText('Diplomacy.AllyCall.DeclareWar');

  const toggleAlly = useCallback((allyId: string) => {
    setSelectionByRequest(selections => {
      const current = selections[state.requestId] ?? defaultSelectedIds;
      const next = current.includes(allyId)
        ? current.filter(id => id !== allyId)
        : [...current, allyId];
      return { ...selections, [state.requestId]: next };
    });
  }, [defaultSelectedIds, state.requestId]);

  const selectAll = useCallback(() => {
    setSelectionByRequest(selections => ({
      ...selections,
      [state.requestId]: state.allies.map(ally => ally.id),
    }));
  }, [state.allies, state.requestId]);

  const deselectAll = useCallback(() => {
    setSelectionByRequest(selections => ({ ...selections, [state.requestId]: [] }));
  }, [state.requestId]);

  const confirm = useCallback(() => {
    onRespond(state.requestId, selectedIds, false);
  }, [onRespond, selectedIds, state.requestId]);

  if (!mounted) return null;

  return (
    <div
      className={`modal-overlay acd-overlay${closing ? ' acd-overlay--closing' : ''}`}
      onMouseDown={close}
    >
      <div
        className={`modal acd-modal${closing ? ' acd-modal--closing' : ''}`}
        onMouseDown={stopPropagation}
      >
        <div className="acd-header">
          <div className="acd-header-left">
            <img src="/assets/icons/I_War.png" alt="" className="acd-header-icon" draggable={false} />
            <div className="acd-header-copy">
              <h2 className="acd-title">{title}</h2>
              <span className="acd-subtitle">{subtitle}</span>
            </div>
          </div>
          <CloseButton size="sm" onClick={close} />
        </div>

        <div className="acd-tools">
          <span className="acd-selected-count">
            {webUIText('Diplomacy.AllyCall.SelectedCount', { Count: selectedCount })}
          </span>
          <div className="acd-tool-buttons">
            <GameButton variant="ghost" onClick={selectAll}>{webUIText('Diplomacy.AllyCall.SelectAll')}</GameButton>
            <GameButton variant="ghost" onClick={deselectAll}>{webUIText('Diplomacy.AllyCall.DeselectAll')}</GameButton>
          </div>
        </div>

        <div className="acd-body">
          {state.allies.length === 0 ? (
            <div className="acd-empty">{webUIText('Diplomacy.AllyCall.NoAllies')}</div>
          ) : (
            state.allies.map(ally => (
              <AllyRow
                key={ally.id}
                ally={ally}
                selected={selectedIdSet.has(ally.id)}
                onToggle={() => toggleAlly(ally.id)}
              />
            ))
          )}
        </div>

        <div className="acd-footer">
          <GameButton variant="outline" onClick={close}>{cancelText}</GameButton>
          <GameButton variant="burgundy" onClick={confirm}>{confirmText}</GameButton>
        </div>
      </div>
    </div>
  );
}

function AllyRow({
  ally,
  selected,
  onToggle,
}: {
  ally: AllyCallDialogAlly;
  selected: boolean;
  onToggle: () => void;
}) {
  const tone = strengthTone(ally.strengthRatio);
  const strengthPercent = strengthComparisonPercent(ally.strengthRatio);

  return (
    <button
      type="button"
      className={`acd-row${selected ? ' acd-row--selected' : ''}`}
      onMouseDown={onToggle}
      aria-pressed={selected}
    >
      <span className="acd-check" />
      <FactionRoundel
        colour={ally.colour}
        secondaryColour={ally.secondaryColour}
        cultureGroup={ally.cultureGroup}
        emblem={ally.emblem}
        name={ally.name}
        size="sm"
      />
      <span className="acd-row-main">
        <span className="acd-row-name">{ally.name}</span>
        <span className="acd-row-strength">
          <span className="acd-row-strength-head">
            <span className={`acd-row-strength-label acd-row-strength-label--${tone}`}>
              {webUIText(strengthLabelKey(ally.strengthRatio))}
            </span>
            <span className="acd-row-strength-value">
              {webUIText('Diplomacy.AllyCall.StrengthValue', { Strength: formatNumber(ally.strength) })}
            </span>
          </span>
          <PaintedBar
            percent={strengthPercent}
            color={strengthBarColour(strengthPercent)}
            className="acd-row-strength-bar"
          />
        </span>
      </span>
      <Tooltip content={buildLikelihoodTooltip(ally)} position="left" variant="sidebar" inline>
        <span className="acd-row-likelihood">
          <span className="acd-row-likelihood-label">
            {webUIText('Diplomacy.AllyCall.AnswerLikelihood')}
          </span>
          <span
            className="acd-row-likelihood-value"
            style={{ color: successChanceColour(ally.callLikelihoodPercent) }}
          >
            {formatPercent(ally.callLikelihoodPercent)}
          </span>
        </span>
      </Tooltip>
    </button>
  );
}
