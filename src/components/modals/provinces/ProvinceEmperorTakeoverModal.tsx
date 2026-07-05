import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProvinceEmperorTakeoverView, ProvinceEmperorTakeoverCandidateView } from '../../../bridge/provinces/useProvinceEmperorTakeoverBridge';
import { confirmProvinceEmperorTakeoverCandidate } from '../../../bridge/provinces/useProvinceEmperorTakeoverBridge';
import { useGameActions } from '../../../context/GameContext';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber } from '../../../utils/numberFormat';
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
import {
  candidateStatColour,
  candidateStatFillClass,
  candidateStatTier,
  statIconPath,
} from '../characters/CandidateSelectionUtils';
import '../characters/CourtAppointmentModal.css';

type SortKey = 'support' | 'governance' | 'loyalty' | 'fame' | 'age' | 'name';

interface Props {
  open: boolean;
  takeover: ProvinceEmperorTakeoverView | null;
  onClose: () => void;
}

function sortValue(candidate: ProvinceEmperorTakeoverCandidateView, sort: SortKey): string | number {
  if (sort === 'name') return candidate.name;
  if (sort === 'age') return candidate.age;
  if (sort === 'governance') return candidate.governance;
  if (sort === 'loyalty') return candidate.loyalty;
  if (sort === 'fame') return candidate.fame;
  return candidate.support;
}

export default function ProvinceEmperorTakeoverModal({ open, takeover, onClose }: Props) {
  const t = useWebUIText();
  const { openRightSidebar } = useGameActions();
  const [sort, setSort] = useState<SortKey>('support');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.province-emperor-takeover',
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const sorted = useMemo(() => {
    const next = (takeover?.candidates ?? []).slice();
    next.sort((a, b) => {
      const av = sortValue(a, sort);
      const bv = sortValue(b, sort);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
      return Number(bv) - Number(av);
    });
    return next;
  }, [takeover?.candidates, sort]);

  const activeSelectedId = selectedId && sorted.some(candidate => candidate.id === selectedId)
    ? selectedId
    : takeover?.selectedPersonId && sorted.some(candidate => candidate.id === takeover.selectedPersonId)
      ? takeover.selectedPersonId
      : sorted[0]?.id ?? null;
  const selected = sorted.find(candidate => candidate.id === activeSelectedId) ?? null;
  const topSupport = Math.max(1, sorted[0]?.support ?? selected?.support ?? 1);

  const confirmSelected = useCallback(() => {
    if (!selected) return;
    confirmProvinceEmperorTakeoverCandidate(selected.id).catch(() => undefined);
  }, [selected]);

  const viewSelected = useCallback(() => {
    if (!selected) return;
    openRightSidebar('character', selected.id);
  }, [openRightSidebar, selected]);

  if (!mounted || !takeover?.active) return null;

  const governanceIcon = statIconPath('governance');
  const loyaltyIcon = statIconPath('loyalty');
  const fameIcon = '/assets/icons/I_Fame.png';
  const threatIcon = '/assets/icons/I_PowerBlocs.png';

  return createPortal(
    <CandidateModalFrame
      prefix="cam"
      closing={closing}
      onClose={close}
      headerIcon="/assets/icons/AssignGovernor.png"
      kicker={t('ProvinceMode.Transition.Kicker')}
      title={t('ProvinceMode.Transition.Title')}
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">
          {t('ProvinceMode.Transition.Body', { Province: takeover.provinceFactionName })}
        </CandidateMissionDescription>
        <CandidateMissionStat
          prefix="cam"
          icon={governanceIcon}
          label={t('ProvinceMode.Transition.LocalSupport')}
          value={selected ? formatNumber(selected.support) : ''}
        />
      </CandidateMissionBar>

      <CandidateBody prefix="cam">
        <CandidateListPane
          prefix="cam"
          items={sorted}
          selectedId={activeSelectedId}
          getId={candidate => candidate.id}
          activeSort={sort}
          sortOptions={[
            { id: 'support', label: t('ProvinceMode.Transition.Sort.Support') },
            { id: 'governance', label: t('Common.Governance') },
            { id: 'loyalty', label: t('Common.Loyalty') },
            { id: 'fame', label: t('Common.Fame') },
            { id: 'age', label: t('Common.Age') },
            { id: 'name', label: t('Common.Name') },
          ]}
          onSortChange={setSort}
          countLabel={t('ProvinceMode.Transition.AvailableCount', { Count: formatNumber(sorted.length) })}
          emptyLabel={t('BottomBar.GovernorAssignment.Empty')}
          renderRow={(candidate, active) => (
            <CandidateRow
              key={candidate.id}
              prefix="cam"
              active={active}
              onSelect={() => setSelectedId(candidate.id)}
              onViewCharacter={() => openRightSidebar('character', candidate.id)}
              personId={candidate.id}
              portraitSrc={candidate.portrait}
              portraitLayers={candidate.portraitLayers}
              portraitName={candidate.name}
              name={candidate.name}
              subParts={[
                t('AgentSelect.CandidateAge', { Age: formatNumber(candidate.age) }),
                candidate.sourceFactionName,
              ]}
              statIcon={governanceIcon}
              statValue={formatNumber(candidate.governance)}
              score={formatNumber(candidate.support)}
              scoreColor={candidateStatColour(candidate.governance)}
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
                title={selected.title || selected.sourceFactionName}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={t('ProvinceMode.Transition.LocalSupport')}
                  tier={candidateStatTier(selected.governance)}
                  colour={candidateStatColour(selected.governance)}
                  value={formatNumber(selected.support)}
                  valueIcon={governanceIcon}
                  scale={selected.support / topSupport}
                  fillClassName={candidateStatFillClass('cam', selected.governance)}
                  bonusLabel={t('Common.Governance')}
                  bonusValue={formatNumber(selected.governance)}
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
                      {
                        key: 'fame',
                        label: t('Common.Fame'),
                        icon: fameIcon,
                        value: selected.fame,
                      },
                      {
                        key: 'threat',
                        label: t('ProvinceMode.ThreatTitle'),
                        icon: threatIcon,
                        value: selected.threat,
                      },
                    ]}
                  />
                </CandidateSection>
              </div>

              <CandidateFooter prefix="cam">
                <GameButton variant="outline" onClick={viewSelected}>{t('Common.View')}</GameButton>
                <GameButton variant="burgundy" onClick={confirmSelected}>{t('ProvinceMode.Transition.Confirm')}</GameButton>
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
