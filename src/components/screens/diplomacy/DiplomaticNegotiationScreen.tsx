import { useEffect, useMemo, useRef, useState, type AnimationEvent } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import Panel from '../../common/layout/shell/Panel';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import DropdownSelect, { type DropdownSelectOption } from '../../common/forms/DropdownSelect';
import NumberStepper from '../../common/forms/NumberStepper';
import ResourceLabel from '../../common/data-display/stats/ResourceLabel';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import { useGameActions } from '../../../context/GameContext';
import { useDiplomaticNegotiationBridge, type DiplomaticNegotiationState, type DiplomaticProposalDraft } from '../../../bridge/diplomacy/useDiplomaticNegotiationBridge';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { formatTreatyType } from '../../../utils/displayLabels';
import { WebkilnAssetPath } from '../../../utils/assets';
import { registerScreen } from '../../../registry/index';
import { renderAcceptabilityBreakdown } from './acceptabilityBreakdown';
import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import './PeaceNegotiationScreen.css';
import './DiplomaticNegotiationScreen.css';

interface DiplomaticNegotiationScreenProps {
  screenId?: string | null;
  targetFactionId?: string | null;
  onClose: () => void;
}

type TreatyOption = DiplomaticNegotiationState['availableOffers'][number];
type TreatyEntry = DiplomaticNegotiationState['proposals'][number];
type ResourceOption = DiplomaticNegotiationState['ourResources'][number];
type AcceptabilityTone = 'green' | 'gold' | 'red';

const ACCEPTED_HOLD_MS = 900;
const DURATION_YEAR_LABELS = ['1', '2', '5', '10'] as const;

const TREATY_ICONS: Record<string, string> = {
  military_alliance: '/assets/icons/Treaties/I_MilitaryAlliance.png',
  defensive_alliance: '/assets/icons/Treaties/I_DefensiveAlliance.png',
  non_aggression: '/assets/icons/Treaties/I_NonAggression.png',
  knowledge_sharing: '/assets/icons/Treaties/I_MapSharing.png',
  merchant_rights: '/assets/icons/Treaties/I_TradeAgreement.png',
  trade: '/assets/icons/Treaties/I_TradeAgreement.png',
  trade_one_off: '/assets/icons/Treaties/I_TradeAgreement.png',
  tribute: '/assets/icons/Treaties/I_Tribute.png',
  tribute_one_off: '/assets/icons/Treaties/I_Tribute.png',
  passage_rights: '/assets/icons/Treaties/I_MilitaryAccess.png',
  subject: '/assets/icons/Treaties/I_Vassalage.png',
};

const TREATY_TYPE_DISPLAY_KEYS: Record<string, string> = {
  military_alliance: 'MilitaryAlliance',
  defensive_alliance: 'DefensiveAlliance',
  non_aggression: 'NonAggression',
  knowledge_sharing: 'KnowledgeSharing',
  merchant_rights: 'MerchantRights',
  trade: 'Trade',
  trade_one_off: 'TradeOneOff',
  tribute: 'Tribute',
  tribute_one_off: 'TributeOneOff',
  passage_rights: 'PassageRights',
  subject: 'Subject',
};

function fmtSigned(value: number | undefined | null): string {
  return formatSignedNumber(value);
}

function proposalKey(proposal: Pick<DiplomaticProposalDraft, 'side' | 'type' | 'resourceName'>): string {
  return `${proposal.side}:${proposal.type}:${proposal.resourceName ?? ''}`;
}

function proposalIcon(type: string): string {
  return TREATY_ICONS[type] ?? '/assets/icons/I_Diplomacy.png';
}

function resourceIcon(name: string): string {
  return WebkilnAssetPath(`/assets/resources/${name}.png`);
}

function proposalTypeLabel(type: string): string {
  return formatTreatyType(TREATY_TYPE_DISPLAY_KEYS[type] ?? type);
}

function draftFromOption(option: TreatyOption): DiplomaticProposalDraft {
  return {
    proposalId: option.optionId,
    type: option.type,
    side: option.side,
    tributeAmount: option.defaultTributeAmount,
    durationDays: option.defaultDurationDays,
    resourceName: option.defaultResourceName,
    resourceAmount: option.defaultResourceAmount,
    vassalageSubtype: option.defaultVassalageSubtype,
  };
}

function draftFromEntry(entry: TreatyEntry): DiplomaticProposalDraft {
  return {
    proposalId: entry.proposalId,
    type: entry.type,
    side: entry.side,
    tributeAmount: entry.tributeAmount,
    durationDays: entry.durationDays,
    resourceName: entry.resourceName,
    resourceAmount: entry.resourceAmount,
    vassalageSubtype: entry.vassalageSubtype,
  };
}

function isRequest(proposal: Pick<DiplomaticProposalDraft, 'side'> | Pick<TreatyOption, 'side'> | Pick<TreatyEntry, 'side'>): boolean {
  return proposal.side === 'request';
}

function isMutual(proposal: Pick<DiplomaticProposalDraft, 'side'> | Pick<TreatyOption, 'side'> | Pick<TreatyEntry, 'side'>): boolean {
  return proposal.side === 'mutual';
}

function isTribute(type: string): boolean {
  return type === 'tribute' || type === 'tribute_one_off';
}

function isResourceTransfer(type: string): boolean {
  return type === 'trade' || type === 'trade_one_off';
}

function hasDuration(type: string, durationDays: number | undefined): boolean {
  return Boolean(durationDays && durationDays > 0)
    || type === 'non_aggression'
    || type === 'passage_rights'
    || type === 'trade'
    || type === 'merchant_rights'
    || type === 'tribute';
}

function amountFromText(value: string): number {
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function boundedResourceAmount(value: number, resource?: ResourceOption): number {
  const amount = Math.max(0, Math.round(value));
  if (!resource) return amount;
  return Math.min(amount, Math.max(0, Math.round(resource.amount)));
}

function isOneOffTribute(type: string): boolean {
  return type === 'tribute_one_off';
}

function boundedTributeAmount(value: number, maxGold?: number): number {
  const amount = Math.max(0, Math.round(value));
  if (maxGold === undefined) return amount;
  return Math.min(amount, Math.max(0, Math.round(maxGold)));
}

function defaultResourceTransferAmount(resource: ResourceOption, currentAmount: number): number {
  const available = Math.max(0, Math.round(resource.amount));
  if (available <= 0) return 0;
  if (currentAmount > 0) return Math.min(currentAmount, available);
  return Math.min(available, 100);
}

function acceptanceTone(score: number | undefined | null): AcceptabilityTone {
  const value = score ?? 0;
  if (value > 0) return 'green';
  if (value > -20) return 'gold';
  return 'red';
}

function scoreTone(score: number | undefined | null): 'positive' | 'neutral' | 'negative' {
  const value = score ?? 0;
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function proposalFallbackLabel(proposal: DiplomaticProposalDraft): string {
  if (isMutual(proposal)) return webUIText('TreatyNegotiation.MutualFallback');
  if (isRequest(proposal)) return webUIText('TreatyNegotiation.RequestFallback');
  return webUIText('TreatyNegotiation.OfferFallback');
}

function ResourceDropdown({
  id,
  value,
  resources,
  onSelect,
}: {
  id: string;
  value: string;
  resources: ResourceOption[];
  onSelect: (resource: ResourceOption) => void;
}) {
  const selected = resources.find(resource => resource.name === value) ?? resources[0];
  if (!selected) return null;

  if (resources.length === 1) {
    return (
      <ResourceLabel
        icon={resourceIcon(selected.name)}
        name={selected.label}
        amount={formatNumber(Math.round(selected.amount))}
        className="pns-resource-label pns-resource-label--static"
        iconClassName="pns-resource-select-icon"
        nameClassName="pns-resource-select-name"
        amountClassName="pns-resource-select-amount"
      />
    );
  }

  const options: DropdownSelectOption[] = resources.map(resource => ({
    value: resource.name,
    label: resource.label,
    icon: resourceIcon(resource.name),
    meta: formatNumber(Math.round(resource.amount)),
  }));
  const renderResourceLabel = (option: DropdownSelectOption | undefined) => (
    <ResourceLabel
      icon={option?.icon}
      name={option?.label ?? ''}
      amount={option?.meta}
      className="pns-resource-label"
      iconClassName="pns-resource-select-icon"
      nameClassName="pns-resource-select-name"
      amountClassName="pns-resource-select-amount"
    />
  );

  return (
    <DropdownSelect
      id={id}
      className="pns-resource-select"
      triggerClassName="pns-resource-select-button"
      textClassName="pns-resource-select-name"
      chevronClassName="pns-resource-select-chevron"
      menuClassName="pns-resource-select-menu"
      menuClosingClassName="pns-resource-select-menu--closing"
      optionClassName="pns-resource-select-option"
      optionActiveClassName="pns-resource-select-option--active"
      value={selected.name}
      options={options}
      escapeId={`treaty.resource.${id}`}
      isActive={false}
      position="below-left"
      portal
      closeOnScroll
      stopPropagation
      renderValue={renderResourceLabel}
      renderOption={renderResourceLabel}
      onChange={(resourceName) => {
        const resource = resources.find(candidate => candidate.name === resourceName);
        if (resource) onSelect(resource);
      }}
    />
  );
}

function ProposalChip({
  proposal,
  live,
  resourceOptions,
  maxGold,
  amountStep,
  durationOptionsDays,
  onRemove,
  onChange,
}: {
  proposal: DiplomaticProposalDraft;
  live?: TreatyEntry;
  resourceOptions: ResourceOption[];
  maxGold?: number;
  amountStep: number;
  durationOptionsDays: number[];
  onRemove: () => void;
  onChange: (patch: Partial<DiplomaticProposalDraft>) => void;
}) {
  const side = isMutual(proposal) ? 'mutual' : isRequest(proposal) ? 'demand' : 'concession';
  const label = proposalTypeLabel(proposal.type) || live?.label || proposalFallbackLabel(proposal);
  const tributeMax = isOneOffTribute(proposal.type) ? maxGold : undefined;
  const amount = boundedTributeAmount(proposal.tributeAmount ?? live?.tributeAmount ?? 0, tributeMax);
  const resourceName = proposal.resourceName || live?.resourceName || '';
  const selectedResource = resourceOptions.find(resource => resource.name === resourceName);
  const resourceLabel = selectedResource?.label || live?.resourceLabel || '';
  const resourceAmount = boundedResourceAmount(proposal.resourceAmount ?? live?.resourceAmount ?? 0, selectedResource);
  const durationDays = proposal.durationDays || live?.durationDays || 0;
  const showDuration = hasDuration(proposal.type, durationDays);
  const detail = isResourceTransfer(proposal.type) ? '' : resourceLabel;
  const valueTone = scoreTone(live?.value);

  return (
    <div className={`pns-draft-chip pns-draft-chip--${side}`}>
      <img src={proposalIcon(proposal.type)} alt="" className="pns-term-icon" />
      <div className="pns-draft-copy">
        <span className="pns-draft-chip-name">{label}</span>
        {detail ? <span className="pns-term-sub">{detail}</span> : null}
        {isTribute(proposal.type) ? (
          <div className="pns-term-controls">
            <div className="pns-term-field pns-term-field--gold">
              <span className="pns-term-control-label"><WebUIText textKey="TreatyNegotiation.Gold" /></span>
              <NumberStepper
                value={amount}
                step={amountStep}
                min={0}
                max={tributeMax}
                className="pns-amount-control"
                buttonClassName="pns-step-btn"
                buttonDisabledClassName="pns-step-btn--disabled"
                formatValue={formatNumber}
                parseValue={value => boundedTributeAmount(amountFromText(value), tributeMax)}
                onChange={nextAmount => onChange({ tributeAmount: boundedTributeAmount(nextAmount, tributeMax) })}
              />
            </div>
          </div>
        ) : null}
        {isResourceTransfer(proposal.type) ? (
          <div className="pns-term-controls pns-term-controls--resource">
            {resourceOptions.length > 0 ? (
              <div className="pns-term-field pns-term-field--resource-picker">
                <ResourceDropdown
                  id={proposal.proposalId || proposalKey(proposal)}
                  value={resourceName}
                  resources={resourceOptions}
                  onSelect={resource => onChange({
                    proposalId: proposalKey({ side: proposal.side, type: proposal.type, resourceName: resource.name }),
                    resourceName: resource.name,
                    resourceAmount: defaultResourceTransferAmount(resource, resourceAmount),
                  })}
                />
              </div>
            ) : null}
            <div className="pns-term-field pns-term-field--resource-amount">
              <NumberStepper
                value={resourceAmount}
                step={amountStep}
                min={0}
                max={selectedResource ? Math.round(selectedResource.amount) : undefined}
                className="pns-amount-control"
                buttonClassName="pns-step-btn"
                buttonDisabledClassName="pns-step-btn--disabled"
                formatValue={formatNumber}
                parseValue={value => boundedResourceAmount(amountFromText(value), selectedResource)}
                onChange={nextAmount => onChange({ resourceAmount: boundedResourceAmount(nextAmount, selectedResource) })}
              />
            </div>
          </div>
        ) : null}
        {showDuration ? (
          <div className="pns-term-controls">
            <div className="pns-term-field pns-term-field--years">
              <span className="pns-term-control-label"><WebUIText textKey="TreatyNegotiation.Years" /></span>
              <div className="pns-duration-options">
                {durationOptionsDays.map((days, index) => (
                  <button
                    key={days}
                    type="button"
                    className={`pns-duration-button${durationDays === days ? ' pns-duration-button--active' : ''}`}
                    onMouseDown={() => onChange({ durationDays: days })}
                  >
                    {DURATION_YEAR_LABELS[index]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <span className={`pns-term-score tns-term-score--${valueTone}`}>{fmtSigned(live?.value)}</span>
      <button type="button" className="pns-draft-chip-close" onMouseDown={onRemove}>
        <img src="/assets/ui/I_CloseIcon.png" alt="" className="pns-draft-chip-close-icon" />
      </button>
    </div>
  );
}

function AvailableTreatyRow({ option, onAdd }: { option: TreatyOption; onAdd: () => void }) {
  const side = isMutual(option) ? 'mutual' : option.side === 'request' ? 'demand' : 'concession';
  const lines: TooltipLine[] = [
    ...(option.defaultResourceLabel ? [{ label: webUIText('TreatyNegotiation.Tooltip.Resource'), value: option.defaultResourceLabel }] : []),
  ];

  return (
    <Tooltip content={{ title: option.label, body: option.description, lines }} position="bottom" delay={200}>
      <button
        type="button"
        className={`pns-term-row pns-term-row--${side}`}
        data-tutorial-target={option.type === 'military_alliance' ? 'MilitaryAllianceOption' : undefined}
        onMouseDown={onAdd}
      >
        <img src={proposalIcon(option.type)} alt="" className="pns-term-icon" />
        <span className="pns-term-copy">
          <span className="pns-term-name">{option.label}</span>
          {option.defaultResourceLabel ? <span className="pns-term-sub">{option.defaultResourceLabel}</span> : null}
        </span>
        <span className="pns-term-action">+</span>
      </button>
    </Tooltip>
  );
}

function OptionsPanel({ title, options, onAdd }: { title: string; options: TreatyOption[]; onAdd: (option: TreatyOption) => void }) {
  return (
    <Panel title={title} className="pns-panel pns-panel--options">
      <StyledScrollArea className="pns-option-scroll" viewportClassName="pns-option-list">
        {options.length > 0 ? options.map(option => (
          <AvailableTreatyRow key={option.optionId} option={option} onAdd={() => onAdd(option)} />
        )) : (
          <div className="pns-empty-state pns-empty-state--quiet"><WebUIText textKey="TreatyNegotiation.NoOptions" /></div>
        )}
      </StyledScrollArea>
    </Panel>
  );
}

function ProposalColumn({
  title,
  selected,
  stateProposals,
  resourceOptions,
  maxGold,
  amountStep,
  durationOptionsDays,
  side,
  onRemove,
  onChange,
}: {
  title: string;
  selected: DiplomaticProposalDraft[];
  stateProposals: TreatyEntry[];
  resourceOptions: ResourceOption[];
  maxGold?: number;
  amountStep: number;
  durationOptionsDays: number[];
  side: 'offer' | 'request';
  onRemove: (proposalId: string) => void;
  onChange: (proposalId: string, patch: Partial<DiplomaticProposalDraft>) => void;
}) {
  const byId = new Map(stateProposals.map(proposal => [proposal.proposalId, proposal]));
  const byKey = new Map(stateProposals.map(proposal => [proposalKey(proposal), proposal]));

  return (
    <div className="panel pns-panel pns-panel--terms">
      <div className="panel-header pns-terms-header">
        <span className="panel-title">{title}</span>
        <div className="panel-header-rule" />
      </div>
      <div className="panel-body">
        <div className="pns-section-head">
          <span>{side === 'offer'
            ? webUIText('TreatyNegotiation.WeGive')
            : webUIText('TreatyNegotiation.WeAsk')}</span>
        </div>
        <StyledScrollArea className="pns-draft-scroll" viewportClassName="pns-draft-list">
          {selected.length > 0 ? selected.map(proposal => {
            const id = proposal.proposalId || proposalKey(proposal);
            const live = byId.get(id) ?? byKey.get(proposalKey(proposal));
            return (
              <ProposalChip
                key={id}
                proposal={proposal}
                live={live}
                resourceOptions={resourceOptions}
                maxGold={maxGold}
                amountStep={amountStep}
                durationOptionsDays={durationOptionsDays}
                onRemove={() => onRemove(id)}
                onChange={patch => onChange(id, patch)}
              />
            );
          }) : (
            <div className="pns-empty-state pns-empty-state--quiet"><WebUIText textKey="TreatyNegotiation.NoSelected" /></div>
          )}
        </StyledScrollArea>
      </div>
    </div>
  );
}

export default function DiplomaticNegotiationScreen({ screenId, targetFactionId, onClose }: DiplomaticNegotiationScreenProps) {
  const resolvedTargetFactionId = targetFactionId ?? screenId ?? null;
  return (
    <DiplomaticNegotiationScreenContent
      key={resolvedTargetFactionId ?? 'none'}
      targetFactionId={resolvedTargetFactionId}
      onClose={onClose}
    />
  );
}

function DiplomaticNegotiationScreenContent({ targetFactionId, onClose }: DiplomaticNegotiationScreenProps) {
  const { openScreen } = useGameActions();
  const [proposals, setProposals] = useState<DiplomaticProposalDraft[]>([]);
  const [submitState, setSubmitState] = useState<DiplomaticNegotiationState | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [acceptedMessage, setAcceptedMessage] = useState<string | null>(null);
  const [acceptedClosing, setAcceptedClosing] = useState(false);
  const acceptedHoldTimerRef = useRef<number | null>(null);
  const bridge = useDiplomaticNegotiationBridge(targetFactionId, proposals);
  const state = submitState ?? bridge.state;
  const statePending = bridge.statePending && !submitState;
  const draftPreview = bridge.draftPreview?.found ? bridge.draftPreview : null;
  const preview = draftPreview?.preview ?? state?.preview;
  const liveProposals = draftPreview?.proposals ?? state?.proposals ?? [];
  const selectedIds = useMemo(() => new Set(proposals.map(proposal => proposal.proposalId || proposalKey(proposal))), [proposals]);
  const availableOffers = (state?.availableOffers ?? []).filter(option => !option.isSelected && !selectedIds.has(option.optionId));
  const availableRequests = (state?.availableRequests ?? []).filter(option => !option.isSelected && !selectedIds.has(option.optionId));
  const selectedOffers = proposals.filter(proposal => proposal.side === 'offer' || isMutual(proposal));
  const selectedRequests = proposals.filter(proposal => isRequest(proposal) || isMutual(proposal));
  const ourResources = state?.ourResources ?? [];
  const theirResources = state?.theirResources ?? [];
  const ourGold = state?.ourGold ?? 0;
  const theirGold = state?.theirGold ?? 0;
  const acceptTone = acceptanceTone(preview?.acceptanceScore);
  const proposalScore = preview?.acceptanceScore ?? 0;
  const proposalScoreClamped = Math.max(-100, Math.min(100, proposalScore));
  const acceptanceScale = (Math.abs(proposalScoreClamped) / 100).toFixed(3);
  const canSubmit = Boolean(preview?.canSubmit);
  const screenTitle = state?.found ? webUIText('TreatyNegotiation.TitleWithFaction', { Faction: state.targetFaction.name }) : webUIText('TreatyNegotiation.Title');

  useEffect(() => {
    const closeFromEscape = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.code !== 'Escape') return;
      closeFromEscape(event);
    };

    window.addEventListener('keydown', keyHandler, true);
    bridgeEvents.addEventListener('ui.escape_pressed', closeFromEscape);
    return () => {
      window.removeEventListener('keydown', keyHandler, true);
      bridgeEvents.removeEventListener('ui.escape_pressed', closeFromEscape);
    };
  }, [onClose]);

  useEffect(() => () => {
    if (acceptedHoldTimerRef.current !== null) window.clearTimeout(acceptedHoldTimerRef.current);
  }, []);

  const clearAcceptedHoldTimer = () => {
    if (acceptedHoldTimerRef.current !== null) {
      window.clearTimeout(acceptedHoldTimerRef.current);
      acceptedHoldTimerRef.current = null;
    }
  };

  const beginAcceptedClose = () => {
    clearAcceptedHoldTimer();
    acceptedHoldTimerRef.current = window.setTimeout(() => {
      acceptedHoldTimerRef.current = null;
      setAcceptedClosing(true);
    }, ACCEPTED_HOLD_MS);
  };

  const handleAcceptedCloseAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (!acceptedClosing || event.target !== event.currentTarget || event.animationName !== 'treaty-negotiation-close') return;
    openScreen('diplomacy', 'treaties');
  };

  const acceptabilityBreakdown: TooltipContent = useMemo(() => ({
    title: webUIText('TreatyNegotiation.Acceptance'),
    body: renderAcceptabilityBreakdown(preview?.breakdown || webUIText('TreatyNegotiation.AcceptanceEmpty')),
  }), [preview]);

  const opinionBreakdown: TooltipContent = useMemo(() => ({
    title: webUIText('FactionOverview.OpinionOfYou'),
    lines: [
      {
        label: webUIText('FactionOverview.ModifierTotal'),
        value: fmtSigned(state?.opinion),
        valueColor: (state?.opinion ?? 0) > 0 ? 'var(--green)' : (state?.opinion ?? 0) < 0 ? 'var(--red)' : 'var(--gold)',
        isHeader: true,
      },
      ...(state?.opinionBreakdown ?? []).map(modifier => ({
        label: modifier.label,
        value: fmtSigned(modifier.value),
        valueColor: modifier.value > 0 ? 'var(--green)' : modifier.value < 0 ? 'var(--red)' : 'var(--gold)',
      })),
    ],
  }), [state?.opinion, state?.opinionBreakdown]);

  const addProposal = (option: TreatyOption) => {
    if (option.isSelected || selectedIds.has(option.optionId)) return;
    setOutcome(null);
    setAcceptedMessage(null);
    setAcceptedClosing(false);
    clearAcceptedHoldTimer();
    setProposals(current => [...current, draftFromOption(option)]);
  };

  const removeProposal = (proposalId: string) => {
    setOutcome(null);
    setAcceptedMessage(null);
    setAcceptedClosing(false);
    clearAcceptedHoldTimer();
    setProposals(current => current.filter(proposal => (proposal.proposalId || proposalKey(proposal)) !== proposalId));
  };

  const updateProposal = (proposalId: string, patch: Partial<DiplomaticProposalDraft>) => {
    setOutcome(null);
    setAcceptedMessage(null);
    setAcceptedClosing(false);
    clearAcceptedHoldTimer();
    setProposals(current => current.map(proposal => (
      (proposal.proposalId || proposalKey(proposal)) === proposalId ? { ...proposal, ...patch } : proposal
    )));
  };

  const handleReset = () => {
    setOutcome(null);
    setAcceptedMessage(null);
    setAcceptedClosing(false);
    clearAcceptedHoldTimer();
    setSubmitState(null);
    setProposals([]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const result = await bridge.submit(proposals);
    if (!result) return;

    setOutcome(result.message || null);
    if (result.state?.found) setSubmitState(result.state);

    if (result.result === 'accepted') {
      setAcceptedMessage(result.message || webUIText('TreatyNegotiation.Accepted'));
      setAcceptedClosing(false);
      beginAcceptedClose();
      return;
    }

    if (result.result === 'counter_offer' && result.state?.proposals) {
      setProposals(result.state.proposals.map(draftFromEntry));
      return;
    }
  };

  const headerExtra = state?.found ? (
    <div className="tns-header">
      <button type="button" className="pns-back-link" onMouseDown={() => openScreen('diplomacy', 'foreign')}>
        <img src="/assets/icons/I_NavPrevious.png" alt="" className="tns-back-icon" />
        <span><WebUIText textKey="TreatyNegotiation.BackToDiplomacy" /></span>
      </button>
      <div className="tns-faction-pair">
        <FactionTooltip factionId={state.playerFaction.id} factionName={state.playerFaction.name} position="bottom" delay={200}>
          <FactionRoundel factionId={state.playerFaction.id} colour={state.playerFaction.colour} secondaryColour={state.playerFaction.secondaryColour} cultureGroup={state.playerFaction.cultureGroup} emblem={state.playerFaction.emblem} name={state.playerFaction.name} size="sm" showRing />
        </FactionTooltip>
        <span className="tns-faction-name">{state.playerFaction.name}</span>
        <img src="/assets/icons/I_Diplomacy.png" alt="" className="tns-header-icon" />
        <span className="tns-faction-name tns-faction-name--right">{state.targetFaction.name}</span>
        <FactionTooltip factionId={state.targetFaction.id} factionName={state.targetFaction.name} position="bottom" delay={200}>
          <FactionRoundel factionId={state.targetFaction.id} colour={state.targetFaction.colour} secondaryColour={state.targetFaction.secondaryColour} cultureGroup={state.targetFaction.cultureGroup} emblem={state.targetFaction.emblem} name={state.targetFaction.name} size="sm" showRing />
        </FactionTooltip>
      </div>
      <Tooltip content={opinionBreakdown} position="bottom" delay={150} variant="sidebar" inline wrapperClassName="tns-opinion-tooltip">
        <span className="tns-opinion">{fmtSigned(state.opinion)}</span>
      </Tooltip>
    </div>
  ) : undefined;

  const body = acceptedMessage ? (
    <div className="pns-accepted-state">
      <div className="pns-accepted-card">
        <span className="pns-accepted-title"><WebUIText textKey="TreatyNegotiation.Accepted" /></span>
        <span className="pns-accepted-message">{acceptedMessage}</span>
      </div>
    </div>
  ) : !targetFactionId ? (
    <Panel title={webUIText('TreatyNegotiation.Title')} className="pns-panel pns-panel--empty">
      <div className="pns-empty-state"><WebUIText textKey="TreatyNegotiation.NoFaction" /></div>
    </Panel>
  ) : state && !state.found ? (
    <Panel title={webUIText('TreatyNegotiation.Title')} className="pns-panel pns-panel--empty">
      <div className="pns-empty-state">{state.emptyReason || webUIText('TreatyNegotiation.Unavailable')}</div>
    </Panel>
  ) : state ? (
    <div className="pns-board tns-board">
      <OptionsPanel title={webUIText('TreatyNegotiation.WeCanOffer')} options={availableOffers} onAdd={addProposal} />
      <div className="pns-middle">
        <div className="pns-selected-columns">
          <ProposalColumn
            title={webUIText('TreatyNegotiation.Offers')}
            selected={selectedOffers}
            stateProposals={liveProposals}
            resourceOptions={ourResources}
            maxGold={ourGold}
            amountStep={state.amountStep}
            durationOptionsDays={state.durationOptionsDays}
            side="offer"
            onRemove={removeProposal}
            onChange={updateProposal}
          />
          <ProposalColumn
            title={webUIText('TreatyNegotiation.Requests')}
            selected={selectedRequests}
            stateProposals={liveProposals}
            resourceOptions={theirResources}
            maxGold={theirGold}
            amountStep={state.amountStep}
            durationOptionsDays={state.durationOptionsDays}
            side="request"
            onRemove={removeProposal}
            onChange={updateProposal}
          />
        </div>
        <div className="pns-decision-block pns-decision-block--middle">
          <div className="pns-acceptance-meter">
            <div className="pns-acceptance-header">
              <Tooltip content={acceptabilityBreakdown} position="left" delay={200} variant="sidebar" bubbleClassName="pns-acceptability-tooltip">
                <span className={`pns-acceptance-label pns-acceptance-label--${acceptTone}`}>
                  {preview?.verdictLabel || webUIText('TreatyNegotiation.Acceptance')}
                </span>
              </Tooltip>
              <button type="button" className="pns-reset-inline" onMouseDown={handleReset}>
                <img src="/assets/icons/DeselectAll.png" alt="" />
                <span><WebUIText textKey="Common.Clear" /></span>
              </button>
            </div>
            <Tooltip content={acceptabilityBreakdown} position="left" delay={200} variant="sidebar" bubbleClassName="pns-acceptability-tooltip">
              <div className="pns-pivot-track painted-bar-track">
                {proposalScoreClamped < 0 ? (
                  <div className="painted-bar-fill painted-bar-fill--red" style={{ width: '50%', right: '50%', left: 'auto', borderRadius: 0, transformOrigin: 'right', transform: `scaleX(${acceptanceScale})` }} />
                ) : null}
                {proposalScoreClamped > 0 ? (
                  <div className="painted-bar-fill painted-bar-fill--green" style={{ width: '50%', left: '50%', borderRadius: 0, transformOrigin: 'left', transform: `scaleX(${acceptanceScale})` }} />
                ) : null}
                <div className="pns-pivot-center" />
              </div>
            </Tooltip>
          </div>
          {preview?.blockedReason ? <div className="pns-empty-state pns-empty-state--quiet">{preview.blockedReason}</div> : null}
          {outcome ? <div className="pns-outcome">{outcome}</div> : null}
          <button type="button" data-tutorial-target="SubmitTreatyProposalButton" className={`btn--burgundy btn--full pns-propose-button${canSubmit ? '' : ' pns-propose-button--disabled'}`} disabled={!canSubmit} onMouseDown={handleSubmit}>
            <WebUIText textKey="TreatyNegotiation.Propose" />
          </button>
        </div>
      </div>
      <OptionsPanel title={webUIText('TreatyNegotiation.WeCanRequest')} options={availableRequests} onAdd={addProposal} />
    </div>
  ) : statePending ? null : (
    <Panel title={webUIText('TreatyNegotiation.Title')} className="pns-panel pns-panel--empty">
      <div className="pns-empty-state"><WebUIText textKey="TreatyNegotiation.NoFaction" /></div>
    </Panel>
  );

  return (
    <div className={`pns-stage pns-stage--treaty${acceptedClosing ? ' tns-stage--closing' : ''}`} onAnimationEnd={handleAcceptedCloseAnimationEnd}>
      <ScreenShell
        title={screenTitle}
        onClose={onClose}
        advisorTopic="diplomacySidebar"
        titleExtra={undefined}
        className="screen--negotiation screen--treaty-negotiation"
        contentClassName="screen-content--negotiation"
      >
        <div className="pns-wrap">
          {headerExtra}
          {body}
        </div>
      </ScreenShell>
    </div>
  );
}

registerScreen({
  id: 'treaty',
  render: ({ screenId, onClose }) => (
    <DiplomaticNegotiationScreen key={screenId ?? 'treaty'} screenId={screenId} onClose={onClose} />
  ),
  topbarId: 'diplomacy',
  openedByTopbar: false,
  advisorTopic: 'diplomacySidebar',
  overlayVariant: 'diplomacy',
  bridgeNames: ['treaty', 'diplomaticnegotiation'],
  factionMode: 'independent',
});
