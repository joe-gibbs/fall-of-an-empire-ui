import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupPendingFormationUnits } from './pendingFormationProgress.ts';

function pendingUnit(overrides = {}) {
  return {
    unitId: 'ArmigeriProtectores',
    settlementId: 'siftis',
    settlementName: 'Siftis',
    locationLabel: 'Being built at Siftis',
    name: 'Palace Guard',
    portrait: '/assets/units/Rephsian/I_Rephsian_ArmigeriProtectores.png',
    type: 'infantry',
    tier: 1,
    progressAtSnapshot: 0.6,
    dailyProgress: 0.02,
    snapshotDate: 20,
    expiresOnDate: 40,
    ...overrides,
  };
}

test('uses the template unit definition when the class is already in the roster', () => {
  const unit = pendingUnit();
  const roster = new Map([[unit.unitId, {
    id: unit.unitId,
    assetKey: unit.unitId,
    name: 'Roster Palace Guard',
    description: 'Household infantry.',
    portrait: '/assets/units/roster.png',
    type: 'infantry',
    tier: 2,
    price: 80,
    buildTime: 40,
    upkeep: 12,
    foodConsumption: 1,
    maxStrength: 200,
    speed: 4,
    attackSpeed: 1,
    damage: { pierce: 1, crush: 0, slash: 2 },
    armour: { pierce: 1, crush: 1, slash: 1 },
    resourceCost: [],
  }]]);

  const groups = groupPendingFormationUnits([unit], roster, 20);

  assert.equal(groups[0].definition.name, 'Roster Palace Guard');
  assert.equal(groups[0].hasFullDefinition, true);
});

test('groups household recruitment even when the unit is missing from formation templates', () => {
  const groups = groupPendingFormationUnits([
    pendingUnit(),
    pendingUnit({ locationLabel: 'Queued at Siftis', dailyProgress: 0, progressAtSnapshot: 0 }),
  ], new Map(), 20);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].definition.name, 'Palace Guard');
  assert.equal(groups[0].definition.portrait, '/assets/units/Rephsian/I_Rephsian_ArmigeriProtectores.png');
  assert.equal(groups[0].definition.assetKey, 'ArmigeriProtectores');
  assert.equal(groups[0].hasFullDefinition, false);
  assert.equal(groups[0].locationLabel, 'Being built at Siftis');
  assert.equal(groups[0].progressTotal, 0.6); // first company at 60%, second still queued at 0%
});
