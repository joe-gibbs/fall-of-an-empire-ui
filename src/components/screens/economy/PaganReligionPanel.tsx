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

function godTooltip(
  god: PaganGodView,
  gods: PaganGodView[],
  relics: PaganRelicView[],
  capitalId: string,
  capitalName: string,
  playerId: string | undefined,
  canManage: boolean,
): TooltipContent {
  const relic = familyRelic(god, gods, relics);
  const held = Boolean(relic && ((playerId && relic.ownerId === playerId) || god.canDedicate || god.dedicated));
  const need = worshipNeed(god, gods, relics, capitalId, capitalName);
  const effects: TooltipLine[] = [
    ...effectLines(god.bonus, 'var(--green)'),
    ...effectLines(god.penalty, 'var(--red)'),
  ];
  const requirements: TooltipLine[] = [];
  if (relic) {
    requirements.push(
      { label: relic.name, value: held ? t('Pagan.RelicHeld') : t('Pagan.RelicNotHeld'), valueColor: held ? 'var(--green)' : 'var(--text-muted)' },
      { label: t('Pagan.HeldAt'), value: relic.settlementName },
    );
  }
  if (need?.kind === 'place') requirements.push({ label: t('Pagan.NeedPlace', { Place: need.name }) });
  if (need?.kind === 'parent') requirements.push({ label: t('Pagan.NeedParentGod', { God: need.name }) });
  if (!god.canDedicate && !god.dedicated && !need && god.dedicationReason) {
    requirements.push({ label: god.dedicationReason, stacked: true });
  }
  const lines: TooltipLine[] = [];
  appendTooltipSection(lines, t('InteractionCard.Effects'), effects);
  appendTooltipSection(lines, t('Common.Requirements'), requirements);
  let footer: string | undefined;
  if (canManage && god.canDedicate && !god.dedicated) footer = t('Pagan.ClickToFavour');
  if (canManage && god.dedicated) footer = t('Pagan.ClickToStop');
  return { title: god.name, body: god.description, lines, footer };
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
  const { openRightSidebar } = useGameActions();
  return (
    <div className="pagan-relics">
      {relics.map(relic => (
        <Tooltip key={relic.key} content={relicIdentityHeader(relic)}>
          <div className="pagan-relic pagan-surface">
            <img src={WebkilnAssetPath(relic.iconPath)} alt="" />
            <div className="pagan-relic-copy">
              <strong>{relic.name}</strong>
              {showReligion && relic.religionName && <span>{relic.religionName}</span>}
              <button className="pagan-text-link" onClick={() => openRightSidebar('settlement', relic.settlementId)}>{relic.settlementName}</button>
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

function GodCard({
  god,
  lesser,
  relic,
  held,
  clickable,
  tooltip,
  onClick,
}: {
  god: PaganGodView;
  lesser: boolean;
  relic: PaganRelicView | undefined;
  held: boolean;
  clickable: boolean;
  tooltip: TooltipContent;
  onClick: () => void;
}) {
  const className = [
    'pagan-card',
    lesser ? 'pagan-card--lesser' : '',
    god.dedicated ? 'pagan-card--favoured' : '',
    clickable ? '' : 'pagan-card--locked',
  ].filter(Boolean).join(' ');
  const body = (
    <>
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
    </>
  );
  return (
    <Tooltip position="top" delay={250} bubbleClassName="pagan-card-tooltip" content={tooltip}>
      {clickable ? (
        <button type="button" className={className} onClick={onClick}>{body}</button>
      ) : (
        <div className={className}>{body}</div>
      )}
    </Tooltip>
  );
}

function NoneCard({ selected, clickable, onClick }: { selected: boolean; clickable: boolean; onClick: () => void }) {
  const className = [
    'pagan-card',
    'pagan-card--none',
    selected ? 'pagan-card--favoured' : '',
    !clickable && !selected ? 'pagan-card--locked' : '',
  ].filter(Boolean).join(' ');
  const body = (
    <>
      <img className="pagan-card-none-mark" src={WebkilnAssetPath('/assets/icons/I_UnknownGod.png')} alt="" draggable={false} />
      <div className="pagan-card-vignette" />
      <div className="pagan-card-content">
        <div className="pagan-card-title">{t('Pagan.WholePantheon')}</div>
      </div>
    </>
  );
  return (
    <Tooltip
      position="top"
      delay={250}
      bubbleClassName="pagan-card-tooltip"
      content={{
        title: t('Pagan.WholePantheon'),
        body: t('Pagan.StanceHelp'),
        footer: selected ? undefined : t('Pagan.ClickToStop'),
      }}
    >
      {clickable ? (
        <button type="button" className={className} onClick={onClick}>{body}</button>
      ) : (
        <div className={className}>{body}</div>
      )}
    </Tooltip>
  );
}

export default function PaganReligionPanel({ data }: { data: GetPaganWorshipResponse }) {
  const player = usePlayerFactionSummary();
  const { gameDay } = useGameState();
  const { addNotification } = useGameActions();
  const [pantheonConfirm, setPantheonConfirm] = useState(false);
  const currentDay = gameDay;
  const activeGod = data.gods.find(god => god.key === data.activeGodKey);
  const remaining = Math.max(0, data.riteEndDay - currentDay);
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
  const renderCard = (god: PaganGodView, lesser: boolean) => {
    const relic = familyRelic(god, data.gods, data.relics);
    const held = Boolean(relic && ((player?.id && relic.ownerId === player.id) || god.canDedicate || god.dedicated
      || (god.parentKey && data.gods.some(entry => entry.key === god.parentKey && (entry.canDedicate || entry.dedicated)))));
    const clickable = data.canManage && (god.canDedicate || god.dedicated);
    return (
      <GodCard
        key={god.key}
        god={god}
        lesser={lesser}
        relic={relic}
        held={held}
        clickable={clickable}
        tooltip={godTooltip(god, data.gods, data.relics, data.capitalId, data.capitalName, player?.id, data.canManage)}
        onClick={() => run(actionRequest('dedicate', god.key, !god.dedicated))}
      />
    );
  };

  return (
    <StyledScrollArea className="pagan-scroll">
      <div className="pagan-panel">
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
        <div className="pagan-god-tree">
          <div className="pagan-god-branch">
            <NoneCard
              selected={!data.dedicated}
              clickable={data.canManage && data.dedicated}
              onClick={() => setPantheonConfirm(true)}
            />
          </div>
          {data.gods.filter(god => god.isMajor).map(god => (
            <div className="pagan-god-branch" key={god.key}>
              {renderCard(god, false)}
              <div className="pagan-lesser-gods">
                {data.gods.filter(lesser => lesser.parentKey === god.key).map(lesser => renderCard(lesser, true))}
              </div>
            </div>
          ))}
        </div>
        {data.relics.length > 0 && (
          <section className="pagan-relic-row">
            <PaganRelicList relics={data.relics} />
          </section>
        )}
        <ConfirmDialog
          visible={pantheonConfirm}
          title={t('Pagan.HonourPantheon')}
          message={t('Pagan.PantheonConfirmation')}
          onConfirm={() => run(actionRequest('pantheon'))}
          onClosed={() => setPantheonConfirm(false)}
        />
      </div>
    </StyledScrollArea>
  );
}
