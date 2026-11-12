import { useState } from 'react';
import type { GetPaganWorshipResponse, PaganEffectView, PaganGodView, PaganRelicView, PaganWorshipActionRequest } from '../../../bridge-types.generated';
import { useHeldPaganRelics, performPaganWorship } from '../../../bridge/religion/usePaganWorshipBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { usePlayerFactionSummary } from '../../../data-source/index';
import { WebkilnAssetPath } from '../../../utils/assets';
import { formatNumber, formatSignedNumber, formatPercent } from '../../../utils/numberFormat';
import { webUIText as t } from '../../../localization/WebUITextContext';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import { appendTooltipSection } from '../../common/tooltips/tooltipSections';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import GameButton from '../../common/buttons/GameButton';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import { relicTooltipContent } from './paganRelicTooltip';
import '../../common/tooltips/IdentityTooltip.css';
import './PaganReligionPanel.css';

function effectAmount(effect: PaganEffectView) {
  return effect.isPercent
    ? `${effect.amount > 0 ? '+' : ''}${formatPercent(effect.amount * 100, 2)}`
    : formatSignedNumber(effect.amount, { maximumFractionDigits: 2 });
}

function effectLines(effects: PaganEffectView[], valueColor: string): TooltipLine[] {
  return effects.map(effect => ({ label: effect.label, value: effectAmount(effect), valueColor }));
}

function riteTooltip(god: PaganGodView): TooltipContent {
  const rite = god.rite;
  const lines: TooltipLine[] = [
    ...(rite.goldCost ? [{ label: t('Pagan.GoldCost'), value: formatNumber(rite.goldCost) }] : []),
    ...(rite.populationCost ? [{ label: t('Pagan.PopulationCost'), value: formatNumber(rite.populationCost) }] : []),
    ...(rite.raidCaptives ? [{ label: t('Pagan.RaidCaptives'), value: formatNumber(rite.raidCaptives) }] : []),
    ...(rite.oathDays > 0 ? [{ label: t('Pagan.OathDuration'), value: t('Pagan.Days', { Days: formatNumber(rite.oathDays) }) }] : []),
    { label: t('Pagan.Duration'), value: t('Pagan.Days', { Days: formatNumber(rite.durationDays) }) },
    { label: t('Pagan.Cooldown'), value: t('Pagan.Days', { Days: formatNumber(rite.cooldownDays) }) },
  ];
  const requirements: TooltipLine[] = [];
  if (rite.requirements) requirements.push({ label: rite.requirements, stacked: true });
  if (rite.needsCharacter) {
    requirements.push({
      label: t('Pagan.Character'),
      value: t(rite.sacrificesCharacter ? 'Pagan.CharacterKilled' : 'Pagan.CharacterOath'),
    });
  }
  const effects: TooltipLine[] = [
    ...effectLines(rite.effects, 'var(--gold)'),
    ...(rite.effects.length ? [{ label: t('Pagan.EffectDuration'), value: t('Pagan.Days', { Days: formatNumber(rite.effectDurationDays) }) }] : []),
  ];
  if (rite.result) effects.push({ label: rite.result, stacked: true });
  appendTooltipSection(lines, t('Common.Requirements'), requirements);
  appendTooltipSection(lines, t('InteractionCard.Effects'), effects);
  return { title: rite.name, body: rite.description, lines };
}

const actionRequest = (action: string, godKey = '', dedicated = false): PaganWorshipActionRequest => ({
  action, godKey, dedicated, settlementId: '', characterId: '', militaryId: '',
});

function relicForGod(relics: PaganRelicView[], god: PaganGodView) {
  return relics.find(relic => relic.godName === god.name);
}

function familyRelic(god: PaganGodView, gods: PaganGodView[], relics: PaganRelicView[]) {
  const parent = god.parentKey ? gods.find(entry => entry.key === god.parentKey) : undefined;
  return relicForGod(relics, parent ?? god) ?? relicForGod(relics, god);
}

function worshipNeed(god: PaganGodView, gods: PaganGodView[], relics: PaganRelicView[], capitalId: string, capitalName: string) {
  if (god.canDedicate || god.dedicated) return null;
  const parent = god.parentKey ? gods.find(entry => entry.key === god.parentKey) : undefined;
  const relic = familyRelic(god, gods, relics);
  const relicGod = parent ?? god;
  const ownsRelic = Boolean(relicGod && (relicGod.canDedicate || relicGod.dedicated));
  if (!ownsRelic && relic?.settlementName) return { kind: 'place' as const, id: relic.settlementId, name: relic.settlementName };
  if (parent && !parent.dedicated) return { kind: 'parent' as const, name: parent.name };
  if (!god.isMajor && capitalName) return { kind: 'place' as const, id: capitalId, name: capitalName };
  return null;
}

function relicIdentityHeader(relic: PaganRelicView) {
  const content = relicTooltipContent(relic, t);
  return {
    header: (
      <div className="tt-identity-header">
        {content.iconPath && <img src={WebkilnAssetPath(content.iconPath)} alt="" className="tt-identity-icon" />}
        <div className="tt-identity-title">{content.title}</div>
      </div>
    ),
    body: content.body,
    lines: content.lines,
  };
}

export function PaganRelicList({ relics, showOwner = true, showReligion = false }: { relics: PaganRelicView[]; showOwner?: boolean; showReligion?: boolean }) {
  const { openSidebar } = useGameActions();
  return (
    <div className="pagan-relics">
      {relics.map(relic => (
        <Tooltip key={relic.key} content={relicIdentityHeader(relic)}>
          <div className="pagan-relic pagan-surface">
            <img src={WebkilnAssetPath(relic.iconPath)} alt="" />
            <div className="pagan-relic-copy">
              <strong>{relic.name}</strong>
              {showReligion && relic.religionName && <span>{relic.religionName}</span>}
              <button className="pagan-text-link" onClick={() => openSidebar('settlement', relic.settlementId)}>{relic.settlementName}</button>
              {showOwner && <span>{relic.ownerName || t('Common.None')}</span>}
            </div>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}

export function HeldPaganRelics({ factionId }: { factionId: string }) {
  const data = useHeldPaganRelics(factionId);
  if (!data?.relics.length) return null;
  return (
    <section className="pagan-held-relics">
      <h3>{t('Pagan.HeldRelics')}</h3>
      <PaganRelicList relics={data.relics} showOwner={false} showReligion />
    </section>
  );
}

type PaganSelection = string | null;

function DetailLines({ lines }: { lines: TooltipLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="pagan-detail-lines">
      {lines.map((line, index) => (
        <div key={index} className={`pagan-detail-line${line.stacked ? ' pagan-detail-line--stacked' : ''}`}>
          <span>{line.label}</span>
          {line.value !== undefined && <strong style={line.valueColor ? { color: line.valueColor } : undefined}>{line.value}</strong>}
        </div>
      ))}
    </div>
  );
}

function riteLines(god: PaganGodView) {
  const rite = god.rite;
  const facts: TooltipLine[] = [
    ...(rite.goldCost ? [{ label: t('Pagan.GoldCost'), value: formatNumber(rite.goldCost) }] : []),
    ...(rite.populationCost ? [{ label: t('Pagan.PopulationCost'), value: formatNumber(rite.populationCost) }] : []),
    ...(rite.raidCaptives ? [{ label: t('Pagan.RaidCaptives'), value: formatNumber(rite.raidCaptives) }] : []),
    ...(rite.oathDays > 0 ? [{ label: t('Pagan.OathDuration'), value: t('Pagan.Days', { Days: formatNumber(rite.oathDays) }) }] : []),
    { label: t('Pagan.Duration'), value: t('Pagan.Days', { Days: formatNumber(rite.durationDays) }) },
    { label: t('Pagan.Cooldown'), value: t('Pagan.Days', { Days: formatNumber(rite.cooldownDays) }) },
  ];
  if (rite.needsCharacter) {
    facts.push({ label: t(rite.sacrificesCharacter ? 'Pagan.CharacterKilled' : 'Pagan.CharacterOath'), stacked: true });
  }
  const effects: TooltipLine[] = [
    ...effectLines(rite.effects, 'var(--gold)'),
    ...(rite.effects.length ? [{ label: t('Pagan.EffectDuration'), value: t('Pagan.Days', { Days: formatNumber(rite.effectDurationDays) }) }] : []),
  ];
  if (rite.result) effects.push({ label: rite.result, stacked: true });
  return { facts, effects };
}

function GodDetail({
  god,
  gods,
  relics,
  capitalId,
  capitalName,
  canManage,
  relicHeld,
  onFavour,
}: {
  god: PaganGodView;
  gods: PaganGodView[];
  relics: PaganRelicView[];
  capitalId: string;
  capitalName: string;
  canManage: boolean;
  relicHeld: boolean;
  onFavour: (dedicated: boolean) => void;
}) {
  const { openSidebar } = useGameActions();
  const relic = familyRelic(god, gods, relics);
  const need = worshipNeed(god, gods, relics, capitalId, capitalName);
  const effects: TooltipLine[] = [
    ...effectLines(god.bonus, 'var(--green)'),
    ...effectLines(god.penalty, 'var(--red)'),
  ];
  const requirements: TooltipLine[] = [];
  if (need?.kind === 'parent') requirements.push({ label: t('Pagan.NeedParentGod', { God: need.name }) });
  if (need?.kind === 'place' && need.id !== relic?.settlementId) requirements.push({ label: t('Pagan.NeedPlace', { Place: need.name }) });
  if (!god.canDedicate && !god.dedicated && !need && god.dedicationReason) {
    requirements.push({ label: god.dedicationReason, stacked: true });
  }
  const rite = riteLines(god);
  return (
    <div className="pagan-detail" data-tutorial-target="PaganGodDetail">
      <header className="pagan-detail-header">
        <h2>{god.name}</h2>
        {god.dedicated && <span className="pagan-detail-favoured">{t('Pagan.Favoured')}</span>}
      </header>
      {god.description && <p className="pagan-detail-body">{god.description}</p>}
      {canManage && (god.canDedicate || god.dedicated) && (
        <GameButton
          variant={god.dedicated ? 'outline' : 'burgundy'}
          fullWidth
          tutorialTarget="PaganFavourButton"
          onClick={() => onFavour(!god.dedicated)}
        >
          {god.dedicated ? t('Pagan.StopFavouringGod', { God: god.name }) : t('Pagan.FavourGod', { God: god.name })}
        </GameButton>
      )}
      {effects.length > 0 && (
        <section className="pagan-detail-section">
          <SectionHeading title={t('InteractionCard.Effects')} />
          <DetailLines lines={effects} />
        </section>
      )}
      {(relic || requirements.length > 0) && (
        <section className="pagan-detail-section">
          <SectionHeading title={t('Common.Requirements')} />
          {relic && (
            <Tooltip content={relicIdentityHeader(relic)}>
              <div className="pagan-detail-relic">
                <img src={WebkilnAssetPath(relic.iconPath)} alt="" />
                <div className="pagan-relic-copy">
                  <strong>{relic.name}</strong>
                  <button type="button" className="pagan-text-link" onClick={() => openSidebar('settlement', relic.settlementId)}>{relic.settlementName}</button>
                </div>
                <span className={relicHeld ? 'pagan-relic-held' : 'pagan-relic-missing'}>
                  {relicHeld ? t('Pagan.RelicHeld') : t('Pagan.RelicNotHeld')}
                </span>
              </div>
            </Tooltip>
          )}
          <DetailLines lines={requirements} />
        </section>
      )}
      <section className="pagan-detail-section">
        <SectionHeading title={god.rite.name} />
        {god.rite.description && <p className="pagan-detail-body">{god.rite.description}</p>}
        {god.rite.requirements && <p className="pagan-detail-body pagan-detail-body--muted">{god.rite.requirements}</p>}
        <DetailLines lines={rite.facts} />
        <DetailLines lines={rite.effects} />
      </section>
    </div>
  );
}

function PantheonDetail({ selected, canManage, onHonour }: { selected: boolean; canManage: boolean; onHonour: () => void }) {
  return (
    <div className="pagan-detail">
      <header className="pagan-detail-header">
        <h2>{t('Pagan.WholePantheon')}</h2>
      </header>
      <p className="pagan-detail-body">{t('Pagan.StanceHelp')}</p>
      {canManage && !selected && (
        <GameButton variant="outline" fullWidth tutorialTarget="PaganFavourButton" onClick={onHonour}>
          {t('Pagan.HonourPantheon')}
        </GameButton>
      )}
    </div>
  );
}

function GodCard({
  god,
  lesser,
  relic,
  held,
  selected,
  locked,
  onSelect,
}: {
  god: PaganGodView;
  lesser: boolean;
  relic: PaganRelicView | undefined;
  held: boolean;
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  const className = [
    'pagan-card',
    lesser ? 'pagan-card--lesser' : '',
    god.dedicated ? 'pagan-card--favoured' : '',
    selected ? 'pagan-card--selected' : '',
    locked ? 'pagan-card--locked' : '',
  ].filter(Boolean).join(' ');
  return (
    <button type="button" className={className} onClick={onSelect} aria-pressed={selected} data-tutorial-target={`PaganGod:${god.key}`}>
      <img className="pagan-card-fg" src={WebkilnAssetPath(god.foregroundPath)} alt="" draggable={false} />
      <div className="pagan-card-vignette" />
      {relic && (
        <span className={`pagan-card-relic${held ? ' pagan-card-relic--held' : ''}`}>
          <img src={WebkilnAssetPath(relic.iconPath)} alt="" draggable={false} />
        </span>
      )}
      <div className="pagan-card-content">
        <div className="pagan-card-title">{god.name}</div>
      </div>
    </button>
  );
}

export default function PaganReligionPanel({ data }: { data: GetPaganWorshipResponse }) {
  const player = usePlayerFactionSummary();
  const { gameDay } = useGameState();
  const { addNotification } = useGameActions();
  const [pantheonConfirm, setPantheonConfirm] = useState(false);
  const [selection, setSelection] = useState<PaganSelection>(() => (data.gods.find(god => god.dedicated) ?? data.gods.find(god => god.isMajor))?.key ?? null);
  const selectedGod = selection ? data.gods.find(god => god.key === selection) : undefined;
  const activeGod = data.gods.find(god => god.key === data.activeGodKey);
  const remaining = Math.max(0, data.riteEndDay - gameDay);
  const run = (request: PaganWorshipActionRequest) => {
    void performPaganWorship(request).catch(reason => {
      addNotification({
        title: t('QuickInteraction.ActionCouldNotStart'),
        description: reason instanceof Error ? reason.message : String(reason),
        type: 'general',
      });
      acknowledgeBridgeFailure(reason);
    });
  };
  const relicHeld = (god: PaganGodView) => {
    const relic = familyRelic(god, data.gods, data.relics);
    return Boolean(relic && ((player?.id && relic.ownerId === player.id) || god.canDedicate || god.dedicated
      || (god.parentKey && data.gods.some(entry => entry.key === god.parentKey && (entry.canDedicate || entry.dedicated)))));
  };
  const renderCard = (god: PaganGodView, lesser: boolean) => (
    <GodCard
      key={god.key}
      god={god}
      lesser={lesser}
      relic={lesser ? undefined : familyRelic(god, data.gods, data.relics)}
      held={relicHeld(god)}
      selected={selection === god.key}
      locked={!god.canDedicate && !god.dedicated}
      onSelect={() => setSelection(god.key)}
    />
  );

  return (
    <div className="pagan-panel">
      <div className="pagan-pantheon">
        <button
          type="button"
          className={`pagan-whole${selection === null ? ' pagan-whole--selected' : ''}${data.dedicated ? '' : ' pagan-whole--favoured'}`}
          onClick={() => setSelection(null)}
          aria-pressed={selection === null}
          data-tutorial-target="PaganPantheon"
        >
          <img src={WebkilnAssetPath('/assets/icons/I_Pantheon.png')} alt="" draggable={false} />
          <span>{t('Pagan.WholePantheon')}</span>
        </button>
        <div className="pagan-god-tree">
          {data.gods.filter(god => god.isMajor).map(god => (
            <div className="pagan-god-branch" key={god.key}>
              {renderCard(god, false)}
              <div className="pagan-lesser-gods">
                {data.gods.filter(lesser => lesser.parentKey === god.key).map(lesser => renderCard(lesser, true))}
              </div>
            </div>
          ))}
        </div>
        {data.relics.length > 0 && <PaganRelicList relics={data.relics} showOwner={false} />}
      </div>
      <div className="pagan-side">
        {activeGod && (
          <Tooltip content={{
            ...riteTooltip(activeGod),
            footer: t('Pagan.ActivePayment', { Gold: formatNumber(data.paidGold), Population: formatNumber(data.paidPopulation), Target: data.activeRiteTarget }),
          }}>
            <div className="pagan-now pagan-surface">
              <div className="pagan-now-copy">
                <strong>{activeGod.rite.name}</strong>
                <span>{t('Pagan.DaysRemaining', { Days: formatNumber(remaining) })}</span>
              </div>
              <PaintedBar percent={100 * (1 - remaining / Math.max(1, data.riteEndDay - data.riteStartDay))} color="gold" />
            </div>
          </Tooltip>
        )}
        <div className="pagan-detail-frame pagan-surface">
          <StyledScrollArea className="pagan-detail-scroll">
            {selectedGod ? (
              <GodDetail
                god={selectedGod}
                gods={data.gods}
                relics={data.relics}
                capitalId={data.capitalId}
                capitalName={data.capitalName}
                canManage={data.canManage}
                relicHeld={relicHeld(selectedGod)}
                onFavour={dedicated => run(actionRequest('dedicate', selectedGod.key, dedicated))}
              />
            ) : (
              <PantheonDetail selected={!data.dedicated} canManage={data.canManage} onHonour={() => setPantheonConfirm(true)} />
            )}
          </StyledScrollArea>
        </div>
      </div>
      <ConfirmDialog
        visible={pantheonConfirm}
        title={t('Pagan.HonourPantheon')}
        message={t('Pagan.PantheonConfirmation')}
        onConfirm={() => run(actionRequest('pantheon'))}
        onClosed={() => setPantheonConfirm(false)}
      />
    </div>
  );
}
