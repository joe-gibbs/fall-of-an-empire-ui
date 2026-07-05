import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import GameButton from '../../common/buttons/GameButton';
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
import type { FactionInteractionPersonCandidate, StartFactionInteractionResponse } from '../../../bridge-types.generated.ts';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { formatNumber } from '../../../utils/numberFormat';
import { useWebUIText } from '../../../localization/WebUITextContext';
import {
  candidateStatColour,
  candidateStatFillClass,
  candidateStatTier,
  statIconPath,
} from '../characters/CandidateSelectionUtils';
import '../characters/CourtAppointmentModal.css';

type SortKey = 'governance' | 'authority' | 'fame' | 'name';

interface Props {
  open: boolean;
  selection: StartFactionInteractionResponse | null;
  onClose: () => void;
  onSelect: (interactionId: string, personId: string) => void;
  onOpenCharacter: (personId: string) => void;
}

function sortValue(candidate: FactionInteractionPersonCandidate, sort: SortKey): string | number {
  if (sort === 'name') return candidate.name;
  return candidate[sort] ?? 0;
}

export default function FactionInteractionPersonSelectionModal({
  open,
  selection,
  onClose,
  onSelect,
  onOpenCharacter,
}: Props) {
  const t = useWebUIText();
  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.faction-interaction-person-selection',
    allowFromInput: true,
    closeStrategy: 'request',
  });
  const [sort, setSort] = useState<SortKey>('governance');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const next = (selection?.personCandidates ?? []).slice();
    next.sort((a, b) => {
      const av = sortValue(a, sort);
      const bv = sortValue(b, sort);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
      return Number(bv) - Number(av);
    });
    return next;
  }, [selection, sort]);

  const effectiveSelectedId = selectedId && candidates.some(candidate => candidate.id === selectedId)
    ? selectedId
    : candidates[0]?.id ?? null;
  const selected = candidates.find(candidate => candidate.id === effectiveSelectedId) ?? candidates[0] ?? null;
  const primaryStatIcon = statIconPath('governance');
  const selectedGovernance = selected?.governance ?? 0;

  const handleSelect = useCallback(() => {
    if (!selection || !selected) return;
    onSelect(selection.interactionId, selected.id);
    close();
  }, [close, onSelect, selected, selection]);

  const handleView = useCallback(() => {
    if (!selected) return;
    onOpenCharacter(selected.id);
    close();
  }, [close, onOpenCharacter, selected]);

  if (!mounted) return null;

  return createPortal(
    <CandidateModalFrame
      prefix="cam"
      closing={closing}
      onClose={close}
      headerIcon="/assets/icons/I_ReplaceGovernor.png"
      kicker={selection?.personSelectionPrompt || selection?.message}
      title={selection?.interactionName || t('Common.Select')}
      modalClassName="cam-person-selection-modal"
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">{selection?.personSelectionPrompt || selection?.message}</CandidateMissionDescription>
        <CandidateMissionStat prefix="cam" icon={primaryStatIcon} label={t('Common.Priority')} value={t('Common.Governance')} />
      </CandidateMissionBar>

      <CandidateBody prefix="cam">
        <CandidateListPane
          prefix="cam"
          items={candidates}
          selectedId={effectiveSelectedId}
          getId={candidate => candidate.id}
          activeSort={sort}
          sortOptions={[
            { id: 'governance', label: t('Common.Governance') },
            { id: 'authority', label: t('Common.Authority') },
            { id: 'fame', label: t('Common.Fame') },
            { id: 'name', label: t('Common.Name') },
          ]}
          onSortChange={setSort}
          countLabel={t('FactionOverview.Candidates')}
          emptyLabel={t('Common.NoneAvailable')}
          renderRow={(candidate, active) => (
            <CandidateRow
              key={candidate.id}
              prefix="cam"
              active={active}
              onSelect={() => setSelectedId(candidate.id)}
              onViewCharacter={() => {
                onOpenCharacter(candidate.id);
                close();
              }}
              personId={candidate.id}
              portraitSrc={candidate.portrait}
              portraitLayers={candidate.portraitLayers}
              portraitName={candidate.name}
              name={candidate.name}
              subParts={[
                candidate.title || t('Common.Court'),
                candidate.factionName || t('MainMenu.Realm'),
              ]}
              statIcon={primaryStatIcon}
              statValue={formatNumber(candidate.governance)}
              statColor={candidateStatColour(candidate.governance)}
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
                title={selected.title || selected.factionName}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={t('Common.Governance')}
                  tier={candidateStatTier(selectedGovernance)}
                  colour={candidateStatColour(selectedGovernance)}
                  value={formatNumber(selectedGovernance)}
                  valueIcon={primaryStatIcon}
                  scale={selectedGovernance / 20}
                  fillClassName={candidateStatFillClass('cam', selectedGovernance)}
                  bonusLabel={t('Common.Fame')}
                  bonusValue={formatNumber(selected.fame)}
                />

                <CandidateSection prefix="cam" title={t('Common.Stats')}>
                  <CandidateStatChips
                    prefix="cam"
                    stats={[
                      {
                        key: 'governance',
                        label: t('Common.Governance'),
                        icon: statIconPath('governance'),
                        value: selected.governance,
                        primary: true,
                      },
                      {
                        key: 'authority',
                        label: t('Common.Authority'),
                        icon: statIconPath('authority'),
                        value: selected.authority,
                      },
                      {
                        key: 'fame',
                        label: t('Common.Fame'),
                        icon: '/assets/icons/I_Fame.png',
                        value: selected.fame,
                      },
                    ]}
                  />
                </CandidateSection>
              </div>

              <CandidateFooter prefix="cam">
                <GameButton variant="outline" onClick={handleView}>{t('Common.View')}</GameButton>
                <GameButton variant="burgundy" onClick={handleSelect}>{t('Common.Assign')}</GameButton>
              </CandidateFooter>
            </>
          ) : (
            <div className="cam-empty">{t('Common.NoneAvailable')}</div>
          )}
        </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>,
    document.body,
  );
}
