import { useState } from 'react';
import type { GetConfederationDataResponse } from '../../../bridge-types.generated';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import { useGameState } from '../../../context/GameContext';
import { sectionTooltip } from './confederationData';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import InteractionCard from '../../common/interactions/InteractionCard';
import InteractionEffectsTooltip from '../../common/tooltips/InteractionEffectsTooltip';
import { BureaucraticInlineValue, BureaucraticRushTooltipAction } from '../../bureaucracy/BureaucraticThroughput';
import { bureaucraticTooltipLine } from '../../bureaucracy/BureaucraticThroughputModel';
import type { FactionInteractionView, FactionInteractionsState } from '../../../bridge/diplomacy/useFactionInteractionsBridge';
import { displayTextToPlain } from '../../../utils/displayText';
import { formatNumber } from '../../../utils/numberFormat';
import { useWebUIText, type WebUITextFormatter } from '../../../localization/WebUITextContext';

const fmtFull = (value: number) => formatNumber(value);

function firstPlainLine(lines: FactionInteractionView['descriptionLines'], fallback: string | null | undefined): string {
  const structured = displayTextToPlain(lines);
  const source = structured || fallback || '';
  return source
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean) ?? '';
}

function edictTooltip(edict: FactionInteractionView, factionId: string, t: WebUITextFormatter): TooltipContent {
  const edictBureaucraticLoad = edict.bureaucraticLoad;
  const throughputLine = edictBureaucraticLoad > 0 ? bureaucraticTooltipLine(edictBureaucraticLoad) : null;
  const description = displayTextToPlain(edict.descriptionLines) || edict.description;
  const lines: TooltipLine[] = [
    { label: t('Common.Cost'), value: edict.goldCost > 0 ? fmtFull(edict.goldCost) : t('Common.Free'), valueIcon: edict.goldCost > 0 ? '/assets/icons/I_Coins.png' : undefined },
    ...(edict.durationDays > 0 ? [{ label: t('Common.Duration'), value: `${edict.durationDays} ${t(edict.durationDays === 1 ? 'Common.Day' : 'Common.Days')}` }] : []),
    ...(throughputLine ? [throughputLine] : []),
  ];

  if (edict.cooldownDays > 0) {
    lines.push({ label: t('FactionOverview.Cooldown'), value: `${edict.cooldownDays} ${t(edict.cooldownDays === 1 ? 'Common.Day' : 'Common.Days')}` });
  }
  if (edict.requirementsDescription) {
    lines.push({
      label: t('Common.Requirements'),
      value: t(edict.reasons.length > 0 ? 'FactionOverview.RequirementsNotMet' : 'FactionOverview.RequirementsMet'),
      valueColor: edict.reasons.length > 0 ? 'var(--red)' : 'var(--green)',
      subTooltip: {
        title: t('Common.Requirements'),
        lines: edict.requirementsDescription.split(/\r?\n/).map(label => ({ label })),
      },
    });
  } else if (edict.reasons.length > 0) {
    lines.push({ label: t('FactionOverview.Unavailable'), isHeader: true });
  }
  if (edict.reasons.length > 0) {
    for (const reason of edict.reasons) {
      lines.push({ label: reason.reason, labelColor: 'var(--red)' });
    }
  }

  const body = edict.inProgress && edict.remainingDays > 0
    ? (
      <>
        <span>{description}</span>
        <BureaucraticRushTooltipAction
          actionId={`edict:${edict.id}`}
          targetFactionId={factionId}
          daysSaved={edict.bureaucraticRushDaysSaved}
          overloadLoad={edict.bureaucraticRushLoad}
        />
      </>
    )
    : description;

  return {
    title: edict.name,
    body,
    lines,
    afterLines: <InteractionEffectsTooltip lines={edict.effectLines} compact />,
  };
}

export default function FactionEdictEntry({ edict, factionId, interactionsState, onStart, onCancel, confederation }: {
  edict: FactionInteractionView;
  confederation: GetConfederationDataResponse | null;
  factionId: string;
  interactionsState: FactionInteractionsState | null;
  onStart: (id: string) => void;
  onCancel: () => void;
}) {
  const t = useWebUIText();
  const [confirming, setConfirming] = useState(false);
  const { gameDay } = useGameState();
  const canStart = edict.availability === 'available' && !edict.inProgress && edict.cooldownRemainingDays <= 0;
  const matchesOutcome = interactionsState?.lastCompletedInteractionId === edict.id;
  const outcome = matchesOutcome ? interactionsState.lastInteractionSucceeded ? 'success' : 'failure' : undefined;
  const outcomeKey = matchesOutcome ? `${interactionsState.lastInteractionCompletedDate}:${edict.id}` : undefined;
  const details = edictTooltip(edict, factionId, t);
  const sectionId = ({ foundkingdom: 'kingdom', mergeconfederation: 'merge', leaveconfederation: 'leave' } as Record<string, string>)[edict.id.toLowerCase()];
  const requirements = confederation?.available ? confederation.sections.find(section => section.id === sectionId) : undefined;
  if (requirements && confederation) {
    details.lines = [...(details.lines ?? []), {
      label: t('Common.Requirements'),
      subTooltip: sectionTooltip(requirements, gameDay, t, [...confederation.sections, ...confederation.detailSections]),
    }];
  }
  return (
    <div className="fov-edict-entry">
      <Tooltip content={details} position="left" delay={150} bubbleClassName="fov-tooltip-bubble">
        <InteractionCard
          title={edict.name}
          description={firstPlainLine(edict.descriptionLines, edict.description)}
          image={edict.iconUrl}
          bgImage={edict.backgroundUrl}
          cooldown={edict.goldCost > 0 ? t('FactionOverview.GoldCost', { Amount: fmtFull(edict.goldCost) }) : undefined}
          durationDays={edict.durationDays}
          inProgress={edict.inProgress}
          remainingDays={edict.remainingDays}
          cooldownDays={edict.cooldownDays}
          cooldownRemainingDays={edict.cooldownRemainingDays}
          outcome={outcome}
          outcomeText={matchesOutcome ? interactionsState.lastInteractionOutcomeText : undefined}
          outcomeKey={outcomeKey}
          tutorialTarget={`Interaction:${edict.id}${edict.id === 'grandfestival' ? ' GrandFestivalButton' : ''}`}
          meta={edict.bureaucraticLoad > 0 ? <BureaucraticInlineValue value={edict.bureaucraticLoad} compact /> : undefined}
          onClick={canStart ? () => {
            if (edict.requiresConfirmation) setConfirming(true);
            else onStart(edict.id);
          } : undefined}
          onCancel={edict.inProgress ? onCancel : undefined}
        />
      </Tooltip>
      <ConfirmDialog
        visible={confirming}
        title={edict.name}
        message={<>
          <dl className="fov-edict-confirmation-cost">
            <dt>{t('Common.Cost')}</dt>
            <dd>{edict.goldCost > 0 ? t('FactionOverview.GoldCost', { Amount: fmtFull(edict.goldCost) }) : t('Common.Free')}</dd>
          </dl>
          <InteractionEffectsTooltip lines={edict.effectLines} compact />
        </>}
        confirmText={edict.name}
        variant="danger"
        confirmDisabled={!canStart}
        onConfirm={() => { if (canStart) onStart(edict.id); }}
        onClosed={() => setConfirming(false)}
      />
    </div>
  );
}
