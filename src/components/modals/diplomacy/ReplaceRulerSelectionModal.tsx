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
import type { PeaceNegotiationReplacementCandidate } from '../../../bridge-types.generated.ts';
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

type SortKey = 'authority' | 'governance' | 'fame' | 'age' | 'name';

interface Props {
  open: boolean;
  candidates: PeaceNegotiationReplacementCandidate[];
  initialSelectedId?: string;
  factionName?: string;
  onClose: () => void;
  onSelect: (personId: string) => void;
  onOpenCharacter: (personId: string) => void;
}

function sortValue(candidate: PeaceNegotiationReplacementCandidate, sort: SortKey): string | number {
  if (sort === 'name') return candidate.name;
  return candidate[sort] ?? 0;
}

function candidateMatchesQuery(candidate: PeaceNegotiationReplacementCandidate, query: string): boolean {
  if (!query) return true;
  const haystack = [candidate.name, candidate.title].join(' ').toLocaleLowerCase();
  return haystack.includes(query);
}

export default function ReplaceRulerSelectionModal({
  open,
  candidates,
  initialSelectedId,
  factionName,
  onClose,
  onSelect,
  onOpenCharacter,
}: Props) {
  const t = useWebUIText();
  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.replace-ruler-selection',
    allowFromInput: true,
    closeStrategy: 'request',
  });
  const [sort, setSort] = useState<SortKey>('authority');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);

  const visibleCandidates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const next = candidates.filter(candidate => candidateMatchesQuery(candidate, query)).slice();
    next.sort((a, b) => {
      const av = sortValue(a, sort);
      const bv = sortValue(b, sort);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
      return Number(bv) - Number(av);
    });
    return next;
  }, [candidates, search, sort]);

  const effectiveSelectedId = selectedId && visibleCandidates.some(candidate => candidate.id === selectedId)
    ? selectedId
    : visibleCandidates[0]?.id ?? null;
  const selected = visibleCandidates.find(candidate => candidate.id === effectiveSelectedId) ?? visibleCandidates[0] ?? null;
  const primaryStatIcon = statIconPath('authority');
  const selectedAuthority = selected?.authority ?? 0;
  const prompt = factionName
    ? t('PeaceNegotiation.ReplaceRuler.SelectPromptNamed', { Faction: factionName })
    : t('PeaceNegotiation.ReplaceRuler.SelectPrompt');

  const handleSelect = useCallback(() => {
    if (!selected) return;
    onSelect(selected.id);
    close();
  }, [close, onSelect, selected]);

  if (!mounted) return null;

  return createPortal(
    <CandidateModalFrame
      prefix="cam"
      closing={closing}
      onClose={close}
      headerIcon="/assets/icons/I_Liege.png"
      title={t('PeaceNegotiation.Term.ReplaceRuler')}
      modalClassName="cam-person-selection-modal"
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">{prompt}</CandidateMissionDescription>
        <CandidateMissionStat prefix="cam" icon={primaryStatIcon} label={t('Common.Priority')} value={t('Common.Authority')} />
      </CandidateMissionBar>

      <CandidateBody prefix="cam">
        <CandidateListPane
          prefix="cam"
          items={visibleCandidates}
          selectedId={effectiveSelectedId}
          getId={candidate => candidate.id}
          activeSort={sort}
          sortOptions={[
            { id: 'authority', label: t('Common.Authority') },
            { id: 'governance', label: t('Common.Governance') },
            { id: 'fame', label: t('Common.Fame') },
            { id: 'age', label: t('Common.Age') },
            { id: 'name', label: t('Common.Name') },
          ]}
          onSortChange={setSort}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('PeaceNegotiation.ReplaceRuler.SearchPlaceholder')}
          countLabel={t('FactionOverview.Candidates')}
          emptyLabel={t('Common.NoneAvailable')}
          renderRow={(candidate, active) => (
            <CandidateRow
              key={candidate.id}
              prefix="cam"
              active={active}
              onSelect={() => setSelectedId(candidate.id)}
              onViewCharacter={() => onOpenCharacter(candidate.id)}
              personId={candidate.id}
              portraitSrc={candidate.portrait}
              portraitLayers={candidate.portraitLayers}
              portraitName={candidate.name}
              name={candidate.name}
              subParts={candidate.title ? [candidate.title] : []}
              statIcon={primaryStatIcon}
              statValue={formatNumber(candidate.authority)}
              statColor={candidateStatColour(candidate.authority)}
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
                title={selected.title}
                onOpenCharacter={() => onOpenCharacter(selected.id)}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={t('Common.Authority')}
                  tier={candidateStatTier(selectedAuthority)}
                  colour={candidateStatColour(selectedAuthority)}
                  value={formatNumber(selectedAuthority)}
                  valueIcon={primaryStatIcon}
                  scale={selectedAuthority / 20}
                  fillClassName={candidateStatFillClass('cam', selectedAuthority)}
                  bonusLabel={t('Common.Fame')}
                  bonusValue={formatNumber(selected.fame)}
                />

                <CandidateSection prefix="cam" title={t('Common.Stats')}>
                  <CandidateStatChips
                    prefix="cam"
                    stats={[
                      {
                        key: 'authority',
                        label: t('Common.Authority'),
                        icon: statIconPath('authority'),
                        value: selected.authority,
                        primary: true,
                      },
                      {
                        key: 'governance',
                        label: t('Common.Governance'),
                        icon: statIconPath('governance'),
                        value: selected.governance,
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
                <GameButton variant="outline" onClick={() => onOpenCharacter(selected.id)}>{t('Common.View')}</GameButton>
                <GameButton variant="burgundy" onClick={handleSelect}>{t('PeaceNegotiation.ReplaceRuler.Install')}</GameButton>
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
