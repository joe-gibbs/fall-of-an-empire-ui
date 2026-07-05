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
  CandidateTraits,
} from './CandidateSelectionModal';
import { setDesignatedHeir, useTargetedHeirCandidates } from '../../../bridge/characters/useHeirBridge';
import type { HeirCandidateEntry } from '../../../bridge-types.generated.ts';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { formatNumber } from '../../../utils/numberFormat';
import { useWebUIText } from '../../../localization/WebUITextContext';
import type { CharacterTrait, StatKey } from '../../../data/types';
import {
  ALL_STATS,
  STAT_LABELS,
  candidateStatColour,
  candidateStatFillClass,
  candidateStatTier,
  statIconPath,
} from './CandidateSelectionUtils';
import './CourtAppointmentModal.css';

type HeirSortKey = 'fit' | 'name' | 'age';

interface HeirAssignmentModalProps {
  open: boolean;
  factionId?: string;
  currentHeirId?: string;
  currentDesignatedHeirId?: string;
  onClose: () => void;
  onOpenCharacter: (id: string) => void;
}

export default function HeirAssignmentModal({
  open,
  factionId,
  currentHeirId,
  currentDesignatedHeirId,
  onClose,
  onOpenCharacter,
}: HeirAssignmentModalProps) {
  const t = useWebUIText();
  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.heir-assignment',
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const candidates = useTargetedHeirCandidates(mounted, factionId ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<HeirSortKey>('fit');
  const primaryStat: StatKey = factionId ? 'governance' : 'authority';
  const primaryStatLabel = STAT_LABELS[primaryStat];
  const primaryStatIcon = statIconPath(primaryStat);

  const sortedCandidates = useMemo(() => {
    const sorted = (candidates ?? []).slice();
    sorted.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'age') return a.age - b.age;
      return (b[primaryStat] ?? 0) - (a[primaryStat] ?? 0);
    });
    return sorted;
  }, [candidates, primaryStat, sort]);

  const preferredCurrentId = currentDesignatedHeirId || currentHeirId;
  const effectiveSelectedId = selectedId && sortedCandidates.some(candidate => candidate.id === selectedId)
    ? selectedId
    : preferredCurrentId && sortedCandidates.some(candidate => candidate.id === preferredCurrentId)
      ? preferredCurrentId
      : sortedCandidates[0]?.id ?? null;
  const selected = sortedCandidates.find(candidate => candidate.id === effectiveSelectedId) ?? sortedCandidates[0] ?? null;

  const handleAssign = useCallback(() => {
    if (!selected) return;
    void setDesignatedHeir(selected.id, factionId).then((ok) => {
      if (ok) close();
    });
  }, [close, factionId, selected]);

  const handleClear = useCallback(() => {
    if (!currentDesignatedHeirId) return;
    void setDesignatedHeir('', factionId).then((ok) => {
      if (ok) close();
    });
  }, [close, currentDesignatedHeirId, factionId]);

  const handleView = useCallback((candidate: HeirCandidateEntry) => {
    onOpenCharacter(candidate.id);
    close();
  }, [close, onOpenCharacter]);

  if (!mounted) return null;

  const selectedStat = selected ? selected[primaryStat] ?? 0 : 0;
  const selectedTraits: CharacterTrait[] = [];

  return createPortal(
    <CandidateModalFrame
      prefix="cam"
      closing={closing}
      onClose={close}
      headerIcon="/assets/icons/I_Family.png"
      kicker={t('FactionOverview.Succession')}
      title={t('FactionOverview.AssignHeir')}
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">{t('FactionOverview.AssignHeirDescription')}</CandidateMissionDescription>
        <CandidateMissionStat prefix="cam" icon={primaryStatIcon} label={t('Common.Priority')} value={primaryStatLabel} />
      </CandidateMissionBar>

      <CandidateBody prefix="cam">
        <CandidateListPane
          prefix="cam"
          items={sortedCandidates}
          selectedId={effectiveSelectedId}
          getId={candidate => candidate.id}
          activeSort={sort}
          sortOptions={[
            { id: 'fit', label: primaryStatLabel },
            { id: 'name', label: t('Common.Name') },
            { id: 'age', label: t('Common.Age') },
          ]}
          onSortChange={setSort}
          countLabel={t('FactionOverview.Candidates')}
          emptyLabel={t('FactionOverview.NoEligibleHeirs')}
          renderRow={(candidate, active) => (
            <CandidateRow
              key={candidate.id}
              prefix="cam"
              active={active}
              onSelect={() => setSelectedId(candidate.id)}
              onViewCharacter={() => handleView(candidate)}
              personId={candidate.id}
              portraitSrc={candidate.portrait}
              portraitLayers={undefined}
              portraitName={candidate.name}
              name={candidate.name}
              isHeir={candidate.id === currentHeirId}
              isDesignatedHeir={candidate.id === currentDesignatedHeirId}
              subParts={[
                candidate.relationToRuler || candidate.shortTitle || candidate.title || t('Common.Court'),
                candidate.factionName || t('MainMenu.Realm'),
              ]}
              statIcon={primaryStatIcon}
              statValue={formatNumber(candidate[primaryStat] ?? 0)}
              statColor={candidateStatColour(candidate[primaryStat] ?? 0)}
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
                portraitLayers={undefined}
                name={selected.name}
                title={selected.title || selected.shortTitle || selected.relationToRuler || t('Common.Court')}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={primaryStatLabel}
                  tier={candidateStatTier(selectedStat)}
                  colour={candidateStatColour(selectedStat)}
                  value={formatNumber(selectedStat)}
                  valueIcon={primaryStatIcon}
                  scale={selectedStat / 20}
                  fillClassName={candidateStatFillClass('cam', selectedStat)}
                  bonusLabel={t('Common.Fame')}
                  bonusValue={formatNumber(selected.fame)}
                />

                <CandidateSection prefix="cam" title={t('Common.Stats')}>
                  <CandidateStatChips
                    prefix="cam"
                    stats={ALL_STATS.map(stat => ({
                      key: stat.key,
                      label: stat.label,
                      icon: statIconPath(stat.key),
                      value: selected[stat.key] ?? 0,
                      primary: stat.key === primaryStat,
                    }))}
                  />
                </CandidateSection>

                <CandidateTraits prefix="cam" traits={selectedTraits} />
              </div>

              <CandidateFooter prefix="cam">
                {currentDesignatedHeirId ? (
                  <GameButton variant="outline" onClick={handleClear}>{t('Common.Clear')}</GameButton>
                ) : null}
                <GameButton variant="outline" onClick={() => handleView(selected)}>{t('Common.View')}</GameButton>
                <GameButton
                  variant="burgundy"
                  onClick={handleAssign}
                  disabled={selected.id === currentDesignatedHeirId}
                >
                  {t('Common.Assign')}
                </GameButton>
              </CandidateFooter>
            </>
          ) : (
            <div className="cam-empty">{t('FactionOverview.NoEligibleHeirs')}</div>
          )}
        </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>,
    document.body,
  );
}
