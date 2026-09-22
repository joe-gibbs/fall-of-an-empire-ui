import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendBuildingUnlockRequirements } from './buildingUnlockRequirements.ts';

const strings = {
  'Encyclopedia.Faith': 'Faith',
  'Encyclopedia.FaithRequirement': 'You can build this where this faith is the local majority, or where it is your state religion.',
  'Encyclopedia.RequiredSettlement': 'Only in {Name}',
  'Common.Requirements': 'Requirements',
};

function t(key, args) {
  return (strings[key] ?? key).replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => (
    args && args[name] != null ? String(args[name]) : match
  ));
}

function sectionAfter(lines, header) {
  const start = lines.findIndex(line => line.isHeader && line.label === header);
  assert.ok(start >= 0, `missing ${header} header`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.isHeader);
  return end < 0 ? rest : rest.slice(0, end);
}

test('faith and settlement unlocks sit under Requirements, after the faith name', () => {
  const lines = [{ label: 'Category', value: 'Religious' }];
  appendBuildingUnlockRequirements(lines, {
    religionName: 'Eisenschwur',
    religionIcon: '/assets/religions/eisenschwur.png',
    requiredSettlementName: 'Ironhold',
  }, t);

  assert.equal(lines[1].label, 'Faith');
  assert.equal(lines[1].value, 'Eisenschwur');
  assert.equal(lines[1].isHeader, undefined);

  const requirements = sectionAfter(lines, 'Requirements');
  assert.equal(requirements[0].label, 'You can build this where this faith is the local majority, or where it is your state religion.');
  assert.equal(requirements[1].label, 'Only in Ironhold');
  assert.ok(!lines.slice(0, lines.findIndex(line => line.isHeader)).some(line =>
    String(line.label).includes('local majority') || String(line.label).includes('Only in Ironhold')));
});
