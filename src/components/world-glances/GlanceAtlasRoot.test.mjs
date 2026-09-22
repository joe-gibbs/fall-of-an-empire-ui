import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const atlasSource = readFileSync(join(dir, 'GlanceAtlasRoot.tsx'), 'utf8');
const stackCss = readFileSync(join(dir, '../notifications/NotificationStack.css'), 'utf8');

function notificationPlateMarkup() {
  const marker = 'glance-atlas-notification-plate';
  const markerIndex = atlasSource.indexOf(marker);
  assert.ok(markerIndex >= 0, 'missing notification atlas plate class');
  return atlasSource.slice(markerIndex, markerIndex + 800);
}

test('world notification atlas plates mark the slot as the Webkiln hit target so the X is not the only clickable rect', () => {
  const plate = notificationPlateMarkup();
  const hitIndex = plate.indexOf('data-webkiln-anchor-hit');
  const bannerIndex = plate.indexOf('<NotificationBanner');
  assert.ok(hitIndex >= 0, 'notification plates need data-webkiln-anchor-hit');
  assert.ok(bannerIndex > hitIndex, 'the hit target must wrap the banner, including the close button');
});

test('native composite overlay does not steal pointer hits from world notification atlas plates', () => {
  assert.match(
    stackCss,
    /:root\.native-glance-composite[\s\S]{0,400}settlement-notification-slot[\s\S]{0,200}pointer-events:\s*none/,
  );
});
