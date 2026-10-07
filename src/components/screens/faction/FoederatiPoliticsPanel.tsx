import { useEffect, useRef, useState } from 'react';
import { bridgeCall, type FoederatiPoliticalActionView, type FoederatiPoliticsView } from '../../../bridge-types.generated';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { refreshFactionData } from '../../../bridge/diplomacy/useFactionBridge';
import { useGameState } from '../../../context/GameContext';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import GameButton from '../../common/buttons/GameButton';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import Tooltip from '../../common/tooltips/Tooltip';
import './FoederatiPoliticsPanel.css';

const AUTONOMY_STEPS = 3;
const CONFIRM_IDS = new Set(['crackdown', 'independence', 'contestExpansion', 'expand']);
const FOEDERATI_ICON = '/assets/icons/I_InviteFoederati.png';

function autonomyFillPercent(level: number): number {
  return ((Math.max(0, Math.min(AUTONOMY_STEPS - 1, level)) + 1) / AUTONOMY_STEPS) * 100;
}

function FoederatiAutonomyBar({ level, label }: { level: number; label: string }) {
  const fill = autonomyFillPercent(level);
  return (
    <div className="foederati-autonomy-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={AUTONOMY_STEPS - 1} aria-valuenow={level}>
      <div className="foederati-autonomy-track">
        <div className="foederati-autonomy-fill" style={{ transform: `scaleX(${fill / 100})` }} />
      </div>
      <div className="foederati-autonomy-steps" aria-hidden="true">
        {Array.from({ length: AUTONOMY_STEPS }, (_, index) => (
          <span
            key={index}
            className={`foederati-autonomy-step${index === level ? ' foederati-autonomy-step--current' : ''}${index === AUTONOMY_STEPS - 1 ? ' foederati-autonomy-step--last' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

function decisionActions(actions: FoederatiPoliticalActionView[]): FoederatiPoliticalActionView[] {
  const callup = actions.filter(action => action.id === 'acceptCallup' || action.id === 'refuseCallup');
  if (callup.length > 0) return callup;
  const expansion = actions.filter(action => action.id === 'acceptExpansion' || action.id === 'contestExpansion');
  if (expansion.length > 0) return expansion;
  const refuse = actions.filter(action => action.id === 'refuse');
  if (refuse.length === 0) return [];
  const grant = actions.find(action => action.id === 'grant');
  return grant ? [grant, ...refuse] : refuse;
}

function extraActions(actions: FoederatiPoliticalActionView[]): FoederatiPoliticalActionView[] {
  return actions.filter(action => (action.id === 'independence' || action.id === 'expand') && action.available);
}

function stepTooltip(action: FoederatiPoliticalActionView) {
  return { title: action.name, body: action.blockReason || undefined };
}

export function FoederatiPoliticsSummary({ data, compact = false }: { data: FoederatiPoliticsView; compact?: boolean }) {
  const label = data.pendingDecision || data.autonomy;
  return (
    <div className={compact ? 'foederati-summary foederati-summary--compact' : 'foederati-summary'}>
      <FoederatiAutonomyBar level={data.autonomyLevel} label={label || data.autonomy} />
      {label && <span className="foederati-summary-label">{label}</span>}
    </div>
  );
}

function NamedAction({
  action,
  submitting,
  onChoose,
}: {
  action: FoederatiPoliticalActionView;
  submitting: boolean;
  onChoose: (action: FoederatiPoliticalActionView) => void;
}) {
  return (
    <div className="foederati-named-action">
      <GameButton variant="outline" disabled={!action.available || submitting} onClick={() => onChoose(action)}>
        {action.name}
      </GameButton>
      {!action.available && action.blockReason && <p className="foederati-blocked">{action.blockReason}</p>}
    </div>
  );
}

function StepButton({
  action,
  label,
  submitting,
  onChoose,
}: {
  action: FoederatiPoliticalActionView;
  label: string;
  submitting: boolean;
  onChoose: (action: FoederatiPoliticalActionView) => void;
}) {
  return (
    <Tooltip content={stepTooltip(action)} delay={150}>
      <button
        type="button"
        className={`foederati-step-btn${!action.available || submitting ? ' foederati-step-btn--disabled' : ''}`}
        disabled={!action.available || submitting}
        aria-label={action.name}
        onClick={() => onChoose(action)}
      >
        {label}
      </button>
    </Tooltip>
  );
}

export default function FoederatiPoliticsPanel({ factionId, factionName, data }: { factionId: string; factionName: string; data?: FoederatiPoliticsView }) {
  const t = useWebUIText();
  const { gameDay } = useGameState();
  const [selected, setSelected] = useState<FoederatiPoliticalActionView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const refreshedActionDate = useRef('');
  const nextActionDate = data?.nextActionDate ?? 0;
  useEffect(() => {
    const key = `${factionId}:${nextActionDate}`;
    if (nextActionDate > 0 && gameDay >= nextActionDate && refreshedActionDate.current !== key) {
      refreshedActionDate.current = key;
      void refreshFactionData(factionId).catch(acknowledgeBridgeFailure);
    }
  }, [factionId, nextActionDate, gameDay]);
  if (!data?.enabled) return null;

  const pending = decisionActions(data.actions);
  const extras = extraActions(data.actions);
  const increase = pending.length === 0 ? data.actions.find(action => action.id === 'grant' || action.id === 'petition') : undefined;
  const decrease = pending.length === 0 ? data.actions.find(action => action.id === 'crackdown') : undefined;
  const currentAction = selected && data.actions.find(action => action.id === selected.id && action.settlementId === selected.settlementId);
  const daysLeft = data.decisionDeadline > gameDay ? data.decisionDeadline - gameDay : 0;

  const perform = async (action: FoederatiPoliticalActionView) => {
    setSubmitting(true);
    try {
      await bridgeCall('game.foederati_political_action', { factionId, actionId: action.id, settlementId: action.settlementId });
      await refreshFactionData(factionId);
    } catch (error) {
      acknowledgeBridgeFailure(error);
    } finally {
      setSubmitting(false);
    }
  };

  const choose = (action: FoederatiPoliticalActionView) => {
    if (!action.available || submitting) return;
    if (CONFIRM_IDS.has(action.id)) setSelected(action);
    else void perform(action);
  };

  return (
    <section className="foederati-politics-panel">
      <div className="foederati-politics-main">
        <img className="foederati-politics-icon" src={WebkilnAssetPath(FOEDERATI_ICON)} alt="" draggable={false} />
        <div className="foederati-politics-body">
          <div className="foederati-politics-title-row">
            <span className="foederati-politics-name">{t('Foederati.Autonomy')}</span>
            <span className="foederati-politics-value">{data.autonomy}</span>
          </div>
          <FoederatiAutonomyBar level={data.autonomyLevel} label={t('Foederati.Autonomy')} />
        </div>
        {(increase || decrease) && (
          <div className="foederati-politics-controls">
            {increase && <StepButton action={increase} label="+" submitting={submitting} onChoose={choose} />}
            {decrease && <StepButton action={decrease} label={'\u2212'} submitting={submitting} onChoose={choose} />}
          </div>
        )}
      </div>
      {data.pendingDecision && <p className="foederati-pending">{data.pendingDecision}</p>}
      {data.pendingDecision && daysLeft > 0 && <p className="foederati-pending-days">{t('Foederati.DecisionDays', { Days: formatNumber(daysLeft) })}</p>}
      {pending.length > 0 && (
        <div className="foederati-named-actions">
          {pending.map(action => (
            <NamedAction key={`${action.id}:${action.settlementId}`} action={action} submitting={submitting} onChoose={choose} />
          ))}
        </div>
      )}
      {extras.length > 0 && (
        <div className="foederati-named-actions">
          {extras.map(action => (
            <NamedAction key={`${action.id}:${action.settlementId}`} action={action} submitting={submitting} onChoose={choose} />
          ))}
        </div>
      )}
      <ConfirmDialog
        visible={selected !== null}
        title={selected?.name ?? ''}
        message={<><p>{factionName}</p><p>{currentAction?.description ?? selected?.description}</p></>}
        confirmText={selected?.name}
        confirmDisabled={!currentAction?.available || submitting}
        onConfirm={() => { if (currentAction?.available) void perform(currentAction); }}
        onClosed={() => setSelected(null)}
        variant={selected?.id === 'independence' || selected?.id === 'crackdown' || selected?.id === 'contestExpansion' ? 'danger' : 'default'}
      />
    </section>
  );
}
