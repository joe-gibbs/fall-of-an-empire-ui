import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import GameButton from '../../common/buttons/GameButton';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { useBishopCandidates } from '../../../data-source/index';
import { appointBishop, type DioceseView } from '../../../bridge/settlements-economy/useDiocesesBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import {
  RECRUIT_CHARACTER_GOLD_COST,
  recruitCharacterForRoleBridge,
  refreshBishopCandidatesBridge,
} from '../../../bridge/characters/useCharacterRecruitmentBridge';
import type { StatKey } from '../../../data/types';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
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
} from '../characters/CandidateSelectionModal';
import {
  ALL_STATS,
  candidateStatColour,
  candidateStatFillClass,
  statIconPath,
} from '../characters/CandidateSelectionUtils';
import './BishopAppointmentModal.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface Props {
  open: boolean;
  assignment: DioceseView | null;
  religionKey: string;
  religionName: string;
  religionIcon: string;
  onClose: () => void;
  onAppointed?: () => void;
}

const PRIMARY_STAT: StatKey = 'authority';

type SortKey = 'fit' | 'name' | 'age';

function fitTier(stat: number): string {
  if (stat >= 15) return webUIText("Auto.Fix.Return.componentsmodalsBishopAppointmentModal.50.1");
  if (stat >= 12) return webUIText("Auto.Fix.Return.componentsmodalsBishopAppointmentModal.51.1");
  if (stat >= 8) return webUIText("Auto.Fix.Return.componentsmodalsBishopAppointmentModal.52.1");
  if (stat >= 5) return webUIText("Auto.Fix.Return.componentsmodalsBishopAppointmentModal.53.1");
  return webUIText("Auto.Fix.Return.componentsmodalsBishopAppointmentModal.54.1");
}

export default function BishopAppointmentModal({
  open, assignment, religionKey, religionName, religionIcon, onClose, onAppointed,
}: Props) {
  const { openRightSidebar } = useGameActions();
  const { gold } = useGameState();

  const [sort, setSort] = useState<SortKey>('fit');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recruiting, setRecruiting] = useState(false);

  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.bishop-appointment',
    allowFromInput: true,
  });

  const [renderedAssignment, setRenderedAssignment] = useState<DioceseView | null>(assignment);
  if (assignment && assignment !== renderedAssignment) setRenderedAssignment(assignment);
  if (!mounted && renderedAssignment !== null) setRenderedAssignment(null);

  const fetched = useBishopCandidates(open && religionKey ? religionKey : null);

  const candidates = useMemo(() => {
    const pool = fetched ?? [];
    const withFit = pool.map(character => ({ character, stat: character.stats[PRIMARY_STAT] }));
    withFit.sort((a, b) => {
      if (sort === 'name') return a.character.name.localeCompare(b.character.name);
      if (sort === 'age') return a.character.age - b.character.age;
      return b.stat - a.stat;
    });
    return withFit;
  }, [fetched, sort]);

  const effectiveSelectedId = selectedId && candidates.find(candidate => candidate.character.id === selectedId)
    ? selectedId
    : candidates[0]?.character.id ?? null;

  const selected = candidates.find(candidate => candidate.character.id === effectiveSelectedId) || candidates[0];
  const canAffordRecruit = gold >= RECRUIT_CHARACTER_GOLD_COST;

  const handleAppoint = useCallback(() => {
    if (!selected || !renderedAssignment || !religionKey) return;
    void appointBishop(religionKey, renderedAssignment.landKey, selected.character.id).then((ok) => {
      if (ok) onAppointed?.();
    });
    close();
  }, [selected, renderedAssignment, religionKey, onAppointed, close]);

  const handleView = useCallback((charId: string) => {
    openRightSidebar('character', charId);
    close();
  }, [openRightSidebar, close]);

  const handleRecruit = useCallback(() => {
    if (recruiting || !religionKey || !canAffordRecruit) return;
    setRecruiting(true);
    void recruitCharacterForRoleBridge('bishop', { religionKey })
      .then(async (response) => {
        if (!response.recruited) {
          throw new Error(response.message || webUIText('CandidateRecruit.Failed'));
        }

        await refreshBishopCandidatesBridge(religionKey);
        if (response.personId) setSelectedId(response.personId);
      })
      .catch(error => acknowledgeBridgeFailure(error, 'game.recruit_character_for_role'))
      .finally(() => setRecruiting(false));
  }, [recruiting, religionKey, canAffordRecruit]);

  if (!mounted || !renderedAssignment) return null;

  const primaryStatIcon = statIconPath(PRIMARY_STAT);
  const primaryStatLabel = webUIText('Common.Authority');
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
      prefix="bam"
      closing={closing}
      onClose={close}
      headerIcon={religionIcon}
      kicker={webUIText('Auto.ExtraAttr.ComponentsModalsBishopAppointmentModal.118.1')}
      title={renderedAssignment.landName}
    >
      <CandidateMissionBar prefix="bam">
        <CandidateMissionDescription prefix="bam">
          {webUIText("Auto.Fix.Expr.componentsmodalsBishopAppointmentModal.123.1", { ReligionName: religionName, LandName: renderedAssignment.landName })}
        </CandidateMissionDescription>
        <CandidateMissionStat prefix="bam" label={webUIText('Auto.Attr.ComponentsModalsBishopAppointmentModal.125.1')} value={formatNumber(renderedAssignment.followers)} />
        <CandidateMissionStat prefix="bam" label={webUIText('Auto.Attr.ComponentsModalsBishopAppointmentModal.126.2')} value={formatPercent(renderedAssignment.followerPercent * 100)} />
        <CandidateMissionStat
          prefix="bam"
          icon={primaryStatIcon}
          label={webUIText('Auto.Attr.ComponentsModalsBishopAppointmentModal.130.3')}
          value={primaryStatLabel}
          className="bam-mission-stat--primary"
        />
      </CandidateMissionBar>

      <CandidateBody prefix="bam">
        <CandidateListPane
          prefix="bam"
          items={candidates}
          selectedId={effectiveSelectedId}
          getId={candidate => candidate.character.id}
          activeSort={sort}
          sortOptions={[
            { id: 'fit', label: primaryStatLabel },
            { id: 'name', label: webUIText('Auto.Prop.ComponentsModalsBishopAppointmentModal.145.4') },
            { id: 'age', label: webUIText('Auto.Prop.ComponentsModalsBishopAppointmentModal.146.5') },
          ]}
          onSortChange={setSort}
          countLabel={webUIText("Auto.Fix.Expr.componentsmodalsBishopAppointmentModal.149.1", { Value1: formatNumber(candidates.length) })}
          emptyLabel={webUIText('Auto.ExtraAttr.ComponentsModalsBishopAppointmentModal.150.2')}
          headerAction={recruitButton}
          renderRow={({ character, stat }, active) => (
            <CandidateRow
              key={character.id}
              prefix="bam"
              active={active}
              onSelect={() => setSelectedId(character.id)}
              onViewCharacter={() => handleView(character.id)}
              personId={character.id}
              portraitSrc={character.portrait}
              portraitLayers={character.portraitLayers}
              portraitName={character.name}
              name={character.name}
              activity={character.activity}
              subParts={[character.shortTitle, webUIText('AgentSelect.CandidateAge', { Age: formatNumber(character.age) })]}
              statIcon={primaryStatIcon}
              statValue={formatNumber(stat)}
              statColor={candidateStatColour(stat)}
            />
          )}
        />

        <CandidateDetailPane prefix="bam">
          {selected ? (
            <>
              <CandidateHero
                prefix="bam"
                personId={selected.character.id}
                portraitSrc={selected.character.portrait}
                portraitLayers={selected.character.portraitLayers}
                name={selected.character.name}
                title={selected.character.shortTitle}
              />

              <div className="bam-detail-body">
                <CandidateChanceBlock
                  prefix="bam"
                  label={primaryStatLabel}
                  tier={fitTier(selected.stat)}
                  colour={candidateStatColour(selected.stat)}
                  value={formatNumber(selected.stat)}
                  valueIcon={primaryStatIcon}
                  scale={selected.stat / 20}
                  fillClassName={candidateStatFillClass('bam', selected.stat)}
                  bonusLabel={webUIText('Auto.ExtraAttr.ComponentsModalsBishopAppointmentModal.193.3')}
                  bonusValue={formatSignedNumber(selected.stat)}
                />

                <CandidateSection prefix="bam" title={webUIText('Auto.Attr.ComponentsModalsBishopAppointmentModal.197.6')}>
                  <CandidateStatChips
                    prefix="bam"
                    stats={ALL_STATS.map(stat => ({
                      key: stat.key,
                      label: stat.label,
                      icon: statIconPath(stat.key),
                      value: selected.character.stats[stat.key],
                      primary: stat.key === PRIMARY_STAT,
                      tooltipBody: stat.key === PRIMARY_STAT
                        ? webUIText('BishopAppointment.PrimaryStatBody')
                        : undefined,
                    }))}
                  />
                </CandidateSection>

                <CandidateTraits
                  prefix="bam"
                  traits={selected.character.traits}
                  formatFooter={trait => trait.isTemporary && trait.remainingDays !== undefined
                    ? webUIText('Common.ExpiresInDays', { Days: formatNumber(trait.remainingDays), Unit: trait.remainingDays === 1 ? webUIText('Common.Day') : webUIText('Common.Days') })
                    : undefined}
                />
              </div>

              <CandidateFooter prefix="bam">
                <GameButton variant="outline" onClick={() => handleView(selected.character.id)}><WebUIText textKey="Auto.ComponentsModalsBishopAppointmentModal.222.1" /></GameButton>
                <GameButton variant="burgundy" onClick={handleAppoint}><WebUIText textKey="Auto.ComponentsModalsBishopAppointmentModal.223.2" /></GameButton>
              </CandidateFooter>
            </>
          ) : (
            <div className="bam-empty"><WebUIText textKey="Auto.ComponentsModalsBishopAppointmentModal.227.3" /></div>
          )}
        </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>,
    document.body,
  );
}
