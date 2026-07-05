import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import GameButton from '../../common/buttons/GameButton';
import { useGameActions } from '../../../context/GameContext';
import type { CharacterListEntry } from '../../../bridge/characters/useCharactersBridge';
import { createProvinceFromCandidateBridge } from '../../../bridge/diplomacy/useDiplomacyOverviewBridge';
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
} from '../characters/CandidateSelectionModal';
import {
  ALL_STATS,
  STAT_LABELS,
  candidateStatColour,
  candidateStatFillClass,
  candidateStatTier,
  statIconPath,
} from '../characters/CandidateSelectionUtils';
import '../characters/CourtAppointmentModal.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';

interface Props {
  open: boolean;
  landId: string;
  landName: string;
  settlementCount: number;
  candidates: CharacterListEntry[];
  onClose: () => void;
}

const PRIMARY_STAT: StatKey = 'governance';

type SortKey = 'fit' | 'name' | 'age' | 'loyalty';

function candidateSortValue(candidate: CharacterListEntry, sort: SortKey): string | number {
  if (sort === 'name') return candidate.name;
  if (sort === 'age') return candidate.age;
  if (sort === 'loyalty') return candidate.stats.loyalty;
  return candidate.stats.governance;
}

export default function ProvinceCreationLeaderModal({
  open,
  landId,
  landName,
  settlementCount,
  candidates,
  onClose,
}: Props) {
  const { openRightSidebar } = useGameActions();
  const [sort, setSort] = useState<SortKey>('fit');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.province-creation-leader',
    allowFromInput: true,
  });

  const sortedCandidates = useMemo(() => {
    const next = candidates.slice();
    next.sort((a, b) => {
      const av = candidateSortValue(a, sort);
      const bv = candidateSortValue(b, sort);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
      return Number(bv) - Number(av);
    });
    return next;
  }, [candidates, sort]);

  const effectiveSelectedId = selectedId && sortedCandidates.some(candidate => candidate.id === selectedId)
    ? selectedId
    : sortedCandidates[0]?.id ?? null;
  const selected = sortedCandidates.find(candidate => candidate.id === effectiveSelectedId) ?? sortedCandidates[0];

  const handleCreate = useCallback(() => {
    if (!selected) return;
    void createProvinceFromCandidateBridge(landId, selected.id);
    close();
  }, [landId, selected, close]);

  const handleView = useCallback((charId: string) => {
    openRightSidebar('character', charId);
    close();
  }, [openRightSidebar, close]);

  if (!mounted) return null;

  const primaryStatIcon = statIconPath(PRIMARY_STAT);
  const primaryStatLabel = STAT_LABELS[PRIMARY_STAT];
  const candidateCountLabel = sortedCandidates.length === 1
    ? webUIText('ProvinceMode.Appointment.CandidateCountOne')
    : webUIText('ProvinceMode.Appointment.CandidateCountMany', { Count: formatNumber(sortedCandidates.length) });

  return createPortal(
    <CandidateModalFrame
      prefix="cam"
      closing={closing}
      onClose={close}
      headerIcon="/assets/icons/I_ProvincialCapital.png"
      kicker={webUIText('InternalPolitics.ProvinceCreationKicker')}
      title={landName}
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">
          {webUIText('InternalPolitics.ProvinceCreationDescription', {
            Province: landName,
            Count: formatNumber(settlementCount),
          })}
        </CandidateMissionDescription>
        <CandidateMissionStat prefix="cam" icon={primaryStatIcon} label={webUIText('Auto.Attr.ComponentsModalsRegionGovernorAppointmentModal.144.1')} value={primaryStatLabel} />
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
            { id: 'name', label: webUIText('Auto.Prop.ComponentsModalsRegionGovernorAppointmentModal.156.2') },
            { id: 'age', label: webUIText('Auto.Prop.ComponentsModalsRegionGovernorAppointmentModal.157.3') },
            { id: 'loyalty', label: webUIText('Common.Loyalty') },
          ]}
          onSortChange={setSort}
          countLabel={candidateCountLabel}
          emptyLabel={webUIText('InternalPolitics.NoEligibleProvinceLeaders')}
          renderRow={(candidate, active) => {
            const stat = candidate.stats.governance;
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
                activity={candidate.activity}
                subParts={[
                  candidate.title || webUIText('Common.Candidates.Courtier'),
                  webUIText('AgentSelect.CandidateAge', { Age: formatNumber(candidate.age) }),
                ]}
                statIcon={primaryStatIcon}
                statValue={formatNumber(stat)}
                statColor={candidateStatColour(stat)}
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
                title={selected.title || webUIText('Common.Candidates.Courtier')}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={primaryStatLabel}
                  tier={candidateStatTier(selected.stats.governance)}
                  colour={candidateStatColour(selected.stats.governance)}
                  value={formatNumber(selected.stats.governance)}
                  valueIcon={primaryStatIcon}
                  scale={selected.stats.governance / 20}
                  fillClassName={candidateStatFillClass('cam', selected.stats.governance)}
                />

                <CandidateSection prefix="cam" title={webUIText('Auto.Attr.ComponentsModalsRegionGovernorAppointmentModal.214.4')}>
                  <CandidateStatChips
                    prefix="cam"
                    stats={ALL_STATS.map(stat => ({
                      key: stat.key,
                      label: stat.label,
                      icon: statIconPath(stat.key),
                      value: selected.stats[stat.key],
                      primary: stat.key === PRIMARY_STAT,
                      tooltipBody: stat.key === PRIMARY_STAT ? webUIText('InternalPolitics.ProvinceLeaderPrimaryStatBody') : undefined,
                    }))}
                  />
                </CandidateSection>
              </div>

              <CandidateFooter prefix="cam">
                <GameButton variant="outline" onClick={() => handleView(selected.id)}><WebUIText textKey="Auto.ComponentsModalsRegionGovernorAppointmentModal.245.2" /></GameButton>
                <GameButton variant="burgundy" onClick={handleCreate}><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.651.9" /></GameButton>
              </CandidateFooter>
            </>
          ) : (
            <div className="cam-empty"><WebUIText textKey="InternalPolitics.NoEligibleProvinceLeaders" /></div>
          )}
        </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>,
    document.body,
  );
}
