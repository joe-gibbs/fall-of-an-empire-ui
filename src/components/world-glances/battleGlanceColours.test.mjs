import assert from 'node:assert/strict';
import { test } from 'node:test';
import { battleGlanceSideColours } from './battleGlanceColours.ts';

const NEUTRAL_RELATION_COLOUR = 'var(--diplo-relation-neutral)';
const ENEMY_RELATION_COLOUR = 'var(--diplo-relation-war)';

test('a third-party battle paints each side with its faction colour', () => {
  const colours = battleGlanceSideColours(
    { colour: '#2e5a9c', relation: 'neutral' },
    { colour: '#8b1a1a', relation: 'neutral' },
  );
  assert.equal(colours.attacker, '#2e5a9c');
  assert.equal(colours.defender, '#8b1a1a');
  assert.notEqual(colours.attacker, colours.defender);
  assert.notEqual(colours.attacker, NEUTRAL_RELATION_COLOUR);
  assert.notEqual(colours.defender, NEUTRAL_RELATION_COLOUR);
});

test('two enemies of the player stay distinct by faction colour', () => {
  const colours = battleGlanceSideColours(
    { colour: '#2e5a9c', relation: 'enemy' },
    { colour: '#8b1a1a', relation: 'enemy' },
  );
  assert.equal(colours.attacker, '#2e5a9c');
  assert.equal(colours.defender, '#8b1a1a');
  assert.notEqual(colours.attacker, ENEMY_RELATION_COLOUR);
});
