import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Tooltip from '../../common/tooltips/Tooltip';
import GameButton from '../../common/buttons/GameButton';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { useRegionGovernorCandidates } from '../../../data-source/index';
import { appointRegionGovernorBridge, type RegionGovernorCandidateView } from '../../../bridge/settlements-economy/useSettlementManagementBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import {
  RECRUIT_CHARACTER_GOLD_COST,
  recruitCharacterForRoleBridge,
  refreshRegionGovernorCandidatesBridge,
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
  candidateStatColour,
  candidateStatFillClass,
  statIconPath,
} from './CandidateSelectionUtils';
import './CourtAppointmentModal.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface Props {
  open: boolean;
  settlementId: string;
  settlementName: string;
  regionName: string;
  currentGovernorId?: string;
  governorCouldRebel?: boolean;
  onClose: () => void;
  onAppointed?: () => void;
}

const PRIMARY_STAT: StatKey = 'governance';

type SortKey = 'fit' | 'name' | 'age';

function fitTier(stat: number): string {
  if (stat >= 15) return webUIText("Auto.Fix.Return.componentsmodalsRegionGovernorAppointmentModal.53.1");
  if (stat >= 12) return webUIText("Auto.Fix.Return.componentsmodalsRegionGovernorAppointmentModal.54.1");
  if (stat >= 8) return webUIText("Auto.Fix.Return.componentsmodalsRegionGovernorAppointmentModal.55.1");
  if (stat >= 5) return webUIText("Auto.Fix.Return.componentsmodalsRegionGovernorAppointmentModal.56.1");
  return webUIText("Auto.Fix.Return.componentsmodalsRegionGovernorAppointmentModal.57.1");
}

function candidateSortValue(candidate: RegionGovernorCandidateView, sort: SortKey): string | number {
  if (sort === 'name') return candidate.name;
  if (sort === 'age') return candidate.age;
  return candidate.stats.governance;
}

export default function RegionGovernorAppointmentModal({
  open,
  settlementId,
  settlementName,
  regionName,
  currentGovernorId,
  governorCouldRebel,
  onClose,
  onAppointed,
}: Props) {
  const { openRightSidebar } = useGameActions();
  const { gold } = useGameState();
  const [sort, setSort] = useState<SortKey>('fit');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recruiting, setRecruiting] = useState(false);

  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.region-governor-appointment',
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const candidatesResult = useRegionGovernorCandidates(open ? settlementId : null);
  const candidates = useMemo(() => {
    const next = (candidatesResult ?? []).slice();
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
  const selectedIsCurrent = !!selected && selected.id === currentGovernorId;
  const canAffordRecruit = gold >= RECRUIT_CHARACTER_GOLD_COST;

  const handleAppoint = useCallback(() => {
    if (!selected || selectedIsCurrent) return;
    void appointRegionGovernorBridge(settlementId, selected.id).then((ok) => {
      if (ok) onAppointed?.();
    });
    close();
  }, [selected, selectedIsCurrent, settlementId, onAppointed, close]);

  const handleRemove = useCallback(() => {
    if (!currentGovernorId) return;
    void appointRegionGovernorBridge(settlementId, null).then((ok) => {
      if (ok) onAppointed?.();
    });
    close();
  }, [currentGovernorId, settlementId, onAppointed, close]);

  const handleView = useCallback((charId: string) => {
    openRightSidebar('character', charId);
    close();
  }, [openRightSidebar, close]);

  const handleRecruit = useCallback(() => {
    if (recruiting || !canAffordRecruit) return;
    setRecruiting(true);
    void recruitCharacterForRoleBridge('governor', { contextId: settlementId })
      .then(async (response) => {
        if (!response.recruited) {
          throw new Error(response.message || webUIText('CandidateRecruit.Failed'));
        }

        await refreshRegionGovernorCandidatesBridge(settlementId);
        if (response.personId) setSelectedId(response.personId);
      })
      .catch(error => acknowledgeBridgeFailure(error, 'game.recruit_character_for_role'))
      .finally(() => setRecruiting(false));
  }, [recruiting, canAffordRecruit, settlementId]);

  if (!mounted) return null;

  const primaryStatIcon = statIconPath(PRIMARY_STAT);
  const primaryStatLabel = webUIText('Common.Governance');
  const headerIcon = currentGovernorId ? '/assets/icons/I_ReplaceGovernor.png' : '/assets/icons/AssignGovernor.png';
  const recruitButton = (
    <GameButton
      variant="outline"
      className="candidate-list-action"
      icon="/assets/icons/I_Coins.png"
      onClick={handleRecruit}
      disabled={recruiting || !canAffordRecruit}
    >
      {webUIText('CandidateRecruit.RecruitWithCost', { Cost: formatNumber(RECRUIT_CHARACTER_GOLD_COST) })}
    </GameButton>
  );

  return createPortal(
    <CandidateModalFrame
      prefix="cam"
      closing={closing}
      onClose={close}
      headerIcon={headerIcon}
      kicker={webUIText('Auto.ExtraAttr.ComponentsModalsRegionGovernorAppointmentModal.137.1')}
      title={regionName || settlementName}
    >
      <CandidateMissionBar prefix="cam">
        <CandidateMissionDescription prefix="cam">
          {webUIText("Auto.Fix.Expr.componentsmodalsRegionGovernorAppointmentModal.142.1", { Value1: regionName || settlementName })}
        </CandidateMissionDescription>
        <CandidateMissionStat prefix="cam" icon={primaryStatIcon} label={webUIText('Auto.Attr.ComponentsModalsRegionGovernorAppointmentModal.144.1')} value={primaryStatLabel} />
      </CandidateMissionBar>

      <CandidateBody prefix="cam">
        <CandidateListPane
          prefix="cam"
          items={candidates}
          selectedId={effectiveSelectedId}
          getId={candidate => candidate.id}
          activeSort={sort}
          sortOptions={[
            { id: 'fit', label: primaryStatLabel },
            { id: 'name', label: webUIText('Auto.Prop.ComponentsModalsRegionGovernorAppointmentModal.156.2') },
            { id: 'age', label: webUIText('Auto.Prop.ComponentsModalsRegionGovernorAppointmentModal.157.3') },
          ]}
          onSortChange={setSort}
          countLabel={webUIText("Auto.Fix.Expr.componentsmodalsRegionGovernorAppointmentModal.160.1", { Value1: formatNumber(candidates.length) })}
          emptyLabel={webUIText('Auto.ExtraAttr.ComponentsModalsRegionGovernorAppointmentModal.161.2')}
          headerAction={recruitButton}
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
                  candidate.isCurrentGovernor ? webUIText('RegionGovernor.CurrentGovernor') : webUIText('AgentSelect.CandidateAge', { Age: formatNumber(candidate.age) }),
                  webUIText('RegionGovernor.RegionCount', { Current: formatNumber(candidate.currentRegionCount), Max: formatNumber(candidate.maxRegionCount) }),
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
                title={selected.isCurrentGovernor ? webUIText("Auto.Fix.ExprTrue.componentsmodalsRegionGovernorAppointmentModal.197.1") : webUIText("Auto.Fix.ExprFalse.componentsmodalsRegionGovernorAppointmentModal.197.1")}
              />

              <div className="cam-detail-body">
                <CandidateChanceBlock
                  prefix="cam"
                  label={primaryStatLabel}
                  tier={fitTier(selected.stats.governance)}
                  colour={candidateStatColour(selected.stats.governance)}
                  value={formatNumber(selected.stats.governance)}
                  valueIcon={primaryStatIcon}
                  scale={selected.stats.governance / 20}
                  fillClassName={candidateStatFillClass('cam', selected.stats.governance)}
                  bonusLabel={webUIText('Auto.ExtraAttr.ComponentsModalsRegionGovernorAppointmentModal.210.3')}
                  bonusValue={`${formatNumber(selected.currentRegionCount)}/${formatNumber(selected.maxRegionCount)}`}
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
                      tooltipBody: stat.key === PRIMARY_STAT ? webUIText('RegionGovernor.PrimaryStatBody') : undefined,
                    }))}
                  />
                </CandidateSection>

                <CandidateTraits prefix="cam" traits={selected.traits} />
              </div>

              <CandidateFooter prefix="cam">
                {currentGovernorId && (
                  <Tooltip
                    position="top"
                    delay={150}
                    content={{
                      title: webUIText('Auto.Prop.ComponentsModalsRegionGovernorAppointmentModal.237.5'),
                      get body() { return governorCouldRebel ? webUIText("Auto.Fix.PropExprTrue.componentsmodalsRegionGovernorAppointmentModal.239.1") : webUIText("Auto.Fix.PropExprFalse.componentsmodalsRegionGovernorAppointmentModal.240.1"); },
                    }}
                  >
                    <GameButton variant="outline" onClick={handleRemove}><WebUIText textKey="Auto.ComponentsModalsRegionGovernorAppointmentModal.242.1" /></GameButton>
                  </Tooltip>
                )}
                <GameButton variant="outline" onClick={() => handleView(selected.id)}><WebUIText textKey="Auto.ComponentsModalsRegionGovernorAppointmentModal.245.2" /></GameButton>
                <GameButton variant="burgundy" onClick={handleAppoint} disabled={selectedIsCurrent}><WebUIText textKey="Auto.ComponentsModalsRegionGovernorAppointmentModal.246.3" /></GameButton>
              </CandidateFooter>
            </>
          ) : (
            <div className="cam-empty"><WebUIText textKey="Auto.ComponentsModalsRegionGovernorAppointmentModal.250.4" /></div>
          )}
        </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>,
    document.body,
  );
}
