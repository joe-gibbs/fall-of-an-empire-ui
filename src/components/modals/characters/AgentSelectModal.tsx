import { useState, useMemo, useCallback, type ReactNode } from 'react';
import Tooltip from '../../common/tooltips/Tooltip';
import GameButton from '../../common/buttons/GameButton';
import SegmentedControl from '../../common/forms/SegmentedControl';
import FactionRoundel from '../../common/entities/FactionRoundel';
import DropdownSelect, { type DropdownSelectOption } from '../../common/forms/DropdownSelect';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { useAgentCandidates } from '../../../data-source/index';
import type { AgentCandidateView, AgentTargetFaction, AgentSuitability } from '../../../bridge/characters/useAgentCandidatesBridge';
import { getStatColor } from '../../../utils/colorFormatters';
import { formatPersonActivity } from '../../../utils/displayLabels';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import {
  recruitCharacterForRoleBridge,
  refreshAgentCandidatesBridge,
  useRecruitCharacterGoldCost,
} from '../../../bridge/characters/useCharacterRecruitmentBridge';
import { useModalPresence } from '../../../hooks/useModalPresence';
import {
  CandidateBody,
  CandidateChanceBlock,
  CandidateDetailPane,
  CandidateFooter,
  CandidateHero,
  CandidateListPane,
  CandidateMissionBar,
  CandidateModalFrame,
  CandidateRow,
  CandidateSection,
  CandidateStatChips,
  CandidateTraits,
} from './CandidateSelectionModal';
import './AgentSelectModal.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
type AgentRole = 'diplomat' | 'spy';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-seeded target faction when launched from a faction sidebar. */
  targetFactionId?: string;
  /** Pre-seeded role (defaults to diplomat). */
  role?: AgentRole;
}

const roleIcon: Record<AgentRole, string> = {
  diplomat: '/assets/icons/I_Diplomacy.png',
  spy: '/assets/icons/I_Spy.png',
};

function suitabilityColour(pct: number): string {
  if (pct >= 70) return 'var(--green-light)';
  if (pct >= 45) return 'var(--gold)';
  if (pct >= 25) return 'var(--orange)';
  return 'var(--red)';
}

function suitabilityFillClass(pct: number): string {
  if (pct >= 60) return '';
  if (pct >= 35) return 'asm-chance-bar-fill--mid';
  return 'asm-chance-bar-fill--low';
}

function suitabilityTier(pct: number): string {
  if (pct >= 70) return webUIText('Common.Candidates.StrongCandidate');
  if (pct >= 45) return webUIText('Common.Candidates.CapableHand');
  if (pct >= 25) return webUIText('Common.Candidates.MarginalPick');
  return webUIText('Common.Candidates.PoorFit');
}

interface Contributor { traitId?: string; label: string; value: number }
interface StatContrib {
  key: string;
  label: string;
  icon: string;
  stat: number;     // raw stat value for display (fame scale 0-100, others 0-20ish)
  weight: number;   // 0-1
  value: number;    // signed contribution in suitability points
}
interface Aptitude {
  base: number;
  statContribs: StatContrib[];
  statTotal: number;
  opinion: number;
  traitSum: number;
  traits: Contributor[];
  total: number;
  primaryStat: number; // cunning, used by stat-sort (matches FactionSidebar display)
  xp: number;
  tier: AgentSuitability['tier'];
}

const STAT_ICON_BASE = '/assets/icons/StatIcons/';
const FAME_ICON = '/assets/icons/I_Fame.png';

function statLabel(key: string): string {
  switch (key) {
    case 'authority': return webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.118.1');
    case 'cunning': return webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.119.2');
    case 'governance': return webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.120.3');
    case 'loyalty': return webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.126.7');
    case 'fame': return webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.121.4');
    default: return key;
  }
}

function statIcon(key: string): string {
  if (key === 'fame') return FAME_ICON;
  const file = key.charAt(0).toUpperCase() + key.slice(1);
  return `${STAT_ICON_BASE}I_${file}.png`;
}

function toAptitude(suitability: AgentSuitability): Aptitude {
  return {
    base: suitability.base,
    statContribs: suitability.statContribs.map(s => ({
      key: s.key,
      label: statLabel(s.key),
      icon: statIcon(s.key),
      stat: s.stat,
      weight: s.weight,
      value: s.value,
    })),
    statTotal: suitability.statTotal,
    opinion: suitability.opinion,
    traitSum: suitability.traitSum,
    traits: suitability.traits.map(t => ({ traitId: t.traitId, label: t.label, value: t.value })),
    total: suitability.total,
    primaryStat: suitability.primaryStat,
    xp: suitability.xp,
    tier: suitability.tier,
  };
}

/* ── Dropdown ───────────────────────────────────────────────────────── */

interface DropdownOption extends DropdownSelectOption {
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  renderItem?: (option: DropdownOption) => ReactNode;
}

function Dropdown({ value, options, onChange, renderItem }: DropdownProps) {
  return (
    <DropdownSelect
      id="agent-target-faction"
      className="asm-dropdown"
      triggerClassName="asm-dropdown-trigger"
      textClassName="asm-dropdown-label"
      chevronClassName="asm-dropdown-chevron"
      menuClassName="asm-dropdown-menu"
      menuClosingClassName="asm-dropdown-menu--closing"
      optionClassName="asm-dropdown-item"
      optionActiveClassName="asm-dropdown-item--active"
      swatchClassName="asm-dropdown-swatch"
      value={value}
      options={options}
      escapeId="modal.agent-select.dropdown"
      isActive={false}
      renderOption={renderItem ? option => renderItem(option as DropdownOption) : undefined}
      onChange={onChange}
    />
  );
}

/* ── Main ───────────────────────────────────────────────────────────── */

type SortKey = 'fit' | 'role' | 'stat';
type CandidateFit = { character: AgentCandidateView['character']; fit: Aptitude };

export default function AgentSelectModal({ open, onClose, targetFactionId, role: seedRole }: Props) {
  const { openRightSidebar } = useGameActions();
  const { gold } = useGameState();

  // Initial state is read from the seed props on mount. Callers remount the
  // modal (via a key prop) when they want to re-seed from a different sidebar,
  // which keeps this component pure of prop->state effects.
  const [role, setRole] = useState<AgentRole>(seedRole ?? 'diplomat');
  const [targetId, setTargetId] = useState<string>(targetFactionId ?? 'faction-franhall');
  const [sort, setSort] = useState<SortKey>('fit');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recruiting, setRecruiting] = useState(false);

  const { mounted, closing, close } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.agent-select',
    allowFromInput: true,
    closeStrategy: 'request',
  });

  // Fetch live candidates + foreign factions from the bridge. Candidate
  // eligibility is already enforced server-side to match FactionSidebar.
  const fetched = useAgentCandidates(open ? role : null, targetId);
  const foreignFactions = useMemo<AgentTargetFaction[]>(
    () => (fetched?.factions ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [fetched],
  );
  const activeTargetId = foreignFactions.some(f => f.id === targetId)
    ? targetId
    : foreignFactions[0]?.id ?? targetId;

  const candidates = useMemo(() => {
    const eligible = fetched?.candidates ?? [];
    const withFit = eligible
      .map(c => {
        const suitability = c.suitability.find(s => s.targetFactionId === activeTargetId);
        return suitability ? { character: c.character, fit: toAptitude(suitability) } : null;
      })
      .filter((candidate): candidate is CandidateFit => candidate !== null);

    withFit.sort((a, b) => {
      if (sort === 'fit') return b.fit.total - a.fit.total;
      if (sort === 'role') return b.fit.xp - a.fit.xp;
      return b.fit.primaryStat - a.fit.primaryStat;
    });
    return withFit;
  }, [activeTargetId, fetched, sort]);

  const effectiveSelectedId = (selectedId && candidates.find(c => c.character.id === selectedId))
    ? selectedId
    : candidates[0]?.character.id ?? null;

  const selected = candidates.find(c => c.character.id === effectiveSelectedId) || candidates[0];
  const recruitGoldCost = useRecruitCharacterGoldCost();
  const canAffordRecruit = recruitGoldCost !== null && gold >= recruitGoldCost;

  const handleAppoint = useCallback(() => {
    if (!selected) return;
    bridgeCall('game.appoint_agent', {
      personId: selected.character.id,
      targetFactionId: activeTargetId,
      role,
    }).then(async () => {
      // Re-fetch and re-dispatch the faction data so the DiplomacySidebar's
      // subscription updates its assigned-agent slot without waiting for
      // the next user-triggered re-open.
      try {
        const fresh = await bridgeCall('game.get_faction_data', { factionId: activeTargetId, scope: 'full' });
        bridgeEvents.dispatchEvent(new CustomEvent('game.get_faction_data', { detail: fresh }));
        if (role === 'spy') {
          const interactions = await bridgeCall('game.get_spy_interactions', { targetFactionId: activeTargetId });
          bridgeEvents.dispatchEvent(new CustomEvent('game.get_spy_interactions', { detail: interactions }));
        } else {
          const interactions = await bridgeCall('game.get_faction_interactions', { targetFactionId: activeTargetId });
          bridgeEvents.dispatchEvent(new CustomEvent('game.get_faction_interactions', { detail: interactions }));
        }
      } catch (error) {
        acknowledgeBridgeFailure(error);
      }
      close();
    }).catch(acknowledgeBridgeFailure);
  }, [selected, activeTargetId, role, close]);

  const handleView = useCallback((charId: string) => {
    openRightSidebar('character', charId);
    close();
  }, [openRightSidebar, close]);

  const handleRecruit = useCallback(() => {
    if (recruiting || !canAffordRecruit) return;
    setRecruiting(true);
    void recruitCharacterForRoleBridge(role)
      .then(async (response) => {
        if (!response.recruited) {
          throw new Error(response.message || webUIText('CandidateRecruit.Failed'));
        }

        await refreshAgentCandidatesBridge(role, activeTargetId);
        if (response.personId) setSelectedId(response.personId);
      })
      .catch(error => acknowledgeBridgeFailure(error, 'game.recruit_character_for_role'))
      .finally(() => setRecruiting(false));
  }, [recruiting, canAffordRecruit, role, activeTargetId]);

  if (!mounted) return null;

  const primaryStatIcon = '/assets/icons/StatIcons/I_Cunning.png';
  const primaryStatLabel = webUIText("Auto.Var.componentsmodalsAgentSelectModal.297.1");
  const roleIconPath = role === 'diplomat' ? '/assets/icons/I_Diplomacy.png' : '/assets/icons/I_Intrigue.png';
  const roleReadable = role === 'diplomat' ? webUIText('AgentSelect.Role.Diplomatic') : webUIText('AgentSelect.Role.Intrigue');
  const recruitButton = recruitGoldCost === null ? undefined : (
    <GameButton
      variant="outline"
      className="candidate-list-action"
      icon="/assets/icons/I_Coins.png"
      onClick={handleRecruit}
      disabled={recruiting || !canAffordRecruit}
    >
      {webUIText('CandidateRecruit.RecruitWithCost', { Cost: formatNumber(recruitGoldCost) })}
    </GameButton>
  );

  return (
    <CandidateModalFrame
      prefix="asm"
      closing={closing}
      onClose={close}
      headerIcon={roleIcon[role]}
      title={webUIText('Auto.Attr.ComponentsModalsAgentSelectModal.307.9')}
    >
      <CandidateMissionBar prefix="asm">
          <div className="asm-mission-segmented">
            <SegmentedControl
              options={[{ id: 'diplomat', label: webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.312.10') }, { id: 'spy', label: webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.312.11') }]}
              active={role}
              onChange={(id) => setRole(id as AgentRole)}
            />
          </div>

          <div className="asm-mission-field asm-mission-field--grow">
            <span className="asm-mission-label"><WebUIText textKey="Auto.ComponentsModalsAgentSelectModal.318.1" /></span>
            <Dropdown
              value={activeTargetId}
              onChange={setTargetId}
              options={foreignFactions.map(f => ({ value: f.id, label: f.name, swatch: f.colour }))}
              renderItem={(o) => {
                const f = foreignFactions.find(ff => ff.id === o.value);
                return (
                  <>
                    {f && (
                      <FactionRoundel
                        colour={f.colour}
                        secondaryColour={f.secondaryColour}
                        emblem={f.emblem}
                        cultureGroup={f.cultureGroup}
                        name={f.name}
                        size="xs"
                        showRing={false}
                      />
                    )}
                    <span style={{ flex: 1 }}>{o.label}</span>
                    {f && <span style={{ fontSize: '0.72rem', color: 'var(--text-dark)' }}>{webUIText("AgentSelect.Opinion", { Value1: formatNumber(f.opinion) })}</span>}
                  </>
                );
              }}
            />
          </div>
      </CandidateMissionBar>

      <CandidateBody prefix="asm">
          <CandidateListPane
            prefix="asm"
            items={candidates}
            selectedId={effectiveSelectedId}
            getId={candidate => candidate.character.id}
            activeSort={sort}
            sortOptions={[
              { id: 'fit', label: webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.356.12') },
              { id: 'role', label: roleReadable },
              { id: 'stat', label: primaryStatLabel },
            ]}
            onSortChange={setSort}
            countLabel={webUIText("AgentSelect.Candidates", { Value1: formatNumber(candidates.length) })}
            emptyLabel={webUIText('Auto.ExtraAttr.ComponentsModalsAgentSelectModal.362.1')}
            headerAction={recruitButton}
            renderRow={({ character: c, fit }, active) => {
              const busy = c.activity === 'Diplomat' || c.activity === 'Spy';
              const subParts = [webUIText('AgentSelect.CandidateAge', { Age: formatNumber(c.age) })];
              if (busy) subParts.push(webUIText('AgentSelect.CurrentlyA', { Activity: formatPersonActivity(c.activity).toLowerCase() }));

              return (
                <CandidateRow
                  key={c.id}
                  prefix="asm"
                  active={active}
                  tutorialTarget={role === 'diplomat' ? 'DiplomatCandidate' : undefined}
                  busy={busy}
                  onSelect={() => setSelectedId(c.id)}
                  onViewCharacter={() => handleView(c.id)}
                  personId={c.id}
                  portraitSrc={c.portrait}
                  portraitLayers={c.portraitLayers}
                  portraitName={c.name}
                  name={c.name}
                  activity={c.activity}
                  subParts={subParts}
                  extra={(
                    <Tooltip
                      content={{ get title() { return webUIText("Auto.Prop.componentsmodalsAgentSelectModal.383.1", { RoleReadable: roleReadable }); }, get body() { return webUIText("Auto.Prop.componentsmodalsAgentSelectModal.383.2", { Label: fit.tier.label, Value2: formatNumber(fit.xp) }); } }}
                      position="top"
                      delay={200}
                    >
                      <div className="asm-row-stars">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={`asm-star${i < fit.tier.stars ? ' asm-star--filled' : ''}`} />
                        ))}
                      </div>
                    </Tooltip>
                  )}
                  statIcon={primaryStatIcon}
                  statValue={formatNumber(fit.primaryStat)}
                  statColor={getStatColor(fit.primaryStat)}
                  statTooltip={{
                    title: webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.398.13'),
                    body: webUIText('Auto.Prop.ComponentsModalsAgentSelectModal.399.14'),
                  }}
                  score={formatNumber(fit.total)}
                  scoreColor={suitabilityColour(fit.total)}
                />
              );
            }}
          />

          <CandidateDetailPane prefix="asm">
            {selected ? (
              <>
                <CandidateHero
                  prefix="asm"
                  personId={selected.character.id}
                  portraitSrc={selected.character.portrait}
                  portraitLayers={selected.character.portraitLayers}
                  name={selected.character.name}
                  title={selected.character.shortTitle}
                />

                <div className="asm-detail-body">
                  {(() => {
                    const busy = selected.character.activity === 'Diplomat' || selected.character.activity === 'Spy';
                    if (!busy) return null;
                    return (
                      <div className="asm-activity asm-activity--busy">
                        {webUIText("AgentSelect.ServingElsewhereRecall", { Value1: formatPersonActivity(selected.character.activity).toLowerCase() })}
                      </div>
                    );
                  })()}

                  <CandidateChanceBlock
                    prefix="asm"
                    label={webUIText('Auto.Attr.ComponentsModalsAgentSelectModal.433.15')}
                    tier={suitabilityTier(selected.fit.total)}
                    colour={suitabilityColour(selected.fit.total)}
                    value={formatNumber(selected.fit.total)}
                    valueMaxLabel="/100"
                    scale={selected.fit.total / 100}
                    fillClassName={suitabilityFillClass(selected.fit.total)}
                  />

                  <CandidateSection prefix="asm" title={webUIText('Auto.Attr.ComponentsModalsAgentSelectModal.442.16')}>
                    <CandidateStatChips
                      prefix="asm"
                      stats={selected.fit.statContribs.map(s => ({
                        key: s.key,
                        label: s.label,
                        icon: s.icon,
                        value: s.stat,
                        color: s.key === 'fame' ? 'var(--gold)' : getStatColor(s.stat),
                        tooltipBody: webUIText('AgentSelect.WeightInAptitude', { Weight: formatPercent(s.weight * 100), Role: roleReadable.toLowerCase() }),
                        extra: <span className="asm-stat-chip-weight">{formatPercent(s.weight * 100)}</span>,
                      }))}
                    />
                    <div className="asm-xp-row">
                      <img src={roleIconPath} alt="" className="asm-xp-icon" />
                      <span className="asm-xp-label">{roleReadable}</span>
                      <span className="asm-xp-tier">{selected.fit.tier.label}</span>
                      <span style={{ display: 'flex', marginLeft: '0.3rem' }}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={`asm-star${i < selected.fit.tier.stars ? ' asm-star--filled' : ''}`} style={{ marginRight: i < 4 ? '0.12rem' : 0 }} />
                        ))}
                      </span>
                    </div>
                  </CandidateSection>

                  <CandidateTraits
                    prefix="asm"
                    traits={selected.character.traits}
                    formatFooter={trait => trait.isTemporary && trait.remainingDays !== undefined
                      ? webUIText('Common.ExpiresInDays', { Days: formatNumber(trait.remainingDays), Unit: trait.remainingDays === 1 ? webUIText('Common.Day') : webUIText('Common.Days') })
                      : undefined}
                  />

                  <CandidateSection prefix="asm" title={webUIText('Auto.Attr.ComponentsModalsAgentSelectModal.475.17')}>
                    <div className="asm-breakdown">
                      <BreakdownRow
                        icon={roleIconPath}
                        label={webUIText("Auto.Attr.componentsmodalsAgentSelectModal.479.1", { Label: selected.fit.tier.label })}
                        sub={webUIText('Auto.ExtraAttr.ComponentsModalsAgentSelectModal.480.2')}
                        value={selected.fit.base}
                        signed={false}
                      />
                      {selected.fit.statContribs.map(s => (
                        <BreakdownRow
                          key={s.key}
                          icon={s.icon}
                          label={s.label}
                          sub={webUIText("Auto.Attr.componentsmodalsAgentSelectModal.489.1", { Value1: formatNumber(s.stat), Value2: formatPercent(s.weight * 100) })}
                          value={s.value}
                        />
                      ))}
                      <BreakdownRow
                        icon={role === 'diplomat' ? "/assets/icons/I_OpinionNeutral.png" : "/assets/icons/I_Spy.png"}
                        label={role === 'diplomat' ? webUIText("AgentSelect.TargetOpinion") : webUIText("AgentSelect.DiplomaticPosture")}
                        value={selected.fit.opinion}
                        className={selected.fit.traits.length === 0 ? 'asm-breakdown-row--last' : ''}
                      />
                      {selected.fit.traits.map((t, index) => {
                        const matchingTrait = selected.character.traits.find(tr => tr.id === t.traitId || tr.name === t.label);
                        return (
                          <BreakdownRow
                            key={t.label}
                            icon={matchingTrait ? `/assets/traits/${matchingTrait.icon}.png` : undefined}
                            label={t.label}
                            sub={webUIText('Auto.ExtraAttr.ComponentsModalsAgentSelectModal.506.3')}
                            value={t.value}
                            className={index === selected.fit.traits.length - 1 ? 'asm-breakdown-row--last' : ''}
                          />
                        );
                      })}
                      <div className="asm-breakdown-total">
                        <span className="asm-breakdown-total-label"><WebUIText textKey="Auto.ComponentsModalsAgentSelectModal.512.2" /></span>
                        <span className="asm-breakdown-total-value" style={{ color: suitabilityColour(selected.fit.total) }}>
                          {formatNumber(selected.fit.total)}
                        </span>
                      </div>
                    </div>
                  </CandidateSection>

                </div>

                <CandidateFooter prefix="asm">
                  <GameButton variant="outline" onClick={() => handleView(selected.character.id)}><WebUIText textKey="Auto.ComponentsModalsAgentSelectModal.523.3" /></GameButton>
                  <GameButton variant="burgundy" tutorialTarget={role === 'diplomat' ? 'DiplomatAppointmentConfirmButton' : undefined} onClick={handleAppoint}><WebUIText textKey="Auto.ComponentsModalsAgentSelectModal.524.4" /></GameButton>
                </CandidateFooter>
              </>
            ) : (
              <div className="asm-empty"><WebUIText textKey="Auto.ComponentsModalsAgentSelectModal.528.5" /></div>
            )}
          </CandidateDetailPane>
      </CandidateBody>
    </CandidateModalFrame>
  );
}

function BreakdownRow({
  icon, label, sub, value, signed = true, className = '',
}: { icon?: string; label: string; sub?: string; value: number; signed?: boolean; className?: string }) {
  const cls = value > 0 ? 'asm-breakdown-value--pos' : value < 0 ? 'asm-breakdown-value--neg' : 'asm-breakdown-value--zero';
  const text = signed ? formatSignedNumber(value) : formatNumber(value);
  return (
    <div className={`asm-breakdown-row${className ? ` ${className}` : ''}`}>
      {icon
        ? <img src={icon} alt="" className="asm-breakdown-icon" draggable={false} />
        : <span className="asm-breakdown-icon asm-breakdown-icon--empty" />}
      <span className="asm-breakdown-label">{label}</span>
      {sub && <span className="asm-breakdown-sub">{sub}</span>}
      <span className={`asm-breakdown-value ${cls}`}>{text}</span>
    </div>
  );
}
