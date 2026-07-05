import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import GameButton from '../../common/buttons/GameButton';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { useCourtCandidates } from '../../../data-source/index';
import { appointToCourtPosition, type CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import {
  RECRUIT_CHARACTER_GOLD_COST,
  recruitCharacterForRoleBridge,
  refreshCourtCandidatesBridge,
  type RecruitCharacterRole,
} from '../../../bridge/characters/useCharacterRecruitmentBridge';
import type { StatKey } from '../../../data/types';
import { formatNumber } from '../../../utils/numberFormat';
import { useModalPresence } from '../../../hooks/useModalPresence';
import {
  CandidateBody,
  CandidateChanceBlock,
  CandidateDetailPane,
  CandidateFooter,
  CandidateHero,
  CandidateListPane,
  CandidateMissionBar,
  CandidateMissionDescription,
  CandidateMissionStat,
  CandidateModalFrame,
  CandidateRow,
  CandidateSection,
  CandidateStatChips,
  CandidateTraits,
} from './CandidateSelectionModal';
import {
  ALL_STATS,
  STAT_LABELS,
  candidateStatColour,
  candidateStatFillClass,
  candidateStatTier,
  statIconPath,
} from './CandidateSelectionUtils';
import './CourtAppointmentModal.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface Props {
  open: boolean;
  position: CourtPositionView | null;
  onClose: () => void;
  onAppointed?: () => void;
}

function formatBonus(position: CourtPositionView, stat: number): string {
  const magnitude = formatNumber(stat * position.bonusMultiplier, {
    maximumFractionDigits: position.bonusDecimals,
    minimumFractionDigits: position.bonusDecimals,
  });
  const sign = position.bonusIsNegative ? '-' : '+';
  return `${sign}${magnitude}${position.bonusSuffix}`;
}

type SortKey = 'fit' | 'name' | 'age';

function courtRecruitRole(statKey: StatKey): RecruitCharacterRole {
  return `court_${statKey}` as RecruitCharacterRole;
}

function formatSignedInteger(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function dayUnit(days: number): string {
  return days === 1 ? webUIText('Common.Day') : webUIText('Common.Days');
}

function formatDays(days: number): string {
  const safeDays = Math.max(0, days);
  return webUIText('CourtAppointment.DaysValue', { Days: formatNumber(safeDays), Unit: dayUnit(safeDays) });
}

function buildAppointmentTooltip(position: CourtPositionView): TooltipContent {
  const holder = position.holder;
  if (!holder) {
    return {
      title: webUIText('CourtAppointment.AppointTooltipTitle'),
      body: webUIText('CourtAppointment.AppointVacantBody'),
    };
  }

  const daysRemaining = position.earlyReplacementTermDaysRemaining ?? position.holderDaysRemaining ?? 0;
  const durationDays = position.earlyReplacementPenaltyDurationDays ?? 0;
  const lines: TooltipLine[] = [
    { label: webUIText('CourtAppointment.CurrentHolder'), value: holder.name },
    {
      label: webUIText('CourtAppointment.TermRemaining'),
      value: position.earlyReplacementPenaltyActive
        ? formatDays(daysRemaining)
        : webUIText('CourtAppointment.TermComplete'),
    },
  ];

  if (!position.earlyReplacementPenaltyActive) {
    lines.push({ label: webUIText('CourtAppointment.NoEarlyPenalty'), value: webUIText('Common.Yes'), valueColor: 'var(--green)' });
    return {
      title: webUIText('CourtAppointment.ReplaceTooltipTitle'),
      body: webUIText('CourtAppointment.ReplaceExpiredBody', { Name: holder.name }),
      lines,
    };
  }

  lines.push({
    label: holder.name,
    value: webUIText('CourtAppointment.OpinionPenaltyValue', {
      Value: formatSignedInteger(position.earlyReplacementHolderOpinionPenalty ?? 0),
      Days: formatNumber(durationDays),
      Unit: dayUnit(durationDays),
    }),
    valueColor: 'var(--red)',
  });

  const friendCount = position.earlyReplacementFriendCount ?? 0;
  if (friendCount > 0) {
    lines.push({
      label: webUIText('CourtAppointment.FriendPenaltyLabel', { Count: formatNumber(friendCount) }),
      value: webUIText('CourtAppointment.OpinionPenaltyValue', {
        Value: formatSignedInteger(position.earlyReplacementFriendOpinionPenalty ?? 0),
        Days: formatNumber(durationDays),
        Unit: dayUnit(durationDays),
      }),
      valueColor: 'var(--red)',
    });
  }

  if (position.earlyReplacementPowerBlocName && position.earlyReplacementPowerBlocHappinessPenalty) {
    lines.push({
      label: position.earlyReplacementPowerBlocName,
      value: webUIText('CourtAppointment.PowerBlocPenaltyValue', {
        Value: formatSignedInteger(position.earlyReplacementPowerBlocHappinessPenalty),
      }),
      valueColor: 'var(--red)',
    });
  }

  return {
    title: webUIText('CourtAppointment.ReplaceTooltipTitle'),
    body: webUIText('CourtAppointment.ReplaceEarlyBody', { Name: holder.name }),
    lines,
  };
}

export default function CourtAppointmentModal({
  open, position, onClose, onAppointed,
}: Props) {
  const { openRightSidebar } = useGameActions();
  const { gold } = useGameState();

  const [sort, setSort] = useState<SortKey>('fit');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recruiting, setRecruiting] = useState(false);

  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.court-appointment',
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const [renderedPosition, setRenderedPosition] = useState<CourtPositionView | null>(position);
  if (position && position !== renderedPosition) setRenderedPosition(position);
  if (!mounted && renderedPosition !== null) setRenderedPosition(null);

  const statKey = (renderedPosition?.primaryStat ?? 'authority') as StatKey;
  const primaryStatLabel = STAT_LABELS[statKey] ?? webUIText("Auto.Fix.VarExprFallback.componentsmodalsCourtAppointmentModal.74.1");
  const primaryStatIcon = statIconPath(statKey);

  const fetched = useCourtCandidates(open && renderedPosition ? renderedPosition.key : null);

  const candidates = useMemo(() => {
    const pool = fetched ?? [];
    const withFit = pool.map(character => ({ character, stat: character.stats[statKey] ?? 0 }));
    withFit.sort((a, b) => {
      if (sort === 'name') return a.character.name.localeCompare(b.character.name);
      if (sort === 'age') return a.character.age - b.character.age;
      return b.stat - a.stat;
    });
    return withFit;
  }, [fetched, statKey, sort]);

  const effectiveSelectedId = selectedId && candidates.find(candidate => candidate.character.id === selectedId)
    ? selectedId
    : candidates[0]?.character.id ?? null;

  const selected = candidates.find(candidate => candidate.character.id === effectiveSelectedId) || candidates[0];
  const canRecruit = renderedPosition?.key !== 'MasterOfReligion';
  const canAffordRecruit = gold >= RECRUIT_CHARACTER_GOLD_COST;

  const handleAppoint = useCallback(() => {
    if (!selected || !renderedPosition) return;
    void appointToCourtPosition(renderedPosition.key, selected.character.id).then((ok) => {
      if (ok) onAppointed?.();
    });
    close();
  }, [selected, renderedPosition, onAppointed, close]);

  const handleView = useCallback((charId: string) => {
    openRightSidebar('character', charId);
    close();
  }, [openRightSidebar, close]);

  const handleRecruit = useCallback(() => {
    if (recruiting || !renderedPosition || !canRecruit || !canAffordRecruit) return;
    setRecruiting(true);
    void recruitCharacterForRoleBridge(courtRecruitRole(statKey), { positionKey: renderedPosition.key })
      .then(async (response) => {
        if (!response.recruited) {
          throw new Error(response.message || webUIText('CandidateRecruit.Failed'));
        }

        await refreshCourtCandidatesBridge(renderedPosition.key);
        if (response.personId) setSelectedId(response.personId);
      })
      .catch(error => acknowledgeBridgeFailure(error, 'game.recruit_character_for_role'))
      .finally(() => setRecruiting(false));
  }, [recruiting, renderedPosition, canRecruit, canAffordRecruit, statKey]);

  const appointmentTooltip = useMemo(() => (
    renderedPosition ? buildAppointmentTooltip(renderedPosition) : undefined
  ), [renderedPosition]);

  if (!mounted || !renderedPosition) return null;
  const appointmentActionLabel = renderedPosition.holder
    ? webUIText('CourtAppointment.ReplaceAction')
    : webUIText('Auto.ComponentsModalsCourtAppointmentModal.210.2');
  const recruitButton = canRecruit ? (
    <GameButton
      variant="outline"
      className="candidate-list-action"
      icon="/assets/icons/I_Coins.png"
      onClick={handleRecruit}
      disabled={recruiting || !canAffordRecruit}
    >
      {webUIText('CandidateRecruit.RecruitWithCost', { Cost: formatNumber(RECRUIT_CHARACTER_GOLD_COST) })}
    </GameButton>
  ) : undefined;

  return createPortal(
    <CandidateModalFrame
      prefix="cam"
      closing={closing}
      onClose={close}
      headerIcon="/assets/icons/I_Characters.png"
      kicker={appointmentActionLabel}
      title={renderedPosition.name}
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">{renderedPosition.description}</CandidateMissionDescription>
        <CandidateMissionStat prefix="cam" icon={primaryStatIcon} label={webUIText('Auto.Attr.ComponentsModalsCourtAppointmentModal.122.1')} value={primaryStatLabel} />
      </CandidateMissionBar>

      <CandidateBody prefix="cam">
        <CandidateListPane
          prefix="cam"
          items={candidates}
          selectedId={effectiveSelectedId}
          getId={candidate => candidate.character.id}
          activeSort={sort}
          sortOptions={[
            { id: 'fit', label: primaryStatLabel },
            { id: 'name', label: webUIText('Auto.Prop.ComponentsModalsCourtAppointmentModal.134.2') },
            { id: 'age', label: webUIText('Auto.Prop.ComponentsModalsCourtAppointmentModal.135.3') },
          ]}
          onSortChange={setSort}
          countLabel={webUIText("Auto.Fix.Expr.componentsmodalsCourtAppointmentModal.138.1", { Value1: formatNumber(candidates.length) })}
          emptyLabel={webUIText('Auto.ExtraAttr.ComponentsModalsCourtAppointmentModal.139.2')}
          headerAction={recruitButton}
          renderRow={({ character, stat }, active) => (
            <CandidateRow
              key={character.id}
              prefix="cam"
              active={active}
              onSelect={() => setSelectedId(character.id)}
              onViewCharacter={() => handleView(character.id)}
              personId={character.id}
              portraitSrc={character.portrait}
              portraitLayers={character.portraitLayers}
              portraitName={character.name}
              name={character.name}
              activity={character.activity}
              subParts={[character.title, webUIText('AgentSelect.CandidateAge', { Age: formatNumber(character.age) })]}
              statIcon={primaryStatIcon}
              statValue={formatNumber(stat)}
              statColor={candidateStatColour(stat)}
            />
          )}
        />

        <CandidateDetailPane prefix="cam">
          {selected ? (
            <>
              <CandidateHero
                prefix="cam"
                personId={selected.character.id}
                portraitSrc={selected.character.portrait}
                portraitLayers={selected.character.portraitLayers}
                name={selected.character.name}
                title={selected.character.title}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={primaryStatLabel}
                  tier={candidateStatTier(selected.stat)}
                  colour={candidateStatColour(selected.stat)}
                  value={formatNumber(selected.stat)}
                  valueIcon={primaryStatIcon}
                  scale={selected.stat / 20}
                  fillClassName={candidateStatFillClass('cam', selected.stat)}
                  bonusLabel={renderedPosition.bonusLabel}
                  bonusValue={formatBonus(renderedPosition, selected.stat)}
                />

                <CandidateSection prefix="cam" title={webUIText('Auto.Attr.ComponentsModalsCourtAppointmentModal.186.4')}>
                  <CandidateStatChips
                    prefix="cam"
                    stats={ALL_STATS.map(stat => ({
                      key: stat.key,
                      label: stat.label,
                      icon: statIconPath(stat.key),
                      value: selected.character.stats[stat.key],
                      primary: stat.key === statKey,
                      tooltipBody: stat.key === statKey ? webUIText('CourtAppointment.PrimaryStatBody', { Position: renderedPosition.name }) : undefined,
                    }))}
                  />
                </CandidateSection>

                <CandidateTraits
                  prefix="cam"
                  traits={selected.character.traits}
                  formatFooter={trait => trait.isTemporary && trait.remainingDays !== undefined
                    ? webUIText('Common.ExpiresInDays', { Days: formatNumber(trait.remainingDays), Unit: trait.remainingDays === 1 ? webUIText('Common.Day') : webUIText('Common.Days') })
                    : undefined}
                />
              </div>

              <CandidateFooter prefix="cam">
                <GameButton variant="outline" fullWidth onClick={() => handleView(selected.character.id)}><WebUIText textKey="Auto.ComponentsModalsCourtAppointmentModal.209.1" /></GameButton>
                <Tooltip content={appointmentTooltip ?? ''} position="top" delay={450}>
                  <GameButton variant="burgundy" fullWidth onClick={handleAppoint}>{appointmentActionLabel}</GameButton>
                </Tooltip>
              </CandidateFooter>
            </>
          ) : (
            <div className="cam-empty"><WebUIText textKey="Auto.ComponentsModalsCourtAppointmentModal.214.3" /></div>
          )}
        </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>,
    document.body,
  );
}
