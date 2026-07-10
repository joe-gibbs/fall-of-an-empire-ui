import React from 'react';
import type {
  Settlement,
  ArmyUnitType,
  BuildingResourceCost,
  FormationTemplate,
  FormationUnitSlot,
  RecruitableUnit,
  UnitRecruitmentEntry,
  UnitTrainingQueueItem,
} from '../../../data/types';
import type {
  FormationTemplateEntry,
  FormationTemplateResourceCost,
  FormationTemplateUnitEntry,
} from '../../../bridge-types.generated';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';
import InteractionCard from '../../common/interactions/InteractionCard';
import UnitTooltip from '../../common/tooltips/UnitTooltip';
import type { UnitTooltipData } from '../../common/tooltips/UnitTooltip';
import {
  applyFormationTemplateBridge,
  useFormationTemplatesBridge,
} from '../../../bridge/military-map/useFormationTemplatesBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useGameActions } from '../../../context/GameContext';
import { getFormationTemplateIcon } from '../../../utils/formationTemplatePresentation';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import { formatNumber } from '../../../utils/numberFormat';
import './SettlementMilitaryPanel.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface Props {
  settlement: Settlement;
}

const n = (v: number): string => formatNumber(v);

const TYPE_ORDER: ArmyUnitType[] = ['infantry', 'cavalry', 'ranged', 'siege', 'navy'];

const TYPE_LABELS: Record<ArmyUnitType, string> = {
  infantry: 'Infantry',
  cavalry: 'Cavalry',
  ranged: 'Ranged',
  siege: 'Siege',
  navy: 'Navy',
};

const TYPE_ICONS: Record<ArmyUnitType, string> = {
  infantry: '/assets/icons/UnitTypes/Infantry.png',
  cavalry: '/assets/icons/UnitTypes/Cavalry.png',
  ranged: '/assets/icons/UnitTypes/Ranged.png',
  siege: '/assets/icons/I_Siege.png',
  navy: '/assets/icons/I_NaviesQuickButton.png',
};

const asset = (path: string): string => FoaeCefUIAssetPath(path) ?? path;

function normaliseUnitType(type: string): ArmyUnitType {
  if (type === 'infantry' || type === 'cavalry' || type === 'ranged' || type === 'siege') return type;
  return 'navy';
}

function resourceCosts(costs: FormationTemplateResourceCost[]): BuildingResourceCost[] {
  return costs.map(cost => ({
    name: cost.name,
    displayName: cost.displayName,
    description: cost.description,
    effects: cost.effects,
    amount: cost.amount,
    icon: `/assets/resources/${cost.name}.png`,
  }));
}

function templateUnitAsRecruitable(unit: FormationTemplateUnitEntry): RecruitableUnit {
  const type = normaliseUnitType(unit.type);
  return {
    id: unit.id,
    assetKey: unit.id,
    name: unit.name,
    description: unit.description,
    portrait: asset(unit.portrait),
    type,
    tier: unit.tier as RecruitableUnit['tier'],
    price: unit.price,
    buildTime: unit.buildTimeDays,
    upkeep: unit.upkeep,
    foodConsumption: unit.foodConsumption,
    maxStrength: unit.maxStrength,
    speed: unit.speed,
    damage: {
      pierce: unit.pierceDamage,
      crush: unit.crushDamage,
      slash: unit.slashDamage,
    },
    armour: {
      pierce: unit.pierceArmour,
      crush: unit.crushArmour,
      slash: unit.slashArmour,
    },
    resourceCost: resourceCosts(unit.resourceCost),
    monthlyConsumption: resourceCosts(unit.monthlyConsumption),
    immuneToWinterAttrition: unit.immuneToWinterAttrition,
    immuneToDesertAttrition: unit.immuneToDesertAttrition,
  };
}

function templateUnitAsSlot(unit: FormationTemplateUnitEntry): FormationUnitSlot {
  const type = normaliseUnitType(unit.type);
  return {
    unitAssetKey: unit.id,
    unitName: unit.name,
    portrait: asset(unit.portrait),
    type,
    tier: unit.tier as FormationUnitSlot['tier'],
    count: unit.count,
  };
}

function formationTemplateFromBridge(template: FormationTemplateEntry): FormationTemplate {
  const composition = template.units
    .filter(unit => unit.count > 0)
    .map(templateUnitAsSlot);

  return {
    id: template.id,
    name: template.name,
    type: template.type === 'naval' ? 'naval' : 'land',
    composition,
    totalPrice: template.creationCost,
    totalBuildTime: template.creationTimeDays,
    monthlyUpkeep: template.monthlyUpkeep,
    totalStrength: template.totalStrength,
    raisableHere: template.canApply,
    lockReasons: template.applyReason ? [template.applyReason] : [],
  };
}

/** Map a recruitable unit definition onto the shared unit-tooltip structure.
 *  UnitTooltip scales bars against a hardcoded game-wide roster max (see
 *  GAME_WIDE_MAXES in UnitTooltip.tsx), so no per-settlement normalisation
 *  is threaded through here. */
function unitTooltipData(u: RecruitableUnit): UnitTooltipData {
  return {
    name: u.name,
    description: u.description,
    portrait: u.portrait,
    typeLabel: TYPE_LABELS[u.type],
    typeIcon: TYPE_ICONS[u.type],
    tier: u.tier,
    sourceBuilding: u.sourceBuilding,
    maxStrength: u.maxStrength,
    price: u.price,
    buildTime: u.buildTime,
    upkeep: u.upkeep,
    foodConsumption: u.foodConsumption,
    speed: u.speed,
    damage: u.damage,
    armour: u.armour,
    resourceCost: u.resourceCost,
    monthlyConsumption: u.monthlyConsumption,
    immuneToWinterAttrition: u.immuneToWinterAttrition,
    immuneToDesertAttrition: u.immuneToDesertAttrition,
  };
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function TierPips({ tier }: { tier: number }) {
  return (
    <span className="mil-tier-pips" aria-label={webUIText("Auto.Attr.componentssidebarsSettlementMilitaryPanel.79.1", { Value1: n(tier) })}>
      {[1, 2, 3, 4].map(i => (
        <span key={i} className={`mil-tier-pip${i <= tier ? ' mil-tier-pip--on' : ''}`} />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Training queue (sticky at top)
// ---------------------------------------------------------------------------

function TrainingQueue({
  items, unitByKey,
}: {
  items: UnitTrainingQueueItem[];
  unitByKey: Map<string, RecruitableUnit>;
}) {
  if (items.length === 0) return null;
  const [active, ...rest] = items;

  const formationInfo = active.formationId
    ? {
        get name() { return active.formationName ?? webUIText("Auto.Fix.PropExprFallback.componentssidebarsSettlementMilitaryPanel.102.1"); },
        completed: active.formationProgress?.completed ?? 0,
        total: active.formationProgress?.total ?? 0,
      }
    : null;

  const title = active.formationName
    ? `${active.name}  -  ${active.formationName}`
    : active.name;

  return (
    <div className="mil-queue">
      <InteractionCard
        title={title}
        description={formationInfo ? webUIText("Auto.Fix.ExprTrue.componentssidebarsSettlementMilitaryPanel.117.1", { Value1: n(formationInfo.completed + 1), Value2: n(formationInfo.total) }) : webUIText("Auto.Fix.ExprFalse.componentssidebarsSettlementMilitaryPanel.118.1")}
        image={active.portrait}
        durationDays={active.durationDays}
        remainingDays={active.remainingDays ?? active.durationDays}
        inProgress={true}
      />
      {rest.length > 0 && (
        <div className="mil-queue-next">
          <span className="mil-queue-next-label"><WebUIText textKey="Auto.ComponentsSidebarsSettlementMilitaryPanel.125.1" /></span>
          <div className="mil-queue-next-list">
            {rest.map(item => {
              const unit = unitByKey.get(item.assetKey);
              const content: TooltipContent = unit
                ? { afterLines: <UnitTooltip data={unitTooltipData(unit)} /> }
                : {
                    title: item.name,
                    get body() { return item.formationName ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementMilitaryPanel.134.1", { FormationName: item.formationName }) : webUIText("Auto.Fix.PropExprFalse.componentssidebarsSettlementMilitaryPanel.134.1"); },
                    lines: [
                      { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementMilitaryPanel.136.1'), value: n(item.tier), valueColor: 'var(--gold)' },
                      { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementMilitaryPanel.137.2'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementMilitaryPanel.137.1", { Value1: n(item.durationDays) }); } },
                    ],
                  } as TooltipContent;
              return (
                <Tooltip key={item.id} content={content} position="left" delay={150}>
                  <div className="mil-queue-next-item">
                    <img src={asset(item.portrait)} alt="" className="mil-queue-next-icon" />
                    <span className="mil-queue-next-tier">{n(item.tier)}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formation card - shows composition + raise CTA
// ---------------------------------------------------------------------------

function FormationCard({
  f, unitByKey, blockedReason, onRaise, onOpen,
}: {
  f: FormationTemplate;
  unitByKey: Map<string, RecruitableUnit>;
  blockedReason: string;
  onRaise: (templateId: string) => void;
  onOpen: (templateId: string) => void;
}) {
  const lockReasons = blockedReason ? [blockedReason] : (f.lockReasons ?? []);
  const locked = blockedReason.length > 0 || !f.raisableHere;
  const iconProfile = getFormationTemplateIcon(f.type, f.composition);
  const tooltip: TooltipContent = {
    title: f.name,
    get body() { return webUIText("Auto.Prop.componentssidebarsSettlementMilitaryPanel.169.1", { Value1: f.type === 'land' ? 'Land' : 'Naval', Value2: n(f.composition.reduce((a, b) => a + b.count, 0)) }); },
    lines: [
      { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementMilitaryPanel.171.3'), value: n(f.totalStrength), valueColor: 'var(--gold)' },
      { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementMilitaryPanel.172.4'), value: n(f.totalPrice), valueIcon: '/assets/icons/I_Coins.png' },
      { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementMilitaryPanel.173.5'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementMilitaryPanel.173.1", { Value1: n(f.totalBuildTime) }); } },
      { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementMilitaryPanel.174.6'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementMilitaryPanel.174.1", { Value1: n(f.monthlyUpkeep) }); }, valueIcon: '/assets/icons/I_Coins.png' },
      ...(locked
        ? [
            { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementMilitaryPanel.177.7'), isHeader: true } as TooltipLine,
            ...lockReasons.map(r => ({ label: r, valueColor: 'var(--red)' } as TooltipLine)),
          ]
        : []),
    ],
  };

  return (
    <Tooltip content={tooltip} position="left" delay={200}>
      <div
        className={`mil-formation${locked ? ' mil-formation--locked' : ''}`}
        role="button"
        tabIndex={0}
        onMouseDown={() => onOpen(f.id)}
      >
        <div className="mil-formation-header">
          <span className="mil-formation-title">
            <img src={asset(iconProfile.icon)} alt="" className="mil-formation-icon" />
            <span className="mil-formation-name">{f.name}</span>
          </span>
          <span className="mil-formation-type">
            {f.type === 'land' ? webUIText("Auto.Fix.ExprTrue.componentssidebarsSettlementMilitaryPanel.190.1") : webUIText("Auto.Fix.ExprFalse.componentssidebarsSettlementMilitaryPanel.190.1")}
          </span>
        </div>
        <div className="mil-formation-body">
          <div className="mil-formation-slots">
            {f.composition.map((s, i) => (
              <FormationSlotIcon key={i} slot={s} unitByKey={unitByKey} />
            ))}
          </div>
          <div className="mil-formation-meta">
            <span className="mil-formation-meta-item">
              <img src={asset('/assets/icons/I_Swords.png')} alt="" className="mil-meta-icon" />
              {n(f.totalStrength)}
            </span>
            <span className="mil-formation-meta-item">
              <img src={asset('/assets/icons/I_Coins.png')} alt="" className="mil-meta-icon" />
              {n(f.totalPrice)}
            </span>
            <span className="mil-formation-meta-item mil-formation-meta-item--muted">
              {n(f.totalBuildTime)}<WebUIText textKey="Auto.ComponentsSidebarsSettlementMilitaryPanel.208.2" />
            </span>
            <span className="mil-formation-meta-item mil-formation-meta-item--muted">
              <img src={asset('/assets/icons/I_Coins.png')} alt="" className="mil-meta-icon" />
              {n(f.monthlyUpkeep)}<WebUIText textKey="Auto.ComponentsSidebarsSettlementMilitaryPanel.212.3" />
            </span>
          </div>
        </div>
        <div className="mil-formation-action">
          {locked ? (
            <div className="mil-formation-locked">
              <img src={asset('/assets/icons/I_Locked.png')} alt="" className="mil-locked-icon" />
              <span>{lockReasons[0] ?? webUIText("Auto.Fix.ExprFallback.componentssidebarsSettlementMilitaryPanel.221.1")}</span>
            </div>
          ) : (
            <button
              type="button"
              className="mil-raise-btn"
              onMouseDown={(event) => {
                event.stopPropagation();
                onRaise(f.id);
              }}
            >
              <WebUIText textKey="Auto.ComponentsSidebarsSettlementMilitaryPanel.224.4" />
            </button>
          )}
        </div>
      </div>
    </Tooltip>
  );
}

function FormationSlotIcon({
  slot, unitByKey,
}: {
  slot: FormationUnitSlot;
  unitByKey: Map<string, RecruitableUnit>;
}) {
  const unit = unitByKey.get(slot.unitAssetKey);
  const content: TooltipContent = unit
    ? (
      // Wrap the rich tooltip with a small "x COUNT" header so the player
      // knows how many of this unit are in the formation.
      {
        afterLines: (
          <div>
            <div className="mil-formation-slot-tooltip-count">
              {webUIText("Auto.Fix.Expr.componentssidebarsSettlementMilitaryPanel.247.1", { Value1: n(slot.count) })}
            </div>
            <UnitTooltip data={unitTooltipData(unit)} />
          </div>
        ),
      }
    )
    : {
        get title() { return webUIText("Auto.Prop.componentssidebarsSettlementMilitaryPanel.253.1", { Value1: n(slot.count), Value2: slot.unitName }); },
        get body() { return webUIText("Auto.Prop.componentssidebarsSettlementMilitaryPanel.254.1", { Value1: TYPE_LABELS[slot.type], Value2: n(slot.tier) }); },
      } as TooltipContent;

  return (
    <Tooltip content={content} position="bottom" delay={150}>
      <span className="mil-formation-slot">
        <img src={asset(slot.portrait)} alt="" className="mil-formation-slot-portrait" />
        <span className="mil-formation-slot-count"><WebUIText textKey="Auto.ComponentsSidebarsSettlementMilitaryPanel.260.5" />{n(slot.count)}</span>
      </span>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const SettlementMilitaryPanel: React.FC<Props> = ({ settlement }) => {
  const r = settlement.recruitment;
  const templateData = useFormationTemplatesBridge();
  const { openScreen } = useGameActions();
  const [formationMessage, setFormationMessage] = React.useState<{ text: string; applied: boolean } | null>(null);

  // Group recruits by unit type, preserving TYPE_ORDER. Hook runs
  // unconditionally to satisfy rules-of-hooks even when recruitment is
  // missing - the early return below handles the empty case.
  const byType = React.useMemo(() => {
    const m = new Map<ArmyUnitType, UnitRecruitmentEntry[]>();
    for (const t of TYPE_ORDER) m.set(t, []);
    if (!r) return m;
    for (const e of r.recruits) {
      m.get(e.unit.type)?.push(e);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.unit.tier - b.unit.tier);
    }
    return m;
  }, [r]);

  // Lookup table so the training queue and formation slots can resolve a
  // raw assetKey back into the full unit stats for the rich tooltip.
  const unitByKey = React.useMemo(() => {
    const m = new Map<string, RecruitableUnit>();
    if (templateData) {
      for (const template of templateData.templates) {
        for (const unit of template.units) {
          if (unit.count > 0) m.set(unit.id, templateUnitAsRecruitable(unit));
        }
      }
    }
    if (r) {
      for (const e of r.recruits) m.set(e.unit.assetKey, e.unit);
    }
    return m;
  }, [r, templateData]);

  const formations = React.useMemo(() => {
    const source = r ? r.formations : (templateData?.templates.map(formationTemplateFromBridge) ?? []);
    if (settlement.hasPort === true) return source;
    return source.filter(formation => formation.type !== 'naval');
  }, [r, templateData, settlement.hasPort]);

  const newTemplateType = React.useMemo(() => {
    if (!r) return 'land';
    const canRaiseLand = TYPE_ORDER.some(type => type !== 'navy' && (r.maxTier[type] ?? 0) > 0);
    const canRaiseNaval = (r.maxTier.navy ?? 0) > 0 || settlement.hasPort === true;
    return !canRaiseLand && canRaiseNaval ? 'naval' : 'land';
  }, [r, settlement.hasPort]);

  const raiseFormation = React.useCallback((templateId: string) => {
    setFormationMessage(null);
    void applyFormationTemplateBridge(templateId, settlement.id)
      .then(response => {
        setFormationMessage(response.message ? { text: response.message, applied: response.applied } : null);
      })
      .catch(acknowledgeBridgeFailure);
  }, [settlement.id]);

  const openNewTemplate = React.useCallback(() => {
    setFormationMessage(null);
    openScreen('military', `new:${newTemplateType}`);
  }, [newTemplateType, openScreen]);

  const openTemplate = React.useCallback((templateId: string) => {
    setFormationMessage(null);
    openScreen('military', `template:${encodeURIComponent(templateId)}`);
  }, [openScreen]);

  const blockedReason = settlement.canBuild === false
    ? (settlement.cannotBuildReason || 'Recruitment is not available right now.')
    : '';

  return (
    <div className={`mil-panel${blockedReason ? ' mil-panel--blocked' : ''}`}>
      {blockedReason && (
        <div className="game-notice game-notice--warning panel-blocked-banner">
          <img src={asset('/assets/icons/I_Locked.png')} alt="" className="panel-blocked-banner-icon" />
          <span className="panel-blocked-banner-text">{blockedReason}</span>
        </div>
      )}

      {formationMessage && (
        <div className={`mil-panel-status${formationMessage.applied ? '' : ' game-notice game-notice--warning mil-panel-status--warning'}`}>
          {formationMessage.text}
        </div>
      )}

      {r && <TrainingQueue items={r.trainingQueue} unitByKey={unitByKey} />}

      <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsSettlementMilitaryPanel.318.8')} />
      <div className="mil-formation-list">
        <button type="button" className="mil-new-template-btn" onMouseDown={openNewTemplate}>
          <span className="mil-new-template-plus">+</span>
          <span><WebUIText textKey="Auto.ComponentsSidebarsSettlementMilitaryPanel.321.7" /></span>
        </button>
        {formations.map(f => (
          <FormationCard
            key={f.id}
            f={f}
            unitByKey={unitByKey}
            blockedReason={blockedReason}
            onRaise={raiseFormation}
            onOpen={openTemplate}
          />
        ))}
      </div>

      {r && (
        <>
          <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsSettlementMilitaryPanel.329.9')} />
          <div className="mil-capacity">
            {TYPE_ORDER.map(type => {
              const list = byType.get(type) ?? [];
              const cap = r.maxTier[type];
              const locked = cap === 0 || list.length === 0;
              const available = list.filter(e => e.available).map(e => e.unit);
              const rowTooltip: TooltipContent = {
                title: TYPE_LABELS[type],
                get body() { return locked ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementMilitaryPanel.339.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsSettlementMilitaryPanel.340.1", { Value1: n(cap as number) }); },
                lines: locked
                  ? undefined
                  : available.map(u => ({
                      label: u.name,
                      get value() { return webUIText("Auto.Prop.componentssidebarsSettlementMilitaryPanel.345.1", { Value1: n(u.tier) }); },
                      valueColor: 'var(--gold)',
                    })),
              };
              return (
                <div key={type} className={`mil-cap${locked ? ' mil-cap--locked' : ''}`}>
                  <Tooltip content={rowTooltip} position="left" delay={200}>
                    <img src={asset(TYPE_ICONS[type])} alt="" className="mil-cap-icon" />
                  </Tooltip>
                  <div className="mil-cap-body">
                    <Tooltip content={rowTooltip} position="left" delay={200}>
                      <span className="mil-cap-label">{TYPE_LABELS[type]}</span>
                    </Tooltip>
                    {locked ? (
                      <span className="mil-cap-locked-text">
                        <img src={asset('/assets/icons/I_Locked.png')} alt="" className="mil-cap-lock" />
                        <span><WebUIText textKey="Auto.ComponentsSidebarsSettlementMilitaryPanel.360.8" /></span>
                      </span>
                    ) : (
                      <div className="mil-cap-roster">
                        {available.map(u => (
                          <Tooltip
                            key={u.assetKey}
                            content={{ afterLines: <UnitTooltip data={unitTooltipData(u)} /> }}
                            position="left"
                            delay={150}
                          >
                            <span className="mil-cap-unit">
                              <img src={asset(u.portrait)} alt="" className="mil-cap-portrait" />
                            </span>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mil-cap-tier">
                    {locked ? (
                      <span className="mil-cap-tier-empty">
                        <img src={asset('/assets/icons/I_Minus.png')} alt="" className="mil-cap-tier-empty-icon" draggable={false} />
                      </span>
                    ) : (
                      <>
                        <TierPips tier={cap as number} />
                        <span className="mil-cap-tier-text"><WebUIText textKey="Auto.ComponentsSidebarsSettlementMilitaryPanel.387.9" />{n(cap as number)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SettlementMilitaryPanel;
