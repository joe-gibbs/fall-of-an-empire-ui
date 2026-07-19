import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import GameButton from '../common/buttons/GameButton';
import type { GovernorAssignmentCandidateView } from '../../bridge/military-map/useBottomBarOperationsBridge';
import { useGameActions } from '../../context/GameContext';
import { useModalPresence } from '../../hooks/useModalPresence';
import { useWebUIText } from '../../localization/WebUITextContext';
import { formatNumber } from '../../utils/numberFormat';
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
} from '../modals/characters/CandidateSelectionModal';
import {
  candidateStatColour,
  candidateStatFillClass,
  candidateStatTier,
  statIconPath,
} from '../modals/characters/CandidateSelectionUtils';
import '../modals/characters/CourtAppointmentModal.css';

type SortKey = 'governance' | 'loyalty' | 'regions' | 'age' | 'name';

interface Props {
  open: boolean;
  candidates: GovernorAssignmentCandidateView[];
  selectedPersonId: string;
  onChoose: (personId: string) => void;
  onClose: () => void;
}

function sortValue(candidate: GovernorAssignmentCandidateView, sort: SortKey): string | number {
  if (sort === 'name') return candidate.name;
  if (sort === 'age') return candidate.age;
  if (sort === 'loyalty') return candidate.loyalty;
  if (sort === 'regions') return candidate.maxRegionCount - candidate.currentRegionCount;
  return candidate.governance;
}

function regionsLabel(candidate: GovernorAssignmentCandidateView, t: ReturnType<typeof useWebUIText>): string {
  return t('BottomBar.GovernorAssignment.RegionValue', {
    Current: formatNumber(candidate.currentRegionCount),
    Max: formatNumber(candidate.maxRegionCount),
  });
}

export default function GovernorAssignmentPickerModal({
  open,
  candidates,
  selectedPersonId,
  onChoose,
  onClose,
}: Props) {
  const t = useWebUIText();
  const { openRightSidebar } = useGameActions();
  const [sort, setSort] = useState<SortKey>('governance');
  const [selectionState, setSelectionState] = useState<{ baseSelectedId: string; selectedId: string | null }>({
    baseSelectedId: '',
    selectedId: null,
  });

  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.governor-assignment-picker',
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const sorted = useMemo(() => {
    const next = candidates.slice();
    next.sort((a, b) => {
      const av = sortValue(a, sort);
      const bv = sortValue(b, sort);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
      return Number(bv) - Number(av);
    });
    return next;
  }, [candidates, sort]);

  const manualSelectedId = selectionState.baseSelectedId === selectedPersonId ? selectionState.selectedId : null;
  const selectedId = manualSelectedId && sorted.some(candidate => candidate.id === manualSelectedId && !candidate.atCapacity)
    ? manualSelectedId
    : selectedPersonId && sorted.some(candidate => candidate.id === selectedPersonId && !candidate.atCapacity)
      ? selectedPersonId
      : sorted.find(candidate => !candidate.atCapacity)?.id ?? null;
  const selected = sorted.find(candidate => candidate.id === selectedId) ?? null;

  const chooseSelected = useCallback(() => {
    if (!selected || selected.atCapacity) return;
    onChoose(selected.id);
    close();
  }, [close, onChoose, selected]);

  const viewSelected = useCallback(() => {
    if (!selected) return;
    openRightSidebar('character', selected.id);
    close();
  }, [close, openRightSidebar, selected]);

  if (!mounted) return null;

  const governanceIcon = statIconPath('governance');
  const loyaltyIcon = statIconPath('loyalty');

  return createPortal(
    <CandidateModalFrame
      prefix="cam"
      closing={closing}
      onClose={close}
      headerIcon="/assets/icons/AssignGovernor.png"
      title={t('BottomBar.GovernorAssignment.ChooseAnyone')}
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">
          {t('BottomBar.GovernorAssignment.PickerDetail')}
        </CandidateMissionDescription>
        <CandidateMissionStat prefix="cam" icon={governanceIcon} label={t('Common.Stats')} value={t('Common.Governance')} />
      </CandidateMissionBar>

      <CandidateBody prefix="cam">
        <CandidateListPane
          prefix="cam"
          items={sorted}
          selectedId={selectedId}
          getId={candidate => candidate.id}
          activeSort={sort}
          sortOptions={[
            { id: 'governance', label: t('Common.Governance') },
            { id: 'loyalty', label: t('Common.Loyalty') },
            { id: 'regions', label: t('BottomBar.GovernorAssignment.Regions') },
            { id: 'age', label: t('Common.Age') },
            { id: 'name', label: t('Common.Name') },
          ]}
          onSortChange={setSort}
          countLabel={t('BottomBar.GovernorAssignment.AvailableCount', { Count: formatNumber(sorted.length) })}
          emptyLabel={t('BottomBar.GovernorAssignment.Empty')}
          renderRow={(candidate, active) => (
            <CandidateRow
              key={candidate.id}
              prefix="cam"
              active={active}
              onSelect={() => {
                if (!candidate.atCapacity) {
                  setSelectionState({ baseSelectedId: selectedPersonId, selectedId: candidate.id });
                }
              }}
              personId={candidate.id}
              portraitSrc={candidate.portrait}
              portraitLayers={candidate.portraitLayers}
              portraitName={candidate.name}
              name={candidate.name}
              subParts={[
                t('AgentSelect.CandidateAge', { Age: formatNumber(candidate.age) }),
                t('RegionGovernor.RegionCount', {
                  Current: formatNumber(candidate.currentRegionCount),
                  Max: formatNumber(candidate.maxRegionCount),
                }),
              ]}
              statIcon={governanceIcon}
              statValue={formatNumber(candidate.governance)}
              score={formatNumber(candidate.governance)}
              scoreColor={candidate.atCapacity ? 'var(--text-muted)' : candidateStatColour(candidate.governance)}
              extra={candidate.atCapacity ? (
                <span className="operation-governor-picker-status">{t('BottomBar.GovernorAssignment.AtCapacityShort')}</span>
              ) : undefined}
            />
          )}
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
                title={regionsLabel(selected, t)}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={t('Common.Governance')}
                  tier={candidateStatTier(selected.governance)}
                  colour={candidateStatColour(selected.governance)}
                  value={formatNumber(selected.governance)}
                  valueIcon={governanceIcon}
                  scale={selected.governance / 20}
                  fillClassName={candidateStatFillClass('cam', selected.governance)}
                  bonusLabel={t('BottomBar.GovernorAssignment.Regions')}
                  bonusValue={regionsLabel(selected, t)}
                />

                <CandidateSection prefix="cam" title={t('Common.Stats')}>
                  <CandidateStatChips
                    prefix="cam"
                    stats={[
                      {
                        key: 'governance',
                        label: t('Common.Governance'),
                        icon: governanceIcon,
                        value: selected.governance,
                        primary: true,
                      },
                      {
                        key: 'loyalty',
                        label: t('Common.Loyalty'),
                        icon: loyaltyIcon,
                        value: selected.loyalty,
                      },
                    ]}
                  />
                </CandidateSection>
              </div>

              <CandidateFooter prefix="cam">
                <GameButton variant="outline" onClick={viewSelected}>{t('Common.View')}</GameButton>
                <GameButton variant="burgundy" onClick={chooseSelected}>{t('Common.Select')}</GameButton>
              </CandidateFooter>
            </>
          ) : (
            <div className="cam-empty">{t('BottomBar.GovernorAssignment.Empty')}</div>
          )}
        </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>,
    document.body,
  );
}
