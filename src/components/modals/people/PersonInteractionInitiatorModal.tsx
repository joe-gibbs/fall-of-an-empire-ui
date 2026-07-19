import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import GameButton from '../../common/buttons/GameButton';
import type {
  PersonInteractionCandidateView,
  PersonInteractionView,
} from '../../../bridge/characters/usePersonInteractionsBridge';
import { successChanceColour } from '../../../utils/colorFormatters';
import { formatPersonActivity } from '../../../utils/displayLabels';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { useGameActions } from '../../../context/GameContext';
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
} from '../characters/CandidateSelectionModal';
import { statIconPath } from '../characters/CandidateSelectionUtils';
import '../characters/CourtAppointmentModal.css';

import { webUIText } from '../../../localization/WebUITextContext';
interface Props {
  interaction: PersonInteractionView | null;
  targetPersonId: string;
  targetPersonName: string;
  onClose: () => void;
  onConfirm: (candidateId: string) => Promise<string | null | void>;
}

const EMPTY_CANDIDATES: PersonInteractionCandidateView[] = [];

type SortKey = 'chance' | 'authority' | 'cunning' | 'governance' | 'name';

function sortValue(candidate: PersonInteractionCandidateView, sort: SortKey): string | number {
  if (sort === 'name') return candidate.name;
  if (sort === 'chance') return candidate.successChancePercent;
  return candidate[sort];
}

function chanceTier(percent: number): string {
  if (percent >= 80) return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.230.9');
  if (percent >= 60) return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.231.10');
  if (percent >= 40) return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.232.11');
  if (percent >= 20) return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.233.12');
  return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.234.13');
}

function chanceFillClass(percent: number): string {
  if (percent >= 60) return '';
  if (percent >= 35) return 'cam-chance-bar-fill--mid';
  return 'cam-chance-bar-fill--low';
}

export default function PersonInteractionInitiatorModal({
  interaction,
  targetPersonId,
  targetPersonName,
  onClose,
  onConfirm,
}: Props) {
  const { openRightSidebar } = useGameActions();
  const [sort, setSort] = useState<SortKey>('chance');
  const [selectionState, setSelectionState] = useState<{ key: string; selectedId: string | null }>({
    key: '',
    selectedId: interaction?.initiatorCandidates[0]?.id ?? null,
  });
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ key: string; message: string | null }>({ key: '', message: null });

  const { mounted, closing, close } = useModalPresence({
    open: interaction !== null,
    onClose,
    escapeId: 'modal.person-interaction-initiator',
    allowFromInput: true,
    closeStrategy: 'request',
  });
  const activeInteraction = interaction;
  const activeInteractionId = activeInteraction?.id ?? null;
  const modalKey = activeInteractionId ? `${activeInteractionId}:${targetPersonId}` : '';
  const selectedId = selectionState.key === modalKey ? selectionState.selectedId : null;
  const submitting = submittingKey === modalKey;
  const error = errorState.key === modalKey ? errorState.message : null;

  const candidates = useMemo(() => {
    const next = (activeInteraction?.initiatorCandidates ?? EMPTY_CANDIDATES).slice();
    next.sort((a, b) => {
      const av = sortValue(a, sort);
      const bv = sortValue(b, sort);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
      return Number(bv) - Number(av);
    });
    return next;
  }, [activeInteraction, sort]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    close();
  }, [close, submitting]);

  const effectiveSelectedId = selectedId && candidates.some(candidate => candidate.id === selectedId)
    ? selectedId
    : candidates[0]?.id ?? null;
  const selected = candidates.find(candidate => candidate.id === effectiveSelectedId) ?? candidates[0] ?? null;
  const eligibleCandidateCount = formatNumber(candidates.length);

  const handleConfirm = useCallback(async () => {
    if (!selected || submitting || !modalKey) return;
    setSubmittingKey(modalKey);
    setErrorState({ key: modalKey, message: null });
    const maybeError = await onConfirm(selected.id);
    setSubmittingKey(current => (current === modalKey ? null : current));
    if (maybeError) {
      setErrorState({ key: modalKey, message: maybeError });
      return;
    }
    close();
  }, [close, modalKey, onConfirm, selected, submitting]);

  const handleView = useCallback(() => {
    if (!selected) return;
    openRightSidebar('character', selected.id);
    close();
  }, [close, openRightSidebar, selected]);

  if (!mounted || !activeInteraction) return null;
  if (typeof document === 'undefined') return null;

  const selectedChance = selected?.successChancePercent ?? 0;
  const selectedActivity = selected ? formatPersonActivity(selected.activity) : '';
  const durationText = activeInteraction.durationDays > 0
    ? webUIText("Auto.Fix.Expr.componentsmodalsPersonInteractionInitiatorModal.133.1", {
        Value1: formatNumber(activeInteraction.durationDays),
        Value2: activeInteraction.durationDays === 1
          ? webUIText("Auto.Fix.ExprArgTrue.componentsmodalsPersonInteractionInitiatorModal.133.1")
          : webUIText("Auto.Fix.ExprArgFalse.componentsmodalsPersonInteractionInitiatorModal.133.1"),
      })
    : '';

  return createPortal(
    <CandidateModalFrame
      prefix="cam"
      closing={closing}
      onClose={handleClose}
      headerIcon={activeInteraction.iconUrl || '/assets/icons/I_Family.png'}
      title={activeInteraction.name}
      modalClassName="cam-person-selection-modal"
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">
          {activeInteraction.initiatorRequirementDescription || activeInteraction.description}
        </CandidateMissionDescription>
        <CandidateMissionStat
          prefix="cam"
          label={webUIText('Auto.ComponentsModalsPersonInteractionInitiatorModal.128.2')}
          value={targetPersonName}
        />
        {durationText && (
          <CandidateMissionStat
            prefix="cam"
            label={webUIText('Common.Duration')}
            value={durationText}
          />
        )}
      </CandidateMissionBar>

      <CandidateBody prefix="cam">
        <CandidateListPane
          prefix="cam"
          items={candidates}
          selectedId={effectiveSelectedId}
          getId={candidate => candidate.id}
          activeSort={sort}
          sortOptions={[
            { id: 'chance', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.310.10') },
            { id: 'authority', label: webUIText('Common.Authority') },
            { id: 'cunning', label: webUIText('Common.Cunning') },
            { id: 'governance', label: webUIText('Common.Governance') },
            { id: 'name', label: webUIText('Common.Name') },
          ]}
          onSortChange={setSort}
          countLabel={webUIText("Auto.Fix.Expr.componentsmodalsPersonInteractionInitiatorModal.143.1", {
            EligibleCandidateCount: eligibleCandidateCount,
            Value2: candidates.length === 1
              ? webUIText("Auto.Fix.ExprArgTrue.componentsmodalsPersonInteractionInitiatorModal.143.1")
              : webUIText("Auto.Fix.ExprArgFalse.componentsmodalsPersonInteractionInitiatorModal.143.1"),
          })}
          emptyLabel={webUIText('Auto.ComponentsModalsPersonInteractionInitiatorModal.217.5')}
          renderRow={(candidate, active) => (
            <CandidateRow
              key={candidate.id}
              prefix="cam"
              active={active}
              onSelect={() => {
                setSelectionState({ key: modalKey, selectedId: candidate.id });
                setErrorState({ key: modalKey, message: null });
              }}
              onViewCharacter={() => {
                openRightSidebar('character', candidate.id);
                close();
              }}
              personId={candidate.id}
              resolvePerson
              portraitName={candidate.name}
              name={candidate.name}
              activity={candidate.activity}
              subParts={[
                candidate.title || webUIText("Auto.Fix.ExprArgFallback.componentsmodalsPersonInteractionInitiatorModal.159.1"),
                webUIText('AgentSelect.CandidateAge', { Age: formatNumber(candidate.age) }),
                formatPersonActivity(candidate.activity) || webUIText("Auto.Fix.ExprFallback.componentsmodalsPersonInteractionInitiatorModal.191.1"),
              ]}
              score={formatPercent(candidate.successChancePercent)}
              scoreColor={successChanceColour(candidate.successChancePercent)}
            />
          )}
        />

        <CandidateDetailPane prefix="cam">
          {selected ? (
            <>
              <CandidateHero
                prefix="cam"
                personId={selected.id}
                resolvePerson
                name={selected.name}
                title={selected.title || webUIText("Auto.Fix.ExprFallback.componentsmodalsPersonInteractionInitiatorModal.177.1")}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={webUIText('Auto.ComponentsModalsPersonInteractionInitiatorModal.183.3')}
                  tier={chanceTier(selectedChance)}
                  colour={successChanceColour(selectedChance)}
                  value={formatPercent(selectedChance)}
                  scale={selectedChance / 100}
                  fillClassName={chanceFillClass(selectedChance)}
                  bonusLabel={webUIText('Auto.ComponentsModalsPersonInteractionInitiatorModal.205.4')}
                  bonusValue={formatNumber(selected.fame)}
                />

                <CandidateSection prefix="cam" title={webUIText('Common.Stats')}>
                  <CandidateStatChips
                    prefix="cam"
                    stats={[
                      {
                        key: 'authority',
                        label: webUIText('Common.Authority'),
                        icon: statIconPath('authority'),
                        value: selected.authority,
                        primary: sort === 'authority',
                      },
                      {
                        key: 'cunning',
                        label: webUIText('Common.Cunning'),
                        icon: statIconPath('cunning'),
                        value: selected.cunning,
                        primary: sort === 'cunning',
                      },
                      {
                        key: 'governance',
                        label: webUIText('Common.Governance'),
                        icon: statIconPath('governance'),
                        value: selected.governance,
                        primary: sort === 'governance',
                      },
                      {
                        key: 'loyalty',
                        label: webUIText('Common.Loyalty'),
                        icon: statIconPath('loyalty'),
                        value: selected.loyalty,
                      },
                      {
                        key: 'fame',
                        label: webUIText('Common.Fame'),
                        icon: '/assets/icons/I_Fame.png',
                        value: selected.fame,
                        color: 'var(--gold)',
                      },
                    ]}
                  />
                </CandidateSection>

                <CandidateSection prefix="cam" title={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1266.48')}>
                  <span className="cam-person-selection-note">
                    {selectedActivity || webUIText("Auto.Fix.ExprFallback.componentsmodalsPersonInteractionInitiatorModal.191.1")}
                  </span>
                </CandidateSection>

                {error && <div className="game-notice game-notice--warning cam-action-error">{error}</div>}
              </div>

              <CandidateFooter prefix="cam">
                <GameButton variant="outline" onClick={handleView}>{webUIText('Common.View')}</GameButton>
                <GameButton variant="outline" onClick={handleClose}>{webUIText('Auto.ComponentsModalsPersonInteractionInitiatorModal.223.6')}</GameButton>
                <GameButton variant="burgundy" onClick={handleConfirm} disabled={!selected || submitting}>{activeInteraction.name}</GameButton>
              </CandidateFooter>
            </>
          ) : (
            <div className="cam-empty">{webUIText('Auto.ComponentsModalsPersonInteractionInitiatorModal.217.5')}</div>
          )}
        </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>,
    document.body,
  );
}
