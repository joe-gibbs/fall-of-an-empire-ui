import React, { useCallback, useEffect, useState } from 'react';
import Tooltip, { type TooltipLine, type TooltipContent } from './Tooltip';
import CultureTooltip from './CultureTooltip';
import ReligionTooltip from './ReligionTooltip';
import { cultureIconPath } from '../../../utils/cultureIcons';
import { TraitIcon } from '../entities/TraitIcon';
import type { Character, CharacterStatModifier, StatKey } from '../../../data/types';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { usePersonTooltipBridge } from '../../../bridge/characters/usePersonBridge';
import glossary from '../../../data/glossary';
import { getStatColor, getComplianceState } from '../../../utils/colorFormatters';
import { STAT_ICONS } from '../../../utils/iconMaps';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { characterStatEffectLines } from '../../../utils/characterStatEffects';
import './PersonTooltip.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface PersonTooltipProps {
  /** Either a PersonID to resolve via the active data source, or a full
   *  Character object that already has everything the tooltip needs. */
  characterId?: string | null;
  character?: Character;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const STAT_DEFS = [
  { key: 'tactics' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.28.1'); }, icon: '/assets/icons/StatIcons/I_Tactics.png', glossaryKey: 'Tactics' },
  { key: 'authority' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.29.2'); }, icon: '/assets/icons/StatIcons/I_Authority.png', glossaryKey: 'Authority' },
  { key: 'cunning' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.30.3'); }, icon: '/assets/icons/StatIcons/I_Cunning.png', glossaryKey: 'Cunning' },
  { key: 'governance' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.31.4'); }, icon: '/assets/icons/StatIcons/I_Governance.png', glossaryKey: 'Governance' },
  { key: 'loyalty' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.32.5'); }, icon: '/assets/icons/StatIcons/I_Loyalty.png', glossaryKey: 'Loyalty' },
  { key: 'constitution' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.33.6'); }, icon: '/assets/icons/StatIcons/I_Constitution.png', glossaryKey: 'Constitution' },
];

const COMPLIANCE_SEGMENTS: {
  label: string;
  fill: 'red' | 'orange' | 'gold' | 'blue' | 'green';
  min: number;
  max: number;
}[] = [
  { get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.42.7'); }, fill: 'red', min: -100, max: -30 },
  { get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.43.8'); }, fill: 'orange', min: -30, max: -10 },
  { get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.44.9'); }, fill: 'gold', min: -10, max: 10 },
  { get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.45.10'); }, fill: 'blue', min: 10, max: 30 },
  { get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.46.11'); }, fill: 'green', min: 30, max: 100 },
];

const IMPRISONMENT_REASON_KEYS: Record<string, string> = {
  EnemyCombatant: 'Character.Imprisonment.EnemyCombatant',
  SiegeCapture: 'Character.Imprisonment.SiegeCapture',
  Rebel: 'Character.Imprisonment.Rebel',
  Traitor: 'Character.Imprisonment.Traitor',
  Hostage: 'Character.Imprisonment.Hostage',
  Event: 'Character.Imprisonment.Event',
  None: 'Character.Imprisonment.None',
};

function imprisonmentReasonLabel(reason: string): string {
  const key = IMPRISONMENT_REASON_KEYS[reason] ?? IMPRISONMENT_REASON_KEYS.None;
  return webUIText(key);
}

function isAltKeyEvent(event: KeyboardEvent): boolean {
  return event.key === 'Alt' || event.code === 'AltLeft' || event.code === 'AltRight';
}

/** Tracks whether Alt is held. Used to expand the compact tooltip on demand. */
function useAltHeld(initialHeld: boolean): boolean {
  const [held, setHeld] = useState(initialHeld);
  useEffect(() => {
    setHeld(initialHeld);
  }, [initialHeld]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.altKey || isAltKeyEvent(e)) setHeld(true); };
    const onKeyUp = (e: KeyboardEvent) => { if (!e.altKey || isAltKeyEvent(e)) setHeld(false); };
    const onMouseMove = (e: MouseEvent) => setHeld(e.altKey);
    // Browsers swallow keyup when focus shifts (Alt-Tab); reset so we don't get stuck.
    const onBlur = () => setHeld(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return held;
}

interface TitleParts {
  relation: string | null;
  title: string | null;
}

function formatTitleWithRelation(character: Character): TitleParts | null {
  const title = character.shortTitle?.trim() || null;
  if (character.isPlayerCharacter) return { relation: webUIText('Character.Relation.You'), title };
  const rel = character.relationToPlayer?.trim();
  if (rel) {
    return {
      relation: webUIText('Character.Relation.Your', { Relation: rel.toLowerCase() }),
      title,
    };
  }
  return title ? { relation: null, title } : null;
}

function breakdownLines(entries?: { label: string; value: number }[]): TooltipLine[] {
  if (!entries || entries.length === 0) return [];
  return entries.map(e => {
    return {
      label: e.label,
      value: formatSignedNumber(e.value),
      valueColor: e.value > 0 ? 'var(--green)' : e.value < 0 ? 'var(--red)' : 'var(--text-muted)',
    };
  });
}

function getTemporaryStatModifiers(character: Character, stat: StatKey): CharacterStatModifier[] {
  return character.stats.temporaryModifiers?.filter(modifier => modifier.stat === stat) ?? [];
}

function getTemporaryStatModifierTotal(modifiers: CharacterStatModifier[]): number {
  return modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
}

function modifierValueColor(value: number): string {
  if (value > 0) return 'var(--green)';
  if (value < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function formatTemporaryModifierLabel(modifier: CharacterStatModifier): string {
  if (modifier.remainingDays === undefined) return modifier.label;
  const days = Math.round(modifier.remainingDays);
  return webUIText("Auto.Return.componentscommonPersonTooltip.120.1", { Label: modifier.label, Value2: formatNumber(days), Value3: days === 1 ? webUIText('Common.Day') : webUIText('Common.Days') });
}

function temporaryModifierTooltipLines(modifiers: CharacterStatModifier[]): TooltipLine[] {
  if (modifiers.length === 0) return [];

  return [
    { label: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.127.1'), isHeader: true },
    ...modifiers.map(modifier => ({
      label: formatTemporaryModifierLabel(modifier),
      value: formatSignedNumber(modifier.value, { maximumFractionDigits: 1 }),
      valueColor: modifierValueColor(modifier.value),
    })),
  ];
}

function imprisonmentSummary(c: Character): string | null {
  if (!c.isImprisoned) return null;
  return [
    imprisonmentReasonLabel(c.imprisonmentReason ?? 'None'),
    c.imprisonedBy ? `held by ${c.imprisonedBy}` : null,
    c.imprisonedAt ? `in ${c.imprisonedAt}` : null,
  ].filter(Boolean).join(' - ');
}

// ─── Meter bars ─────────────────────────────────────────────────────────────

function MeterBar({
  leftIcon,
  leftAlt,
  rightIcon,
  rightAlt,
  children,
  tooltip,
}: {
  leftIcon: string;
  leftAlt: string;
  rightIcon: string;
  rightAlt: string;
  children: React.ReactNode;
  tooltip: TooltipContent;
}) {
  return (
    <Tooltip content={tooltip} position="left" delay={150}>
      <div className="ptt-meter-row">
        <img src={leftIcon} alt={leftAlt} className="ptt-meter-icon" draggable={false} />
        <div className="ptt-meter-track">{children}</div>
        <img src={rightIcon} alt={rightAlt} className="ptt-meter-icon" draggable={false} />
      </div>
    </Tooltip>
  );
}

function ComplianceSegmentedBar({ value, breakdown }: {
  value: number;
  breakdown?: { label: string; value: number }[];
}) {
  const current = getComplianceState(value);
  const currentIndex = COMPLIANCE_SEGMENTS.findIndex(s => s.label === current.label);
  return (
    <MeterBar
      leftIcon="/assets/icons/Compliance/I_Refusing.png"
      leftAlt={webUIText('Auto.ExtraAttr.ComponentsCommonPersonTooltip.182.1')}
      rightIcon="/assets/icons/Compliance/I_Eager.png"
      rightAlt={webUIText('Auto.ExtraAttr.ComponentsCommonPersonTooltip.184.2')}
      tooltip={{
        get title() { return webUIText("Auto.Prop.componentscommonPersonTooltip.186.1", { Label: current.label }); },
        body: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.187.2'),
        lines: breakdownLines(breakdown),
      }}
    >
      <div className="ptt-comp-segments">
        {COMPLIANCE_SEGMENTS.map((s, i) => {
          const fillPct = i < currentIndex
            ? 1
            : i === currentIndex
              ? Math.max(0, Math.min(1, (value - s.min) / (s.max - s.min)))
              : 0;
          return (
            <div key={s.label} className={`ptt-comp-seg ptt-comp-seg--${s.fill}`}>
              <div className="ptt-comp-seg-fill" style={{ transform: `scaleX(${fillPct})` }} />
            </div>
          );
        })}
      </div>
    </MeterBar>
  );
}

function OpinionBar({ value, breakdown }: {
  value: number;
  breakdown?: { label: string; value: number }[];
}) {
  const clamped = Math.max(-100, Math.min(100, value)) / 100;
  return (
    <MeterBar
      leftIcon="/assets/icons/I_OpinionNegative.png"
      leftAlt={webUIText('Auto.ExtraAttr.ComponentsCommonPersonTooltip.217.3')}
      rightIcon="/assets/icons/I_OpinionPositive.png"
      rightAlt={webUIText('Auto.ExtraAttr.ComponentsCommonPersonTooltip.219.4')}
      tooltip={{
        title: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.221.3'),
        lines: breakdownLines(breakdown),
      }}
    >
      {clamped < 0 && (
        <div
          className="ptt-painted-fill ptt-painted-fill--red"
          style={{ width: '50%', right: '50%', left: 'auto', transformOrigin: 'right', transform: `scaleX(${Math.abs(clamped)})` }}
        />
      )}
      {clamped > 0 && (
        <div
          className="ptt-painted-fill ptt-painted-fill--green"
          style={{ width: '50%', left: '50%', transform: `scaleX(${clamped})` }}
        />
      )}
      <div className="ptt-painted-center" />
    </MeterBar>
  );
}

function ReputationBar({ value, breakdown }: {
  value: number;
  breakdown?: { label: string; value: number }[];
}) {
  const clamped = Math.max(-1, Math.min(1, value));
  return (
    <MeterBar
      leftIcon="/assets/icons/I_Dread.png"
      leftAlt={webUIText('Auto.ExtraAttr.ComponentsCommonPersonTooltip.250.5')}
      rightIcon="/assets/icons/I_Honor.png"
      rightAlt={webUIText('Auto.ExtraAttr.ComponentsCommonPersonTooltip.252.6')}
      tooltip={{
        title: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.254.4'),
        body: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.255.5'),
        lines: breakdownLines(breakdown),
      }}
    >
      {clamped < 0 && (
        <div
          className="ptt-painted-fill ptt-painted-fill--red"
          style={{ width: '50%', right: '50%', left: 'auto', transformOrigin: 'right', transform: `scaleX(${Math.abs(clamped)})` }}
        />
      )}
      {clamped > 0 && (
        <div
          className="ptt-painted-fill ptt-painted-fill--green"
          style={{ width: '50%', left: '50%', transform: `scaleX(${clamped})` }}
        />
      )}
      <div className="ptt-painted-center" />
    </MeterBar>
  );
}

// ─── Strip-layout content ───────────────────────────────────────────────────

function PersonTooltipContent({ character: c, initialAltHeld }: { character: Character; initialAltHeld: boolean }) {
  const { debugMode } = useGameState();
  const isAlive = c.isAlive !== false;
  const isPlayer = c.isPlayerCharacter === true;
  const titleParts = formatTitleWithRelation(c);

  const showCompliance = isAlive && !isPlayer && c.isSubordinateOfPlayer === true;
  const showOpinion = isAlive && !isPlayer
    && c.opinionTowardPlayer !== undefined
    && (c.opinionBreakdown?.length ?? 0) > 0;
  const showHonourDread = isAlive
    && (c.honourDread !== 0 || (c.honourDreadBreakdown?.length ?? 0) > 0);
  const hasStanding = showCompliance || showOpinion || showHonourDread;

  const activityPlain = (c.activitySegments ?? []).map(segment => segment.text).join('').trim();
  const showActivity = isAlive && activityPlain.length > 0;
  const imprisonment = imprisonmentSummary(c);

  const expanded = useAltHeld(initialAltHeld);

  return (
    <div className={`ptt-strip${expanded ? ' is-expanded' : ''}`}>
      <div className="ptt-strip-head">
        <div className="ptt-strip-name-row">
          {titleParts?.title && <span className="ptt-strip-title">{titleParts.title}</span>}
          <span className="ptt-strip-name">{c.name}</span>
          <span className="ptt-strip-age">{formatNumber(c.age)}{!isAlive ? webUIText("PersonTooltip.Deceased") : ''}</span>
        </div>
        {titleParts?.relation && (
          <div className="ptt-strip-relation">{titleParts.relation}</div>
        )}
        <div className="ptt-strip-meta">
          <CultureTooltip info={c.cultureInfo} fallbackName={c.culture} fallbackId={c.cultureInfo?.id}>
            <span className="ptt-meta-chip">
              <img src={cultureIconPath(c.cultureInfo?.id)} alt="" className="ptt-meta-icon" draggable={false} />
              <span>{c.culture}</span>
            </span>
          </CultureTooltip>
          <span className="ptt-dot" />
          <ReligionTooltip info={c.religionInfo} fallbackName={c.religion}>
            <span className="ptt-meta-chip">
              <img src="/assets/icons/I_Religions.png" alt="" className="ptt-meta-icon" draggable={false} />
              <span>{c.religion}</span>
            </span>
          </ReligionTooltip>
        </div>
      </div>

      {(showActivity || imprisonment) && (
        <div className={`ptt-strip-activity${imprisonment ? ' is-bad' : ''}`}>
          {imprisonment ?? activityPlain}
        </div>
      )}

      {debugMode && (
        <div className="ptt-debug">
          <div className="ptt-debug-title"><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.333.1" /></div>
          <div className="ptt-debug-row"><span><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.334.2" /></span><span>#{formatNumber(c.debugShortId ?? 0)}</span></div>
          <div className="ptt-debug-row"><span><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.335.3" /></span><span>{c.activity}</span></div>
          <div className="ptt-debug-row"><span><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.336.4" /></span><span>{formatNumber(c.debugAgeDays ?? 0)}</span></div>
          <div className="ptt-debug-row"><span><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.337.5" /></span><span>{formatNumber(c.vigor ?? 0, { maximumFractionDigits: 1 })}</span></div>
          {c.powerBlocName && (
            <div className="ptt-debug-row">
              <span><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.340.6" /></span>
              <span>{c.powerBlocName}{c.powerBlocDebugShortId ? ` (#${formatNumber(c.powerBlocDebugShortId)})` : ''}</span>
            </div>
          )}
          {c.commanderKind && <div className="ptt-debug-row"><span><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.344.7" /></span><span>{c.commanderKind}</span></div>}
          {c.isImmortal && <div className="ptt-debug-row"><span><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.345.8" /></span><span><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.345.9" /></span></div>}
        </div>
      )}

      {expanded && (
        <div className="ptt-strip-body">
          <div className="ptt-strip-stats">
            {STAT_DEFS.map(s => {
              const val = c.stats[s.key];
              const base = c.stats.base?.[s.key];
              const temporaryModifiers = getTemporaryStatModifiers(c, s.key);
              const temporaryTotal = getTemporaryStatModifierTotal(temporaryModifiers);
              const contributions = c.traits.flatMap((trait) =>
                (trait.effects ?? [])
                  .filter((e) => e.stat === s.key)
                  .map((e) => ({ label: trait.name, value: e.value, valueColor: e.isPositive ? 'var(--green)' : 'var(--red)' })),
              );
              const baseContent = glossary[s.glossaryKey as keyof typeof glossary] || { title: s.label, body: '' };
              const lines: TooltipLine[] = [];
              if (base !== undefined) lines.push({ label: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.365.6'), value: formatNumber(base) });
              if (contributions.length > 0) {
                lines.push({ label: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.367.7'), isHeader: true });
                lines.push(...contributions);
              }
              lines.push(...temporaryModifierTooltipLines(temporaryModifiers));
              lines.push({ label: webUIText('CharacterStats.CurrentEffects'), isHeader: true });
              lines.push(...characterStatEffectLines(s.key, val));
              return (
                <Tooltip
                  key={s.key}
                  content={{ title: baseContent.title, body: baseContent.body, lines }}
                  position="left"
                  delay={150}
                >
                  <div className="ptt-strip-stat">
                    <img src={s.icon} alt="" className="ptt-strip-stat-icon" draggable={false} />
                    <span className="ptt-strip-stat-label">{s.label}</span>
                    {Math.abs(temporaryTotal) >= 0.05 && (
                      <span className="ptt-strip-stat-temp" style={{ color: modifierValueColor(temporaryTotal) }}>
                        {formatSignedNumber(temporaryTotal, { maximumFractionDigits: 1 })}
                      </span>
                    )}
                    <span className="ptt-strip-stat-val" style={{ color: getStatColor(val) }}>{formatNumber(val)}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>

          {hasStanding && <div className="ptt-strip-divider" />}

          {hasStanding && (
            <div className="ptt-strip-standing">
              {showCompliance && (
                <ComplianceSegmentedBar value={c.compliance} breakdown={c.complianceBreakdown} />
              )}
              {showOpinion && c.opinionTowardPlayer !== undefined && (
                <OpinionBar value={c.opinionTowardPlayer} breakdown={c.opinionBreakdown} />
              )}
              {showHonourDread && (
                <ReputationBar value={c.honourDread} breakdown={c.honourDreadBreakdown} />
              )}
            </div>
          )}
        </div>
      )}

      {expanded && c.traits.length > 0 && (
        <div className="ptt-strip-traits">
          {c.traits.map((trait) => {
            const footer = trait.isTemporary && trait.remainingDays !== undefined ? webUIText("PersonTooltip.ExpiresIn", { Value1: formatNumber(trait.remainingDays), Value2: trait.remainingDays === 1 ? webUIText("Common.Day") : webUIText("Common.Days") }) : undefined;
            return (
              <Tooltip
                key={trait.id}
                content={{
                  title: trait.name,
                  body: trait.description,
                  footer,
                  lines: (trait.effects ?? []).map(e => ({
                    label: e.label,
                    labelIcon: STAT_ICONS[e.stat],
                    value: e.value,
                    valueColor: e.isPositive ? 'var(--green)' : 'var(--red)',
                  })),
                }}
                position="left"
                delay={100}
              >
                <TraitIcon trait={trait} className="ptt-trait-icon" />
              </Tooltip>
            );
          })}
        </div>
      )}

      {!expanded && (
        <div className="ptt-strip-hint"><WebUIText textKey="Auto.ComponentsCommonPersonTooltip.441.10" /></div>
      )}
    </div>
  );
}

const PersonTooltip: React.FC<PersonTooltipProps> = ({
  character,
  characterId,
  children,
  position = 'right',
  delay = 200,
}) => {
  const { openSidebar } = useGameActions();
  const lookupId = characterId ?? character?.id ?? null;
  const [resolveRequested, setResolveRequested] = useState(false);
  const fetched = usePersonTooltipBridge(!character && resolveRequested ? lookupId : null);
  const resolved = character ?? fetched ?? null;
  const [pointerAltHeld, setPointerAltHeld] = useState(false);

  const clickId = resolved?.id ?? lookupId;
  const handleClick = clickId ? () => openSidebar('character', clickId) : undefined;
  const requestResolution = useCallback(() => {
    if (lookupId) setResolveRequested(true);
  }, [lookupId]);
  const updatePointerAltHeld = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    setPointerAltHeld(event.altKey);
  }, []);

  if (!resolved && !lookupId) {
    return (
      <div
        className="ptt-portrait-btn"
        onClick={handleClick}
        onMouseEnter={updatePointerAltHeld}
        onMouseMove={updatePointerAltHeld}
      >
        {children}
      </div>
    );
  }

  return (
    <Tooltip
      content={resolved ? { afterLines: <PersonTooltipContent character={resolved} initialAltHeld={pointerAltHeld} /> } : null}
      position={position}
      delay={delay}
      variant="sidebar"
      bubbleClassName="tt-bubble--person"
      disabled={!resolved}
      onShowIntent={requestResolution}
    >
      <div
        className="ptt-portrait-btn"
        onClick={handleClick}
        onMouseEnter={updatePointerAltHeld}
        onMouseMove={updatePointerAltHeld}
      >
        {children}
      </div>
    </Tooltip>
  );
};

export default PersonTooltip;
