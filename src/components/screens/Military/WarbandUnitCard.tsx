import type { WarbandUnitPreview } from '../../../bridge-types.generated';
import { unitTypeLabel } from '../../../utils/displayLabels';
import { WebkilnAssetPath } from '../../../utils/assets';
import { formatNumber } from '../../../utils/numberFormat';
import Tooltip from '../../common/tooltips/Tooltip';
import UnitTooltip, { type UnitTooltipData } from '../../common/tooltips/UnitTooltip';
import './WarbandUnitCard.css';

const TYPE_ORDER = ['infantry', 'ranged', 'cavalry', 'siege', 'special', 'scout', 'galley', 'trireme', 'quinquereme', 'transport'];

const TYPE_ICONS: Record<string, string> = {
  infantry: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  cavalry: '/assets/icons/UnitTypes/I_ArmyCavalry.png',
  ranged: '/assets/icons/UnitTypes/I_ArmyRanged.png',
  siege: '/assets/icons/UnitTypes/I_ArmySiege.png',
  special: '/assets/icons/UnitTypes/I_ArmySpecial.png',
  scout: '/assets/icons/I_NaviesQuickButton.png',
  galley: '/assets/icons/I_NaviesQuickButton.png',
  trireme: '/assets/icons/I_NaviesQuickButton.png',
  quinquereme: '/assets/icons/I_NaviesQuickButton.png',
  transport: '/assets/icons/I_NaviesQuickButton.png',
};

function typeIcon(typeId: string): string {
  return TYPE_ICONS[typeId] ?? TYPE_ICONS.special;
}

function unitTooltipData(unit: WarbandUnitPreview): UnitTooltipData {
  return {
    name: unit.name,
    description: unit.description,
    portrait: unit.portrait,
    typeLabel: unit.type || unitTypeLabel(unit.typeId),
    typeIcon: typeIcon(unit.typeId),
    tier: unit.tier,
    culture: unit.culture || undefined,
    strength: unit.strength,
    maxStrength: unit.maxStrength,
    upkeep: unit.upkeep,
    foodConsumption: unit.foodConsumption,
    speed: unit.speed,
    attackSpeed: unit.attackSpeed,
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
    immuneToWinterAttrition: unit.immuneToWinterAttrition,
    immuneToDesertAttrition: unit.immuneToDesertAttrition,
    canAttackWhileMoving: unit.canAttackWhileMoving,
    count: unit.count,
  };
}

export function WarbandUnitCard({ unit, compact = false }: { unit: WarbandUnitPreview; compact?: boolean }) {
  const portrait = unit.portrait ? WebkilnAssetPath(unit.portrait) : undefined;
  return (
    <Tooltip
      content={{ afterLines: <UnitTooltip data={unitTooltipData(unit)} /> }}
      position="top"
      delay={150}
      wrapperClassName={compact ? 'warband-unit-breakdown-tip' : 'warband-unit-tip'}
    >
      {compact ? <div tabIndex={0} className="warband-unit-breakdown-row">
        {portrait && <img src={portrait} alt="" draggable={false} />}
        <span>{unit.name}</span>
        <strong>{formatNumber(unit.strength)}</strong>
      </div> : <div className="warband-unit-card">
        <div className="warband-unit-portrait">
          {portrait ? <img src={portrait} alt="" draggable={false} /> : <span>{unit.name.charAt(0)}</span>}
          <span className="warband-unit-count">{formatNumber(unit.count)}</span>
        </div>
        <span className="warband-unit-name">{unit.name}</span>
      </div>}
    </Tooltip>
  );
}

export function WarbandUnitBreakdown({ units }: { units: WarbandUnitPreview[] }) {
  return <div className="warband-unit-breakdown">
    {sortUnits(units).map(unit => <WarbandUnitCard key={unit.id} unit={unit} compact />)}
  </div>;
}

function sortUnits(units: WarbandUnitPreview[]): WarbandUnitPreview[] {
  return [...units].sort((a, b) => {
    const orderA = TYPE_ORDER.indexOf(a.typeId);
    const orderB = TYPE_ORDER.indexOf(b.typeId);
    const rankA = orderA < 0 ? TYPE_ORDER.length : orderA;
    const rankB = orderB < 0 ? TYPE_ORDER.length : orderB;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });
}

export function WarbandUnitGrid({ units }: { units: WarbandUnitPreview[] }) {
  if (units.length === 0) return null;
  return (
    <div className="warband-unit-grid">
      {sortUnits(units).map(unit => <WarbandUnitCard key={unit.id} unit={unit} />)}
    </div>
  );
}
