import type { FormationTemplateUnitEntry } from '../bridge-types.generated.ts';
import { webUIText } from '../localization/WebUITextContext';

type BattleFormationRole = 'melee' | 'ranged' | 'siege';

type BattleFormationComposition = {
  role: BattleFormationRole;
  counts: Record<string, number>;
};

function battleGroupName(key: string): string {
  return webUIText(`FormationTemplate.BattleGroup.${key}`);
}

export function battleFormationDisplayName(
  group: BattleFormationComposition,
  unitById: Map<string, FormationTemplateUnitEntry>,
  formationType: 'land' | 'naval',
): string {
  const typeCounts = new Map<string, number>();

  for (const [unitId, count] of Object.entries(group.counts)) {
    const unit = unitById.get(unitId);
    if (!unit || count <= 0) continue;
    typeCounts.set(unit.type, (typeCounts.get(unit.type) ?? 0) + count);
  }

  if (typeCounts.size === 0) {
    if (group.role === 'siege') return webUIText('FormationTemplate.BattlePlan.SiegeTitle');
    if (group.role === 'ranged') return webUIText('FormationTemplate.BattlePlan.RangedTitle');
    return webUIText('FormationTemplate.BattlePlan.MeleeTitle');
  }

  const count = (type: string) => typeCounts.get(type) ?? 0;
  const has = (type: string) => count(type) > 0;

  if (formationType === 'naval') {
    const hasScout = has('scout');
    const hasTransport = has('transport');
    const hasGalley = has('galley');
    const hasTrireme = has('trireme');
    const hasQuinquereme = has('quinquereme');
    const hasSiege = has('siege');
    const totalCombat = count('galley') + count('trireme') + count('quinquereme') + count('siege');
    const totalSupport = count('scout') + count('transport');

    if (hasSiege && !hasQuinquereme && !hasTrireme && !hasGalley && !hasScout && !hasTransport) return battleGroupName('SiegeSquadron');
    if (hasQuinquereme && !hasTrireme && !hasGalley && !hasSiege && !hasScout && !hasTransport) return battleGroupName('HeavySquadron');
    if (hasTrireme && !hasQuinquereme && !hasGalley && !hasSiege && !hasScout && !hasTransport) return battleGroupName('BattleSquadron');
    if (hasGalley && !hasTrireme && !hasQuinquereme && !hasSiege && !hasScout && !hasTransport) return battleGroupName('GalleySquadron');
    if (hasScout && !hasTransport && !hasGalley && !hasTrireme && !hasQuinquereme && !hasSiege) return battleGroupName('ScoutScreen');
    if (hasTransport && !hasScout && !hasGalley && !hasTrireme && !hasQuinquereme && !hasSiege) return battleGroupName('TransportSquadron');
    if (hasSiege && totalCombat > count('siege') && totalSupport === 0) return battleGroupName('BombardmentSquadron');
    if (hasQuinquereme && hasTrireme && !hasGalley && !hasSiege && totalSupport === 0) return battleGroupName('CapitalSquadron');
    if (hasQuinquereme && hasGalley && !hasTrireme && !hasSiege && totalSupport === 0) return battleGroupName('MixedHeavySquadron');
    if (hasTrireme && hasGalley && !hasQuinquereme && !hasSiege && totalSupport === 0) return battleGroupName('PatrolSquadron');
    if (hasQuinquereme && hasTrireme && hasGalley && !hasSiege && totalSupport === 0) return battleGroupName('CombinedSquadron');

    if (hasTransport && totalCombat > 0 && !hasScout) {
      if (hasQuinquereme) return battleGroupName('EscortedConvoy');
      if (hasTrireme) return battleGroupName('ProtectedTransportSquadron');
      return battleGroupName('ConvoyEscort');
    }

    if (hasScout && totalCombat > 0 && !hasTransport) {
      if (hasQuinquereme || hasTrireme) return battleGroupName('VanguardSquadron');
      return battleGroupName('ReconnaissanceSquadron');
    }

    if (hasScout && hasTransport && totalCombat > 0) {
      if (hasQuinquereme) return battleGroupName('ExpeditionarySquadron');
      if (hasTrireme) return battleGroupName('TaskSquadron');
      return battleGroupName('SupportSquadron');
    }

    if (hasScout && hasTransport && totalCombat === 0) return battleGroupName('AuxiliarySquadron');
    return battleGroupName('Squadron');
  }

  const infantryCount = count('infantry');
  const rangedCount = count('ranged');
  const cavalryCount = count('cavalry');
  const hasInfantry = infantryCount > 0;
  const hasRanged = rangedCount > 0;
  const hasCavalry = cavalryCount > 0;
  const hasSiege = has('siege');
  const hasSpecial = has('special');

  if (hasSpecial) {
    if (!hasInfantry && !hasRanged && !hasCavalry && !hasSiege) return battleGroupName('EliteCohort');
    if (hasInfantry && !hasRanged && !hasCavalry) return battleGroupName('EliteInfantryCohort');
    if (hasCavalry && !hasInfantry && !hasRanged) return battleGroupName('EliteCavalryWing');
    return battleGroupName('EliteDetachment');
  }

  if (hasSiege && !hasInfantry && !hasRanged && !hasCavalry) return battleGroupName('SiegeBattery');
  if (hasInfantry && !hasRanged && !hasCavalry && !hasSiege) return battleGroupName('InfantryCohort');
  if (hasRanged && !hasInfantry && !hasCavalry && !hasSiege) return battleGroupName('ArcherLine');
  if (hasCavalry && !hasInfantry && !hasRanged && !hasSiege) return battleGroupName('CavalryWing');

  if (hasInfantry && hasRanged && !hasCavalry && !hasSiege) {
    return rangedCount > infantryCount ? battleGroupName('ArcherCohort') : battleGroupName('CompositeCohort');
  }
  if (hasInfantry && hasCavalry && !hasRanged && !hasSiege) {
    return cavalryCount > infantryCount ? battleGroupName('MountedWing') : battleGroupName('CombinedArmsCohort');
  }
  if (hasRanged && hasCavalry && !hasInfantry && !hasSiege) return battleGroupName('HorseArcherWing');
  if (hasSiege && hasInfantry && !hasRanged && !hasCavalry) return battleGroupName('SiegeInfantryCohort');
  if (hasSiege && hasRanged && !hasInfantry && !hasCavalry) return battleGroupName('ArtilleryBattery');
  if (hasSiege && hasCavalry && !hasInfantry && !hasRanged) return battleGroupName('MobileBattery');
  if (hasSiege && hasInfantry && hasRanged && !hasCavalry) return battleGroupName('SiegeSupportCohort');
  if (hasSiege && hasInfantry && hasCavalry && !hasRanged) return battleGroupName('AssaultColumn');
  if (hasSiege && hasRanged && hasCavalry && !hasInfantry) return battleGroupName('MobileArtilleryColumn');

  if (hasInfantry && hasRanged && hasCavalry && !hasSiege) {
    if (cavalryCount > infantryCount + rangedCount) return battleGroupName('CavalryHeavyCohort');
    if (rangedCount > infantryCount + cavalryCount) return battleGroupName('RangedHeavyCohort');
    if (infantryCount > rangedCount + cavalryCount) return battleGroupName('InfantryHeavyCohort');
    return battleGroupName('BalancedCohort');
  }

  if (hasSiege && hasInfantry && hasRanged && hasCavalry) return battleGroupName('GrandCohort');
  return battleGroupName('Detachment');
}
