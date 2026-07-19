import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import GameButton from '../../common/buttons/GameButton';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import {
  replaceMilitaryCommanderBridge,
  useMilitaryCommanderCandidatesBridge,
  type MilitaryCommanderCandidateView,
} from '../../../bridge/military-map/useMilitaryBridge';
import {
  RECRUIT_CHARACTER_GOLD_COST,
  recruitCharacterForRoleBridge,
  refreshMilitaryCommanderCandidatesBridge,
} from '../../../bridge/characters/useCharacterRecruitmentBridge';
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
  candidateStatColour,
  candidateStatFillClass,
  candidateStatTier,
  statIconPath,
} from './CandidateSelectionUtils';
import './CourtAppointmentModal.css';

import { webUIText } from '../../../localization/WebUITextContext';

interface Props {
  open: boolean;
  militaryId: string;
  militaryName: string;
  currentCommanderId?: string;
  onClose: () => void;
}

type SortKey = 'tactics' | 'authority' | 'loyalty' | 'name' | 'age';

function candidateSortValue(candidate: MilitaryCommanderCandidateView, sort: SortKey): string | number {
  if (sort === 'name') return candidate.name;
  if (sort === 'age') return candidate.age;
  return candidate.stats[sort];
}

export default function MilitaryCommanderAssignmentModal({
  open,
  militaryId,
  militaryName,
  currentCommanderId,
  onClose,
}: Props) {
  const { openRightSidebar } = useGameActions();
  const { gold } = useGameState();
  const [sort, setSort] = useState<SortKey>('tactics');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recruiting, setRecruiting] = useState(false);

  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.military-commander-assignment',
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const candidatesResult = useMilitaryCommanderCandidatesBridge(open ? militaryId : null);
  const candidates = useMemo(() => {
    const next = (candidatesResult?.candidates ?? []).slice();
    next.sort((a, b) => {
      const av = candidateSortValue(a, sort);
      const bv = candidateSortValue(b, sort);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
      return Number(bv) - Number(av);
    });
    return next;
  }, [candidatesResult, sort]);

  const effectiveSelectedId = selectedId && candidates.some(candidate => candidate.id === selectedId)
    ? selectedId
    : candidates[0]?.id ?? null;
  const selected = candidates.find(candidate => candidate.id === effectiveSelectedId) ?? candidates[0];
  const selectedIsCurrent = !!selected && (selected.isCurrentCommander || selected.id === currentCommanderId);
  const candidateEmptyText = candidatesResult?.message || webUIText('MilitaryCommander.Empty');
  const canRecruit = !!candidatesResult?.found && !candidatesResult?.message;
  const canAffordRecruit = gold >= RECRUIT_CHARACTER_GOLD_COST;

  const handleAssign = useCallback(() => {
    if (!selected || selectedIsCurrent) return;
    void replaceMilitaryCommanderBridge(militaryId, selected.id)
      .then(() => close())
      .catch(error => acknowledgeBridgeFailure(error, 'game.replace_military_commander'));
  }, [selected, selectedIsCurrent, militaryId, close]);

  const handleView = useCallback((personId: string) => {
    openRightSidebar('character', personId);
    close();
  }, [openRightSidebar, close]);

  const handleRecruit = useCallback(() => {
    if (recruiting || !canRecruit || !canAffordRecruit) return;
    setRecruiting(true);
    void recruitCharacterForRoleBridge('commander', { contextId: militaryId })
      .then(async (response) => {
        if (!response.recruited) {
          throw new Error(response.message || webUIText('CandidateRecruit.Failed'));
        }

        await refreshMilitaryCommanderCandidatesBridge(militaryId);
        if (response.personId) setSelectedId(response.personId);
      })
      .catch(error => acknowledgeBridgeFailure(error, 'game.recruit_character_for_role'))
      .finally(() => setRecruiting(false));
  }, [recruiting, canRecruit, canAffordRecruit, militaryId]);

  if (!mounted) return null;

  const primaryStatIcon = statIconPath('tactics');
  const primaryStatLabel = webUIText('Common.Tactics');
  const title = currentCommanderId
    ? webUIText('MilitaryCommander.ReplaceTitle')
    : webUIText('MilitaryCommander.AssignTitle');
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
      headerIcon="/assets/icons/I_ReplaceCommander.png"
      title={title}
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">
          {webUIText('MilitaryCommander.Mission', { Name: candidatesResult?.militaryName || militaryName })}
        </CandidateMissionDescription>
        <CandidateMissionStat prefix="cam" icon={primaryStatIcon} label={webUIText('MilitaryCommander.PrimaryStat')} value={primaryStatLabel} />
      </CandidateMissionBar>

      <CandidateBody prefix="cam">
        <CandidateListPane
          prefix="cam"
          items={candidates}
          selectedId={effectiveSelectedId}
          getId={candidate => candidate.id}
          activeSort={sort}
          sortOptions={[
            { id: 'tactics', label: webUIText('Common.Tactics') },
            { id: 'authority', label: webUIText('Common.Authority') },
            { id: 'loyalty', label: webUIText('Common.Loyalty') },
            { id: 'name', label: webUIText('Common.Name') },
            { id: 'age', label: webUIText('Common.Age') },
          ]}
          onSortChange={setSort}
          countLabel={webUIText('MilitaryCommander.CandidateCount', { Count: formatNumber(candidates.length) })}
          emptyLabel={candidateEmptyText}
          headerAction={recruitButton}
          renderRow={(candidate, active) => {
            const subParts = [
              candidate.isCurrentCommander
                ? webUIText('MilitaryCommander.Current')
                : webUIText('AgentSelect.CandidateAge', { Age: formatNumber(candidate.age) }),
            ];
            if (candidate.currentCommandName) {
              subParts.push(webUIText('MilitaryCommander.Commanding', { Name: candidate.currentCommandName }));
            }

            return (
              <CandidateRow
                key={candidate.id}
                prefix="cam"
                active={active}
                onSelect={() => setSelectedId(candidate.id)}
                onViewCharacter={() => handleView(candidate.id)}
                personId={candidate.id}
                portraitSrc={candidate.portrait}
                portraitLayers={candidate.portraitLayers}
                portraitName={candidate.name}
                name={candidate.name}
                commanderKind={candidate.currentCommandName ? 'Commander' : undefined}
                subParts={subParts}
                statIcon={primaryStatIcon}
                statValue={formatNumber(candidate.stats.tactics)}
                statColor={candidateStatColour(candidate.stats.tactics)}
              />
            );
          }}
        />

        <CandidateDetailPane prefix="cam">
          {selected ? (
            <>
              <CandidateHero
                prefix="cam"
                personId={selected.id}
                portraitSrc={selected.portrait}
                portraitLayers={selected.portraitLayers}
                name={selected.name}
                title={selected.title || (selected.isCurrentCommander ? webUIText('MilitaryCommander.Current') : undefined)}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={primaryStatLabel}
                  tier={candidateStatTier(selected.stats.tactics)}
                  colour={candidateStatColour(selected.stats.tactics)}
                  value={formatNumber(selected.stats.tactics)}
                  valueIcon={primaryStatIcon}
                  scale={selected.stats.tactics / 20}
                  fillClassName={candidateStatFillClass('cam', selected.stats.tactics)}
                  bonusLabel={selected.currentCommandName ? webUIText('MilitaryCommander.Command') : undefined}
                  bonusValue={selected.currentCommandName}
                />

                <CandidateSection prefix="cam" title={webUIText('MilitaryCommander.StatsTitle')}>
                  <CandidateStatChips
                    prefix="cam"
                    stats={ALL_STATS.map(stat => ({
                      key: stat.key,
                      label: stat.label,
                      icon: statIconPath(stat.key),
                      value: selected.stats[stat.key],
                      primary: stat.key === 'tactics',
                      tooltipBody: stat.key === 'tactics' ? webUIText('MilitaryCommander.TacticsBody') : undefined,
                    }))}
                  />
                </CandidateSection>

                <CandidateTraits prefix="cam" traits={selected.traits} />
              </div>

              <CandidateFooter prefix="cam">
                <GameButton variant="outline" onClick={() => handleView(selected.id)}>{webUIText('Common.View')}</GameButton>
                <GameButton variant="burgundy" onClick={handleAssign} disabled={selectedIsCurrent}>{webUIText('Common.Assign')}</GameButton>
              </CandidateFooter>
            </>
          ) : (
            <div className="cam-empty">{candidateEmptyText}</div>
          )}
        </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>,
    document.body,
  );
}
