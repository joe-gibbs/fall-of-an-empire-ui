import assert from 'node:assert/strict';
import { test } from 'node:test';
import { victoryMapProvinces, victoryMapBounds, victoryMapBorders } from '../src/components/screens/campaign/victoryMap.ts';
import { victoryProvinceAt } from '../src/components/screens/campaign/victoryMapRenderer.ts';

const map = { provinces: [
  { provinceIndex: 0, fillPath: 'M0 0h10v10h-10Z', borderPath: '', minX: 0, minY: 0, maxX: 10, maxY: 10 },
  { provinceIndex: 1, fillPath: 'M100 80h10v10h-10Z', borderPath: '', minX: 100, minY: 80, maxX: 110, maxY: 90 },
  { provinceIndex: 2, fillPath: 'M200 0h10v10h-10Z', borderPath: '', minX: 200, minY: 0, maxX: 210, maxY: 10 },
] };
const victory = {
  tiers: [
    { id: 'bronze', conditions: [{ id: 'bronze-land', domains: [{ provinceIndices: [0] }] }] },
    { id: 'silver', conditions: [{ id: 'silver-land', domains: [{ provinceIndices: [0, 1] }] }] },
  ],
  settlements: [
    { provinceIndex: 0, name: 'A', isControlled: true },
    { provinceIndex: 1, name: 'B', isControlled: false },
    { provinceIndex: 2, name: 'C', isControlled: true },
  ],
};

test('shared conquest targets retain every tier and requirement alongside current control', () => {
  const provinces = victoryMapProvinces(victory, map);
  assert.deepEqual(provinces.map(p => [p.provinceIndex, p.tierIndices, p.conditionIds, p.isControlled]), [
    [0, [0, 1], ['bronze-land', 'silver-land'], true],
    [1, [1], ['silver-land'], false],
    [2, [], [], true],
  ]);
});

test('initial framing includes every conquest target and controlled province', () => {
  assert.deepEqual(victoryMapBounds(victoryMapProvinces(victory, map)), { minX: 0, minY: 0, maxX: 210, maxY: 90 });
});

test('focusing a requirement includes all its targets, including places already controlled', () => {
  const provinces = victoryMapProvinces(victory, map).filter(p => p.conditionIds.includes('silver-land'));
  assert.deepEqual(victoryMapBounds(provinces), { minX: 0, minY: 0, maxX: 110, maxY: 90 });
});

test('a count-only victory frames current holdings without inventing conquest targets', () => {
  const provinces = victoryMapProvinces({ ...victory, tiers: [{ id: 'generic', conditions: [{ id: 'count', domains: [] }] }] }, map);
  assert.deepEqual(provinces.map(p => p.provinceIndex), [0, 2]);
  assert.equal(victoryMapBounds([]), null);
});

test('earned migration stages stop marking lost territory as a future goal', () => {
  const achieved = { ...victory, tiers: victory.tiers.map(tier => ({...tier, isAchieved:true})),
    settlements: victory.settlements.map(settlement => ({...settlement, isControlled:settlement.provinceIndex === 2})) };
  assert.deepEqual(victoryMapProvinces(achieved, map).map(province => province.provinceIndex), [2]);
});

test('borders follow geographic tiers and the outer edges of holdings and future goals', () => {
  const provinces = [
    { provinceIndex: 0, regionId:'a', landId:'x', domainId:'d', isControlled:true, tierIndices:[0,1] },
    { provinceIndex: 1, regionId:'a', landId:'x', domainId:'d', isControlled:true, tierIndices:[1] },
    { provinceIndex: 2, regionId:'b', landId:'x', domainId:'d', isControlled:false, tierIndices:[1] },
    { provinceIndex: 3, regionId:'c', landId:'y', domainId:'d', isControlled:false, tierIndices:[2] },
    { provinceIndex: 4, regionId:'e', landId:'z', domainId:'f', isControlled:false, tierIndices:[2] },
  ];
  const map = { provinces, borderSegments:[
    {provinceIndex:0,adjacentProvinceIndex:-1,path:'coast'},
    {provinceIndex:0,adjacentProvinceIndex:1,path:'internal'},
    {provinceIndex:1,adjacentProvinceIndex:2,path:'region'},
    {provinceIndex:2,adjacentProvinceIndex:3,path:'land'},
    {provinceIndex:3,adjacentProvinceIndex:4,path:'domain'},
  ]};
  // Segment indices: 0 coast, 1 internal, 2 region, 3 land, 4 domain.
  const borders = victoryMapBorders(map, provinces, 3);
  assert.deepEqual(borders.regions, [0, 2, 3, 4]);
  assert.deepEqual(borders.lands, [0, 3, 4]);
  assert.deepEqual(borders.domains, [0, 4]);
  assert.deepEqual(borders.held, [0, 2]);
  assert.deepEqual(borders.goals, [[0, 1], [0, 3], [3]]);
  const heldOnly = victoryMapBorders(map, provinces.slice(0, 2), 3);
  assert.deepEqual(heldOnly.domains, [0, 4], 'geographic context also draws beyond holdings and goals');
  assert.deepEqual(heldOnly.held, [0, 2]);
});

test('hovering finds the province under the cursor, respecting holes and relative path commands', () => {
  const map = { provinces: [], borderSegments: [] };
  const ring = { provinceIndex: 0, name: 'Ring', fillPath: 'M0 0H10V10H0Z M3 3V7H7V3Z', minX: 0, minY: 0, maxX: 10, maxY: 10,
    isControlled: false, tierIndices: [0], conditionIds: [] };
  const island = { provinceIndex: 1, name: 'Island', fillPath: 'M20 0h5v5h-5Z', minX: 20, minY: 0, maxX: 25, maxY: 5,
    isControlled: true, tierIndices: [], conditionIds: [] };
  assert.equal(victoryProvinceAt(map, [ring, island], 1, 1)?.name, 'Ring');
  assert.equal(victoryProvinceAt(map, [ring, island], 5, 5), null, 'the hole belongs to no province');
  assert.equal(victoryProvinceAt(map, [ring, island], 22, 3)?.name, 'Island');
  assert.equal(victoryProvinceAt(map, [ring, island], 15, 3), null);
});
