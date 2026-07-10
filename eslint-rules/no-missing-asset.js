/**
 * Custom ESLint rule: flag string literals referencing packaged public files
 * that don't resolve to a real file under `WebUI/public/`.
 *
 * Rationale: silent missing-asset regressions are how we ended up with broken
 * image glyphs in the UI. The linter scans every string literal in source
 * (not just JSX `src` attributes) so paths tucked inside object literals,
 * lookup maps, fallback expressions, or CSS `url(...)` strings all get
 * checked.
 *
 * What it does:
 *   - Every `'...'` / `"..."` string literal and every no-interpolation
 *     template literal is scanned for `/assets/<path>.<ext>` and
 *     `/mods/<path>.<ext>` occurrences.
 *   - Each hit is resolved against `WebUI/public/` and flagged if absent.
 *
 * Limits:
 *   - String literals with interpolation (`` `/assets/${id}.png` ``) are not
 *     checked — they're inherently dynamic. Bridge maps that build asset
 *     URLs from ids (e.g. `useSettlementBridge`) fall into this bucket.
 *   - Only file extensions typical of UI assets and static manifests are
 *     matched (.png, .jpg, .jpeg, .gif, .svg, .webp, .ico, .mp3, .wav, .ogg,
 *     .json).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_DIR = path.resolve(__dirname, '..', '..');
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const PERSON_INTERACTIONS_DIR = path.join(PROJECT_DIR, 'Script', 'Characters', 'Interactions');
const PERSON_INTERACTION_BRIDGE_FILE = path.normalize(path.join('src', 'bridge', 'usePersonInteractionsBridge.ts'));

const PUBLIC_FILE_RE = /\/(?:assets|mods)\/[A-Za-z0-9_\-./]+\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp3|wav|ogg|json)/g;
const PERSON_INTERACTION_KEY_RE = /default\s+Key\s*=\s*n"([^"]+)"/;

const fileExistsCache = new Map();
function fileExists(absPath) {
  if (fileExistsCache.has(absPath)) return fileExistsCache.get(absPath);
  const exists = fs.existsSync(absPath);
  fileExistsCache.set(absPath, exists);
  return exists;
}

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

let missingPersonInteractionBackgroundsCache = null;

function collectMissingPersonInteractionBackgrounds() {
  if (missingPersonInteractionBackgroundsCache) {
    return missingPersonInteractionBackgroundsCache;
  }

  if (!fs.existsSync(PERSON_INTERACTIONS_DIR)) {
    missingPersonInteractionBackgroundsCache = [];
    return missingPersonInteractionBackgroundsCache;
  }

  const missing = [];
  for (const entry of fs.readdirSync(PERSON_INTERACTIONS_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.as')) {
      continue;
    }

    const filePath = path.join(PERSON_INTERACTIONS_DIR, entry.name);
    const text = fs.readFileSync(filePath, 'utf8');
    const match = PERSON_INTERACTION_KEY_RE.exec(text);
    if (!match) {
      continue;
    }

    const key = match[1];
    const assetPath = `/assets/events/interaction-${toKebabCase(key)}.png`;
    if (!fileExists(path.join(PUBLIC_DIR, assetPath))) {
      missing.push({ key, assetPath });
    }
  }

  missingPersonInteractionBackgroundsCache = missing;
  return missingPersonInteractionBackgroundsCache;
}

function isPersonInteractionBridgeFile(filename) {
  return path.normalize(filename).endsWith(PERSON_INTERACTION_BRIDGE_FILE);
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow references to /assets/... paths that do not exist under WebUI/public.',
    },
    messages: {
      missing:
        'Public file `{{path}}` does not exist under WebUI/public. Either add the source asset or fix the path.',
      missingPersonInteractionBackground:
        'Generated person interaction background `{{path}}` is missing for interaction key `{{key}}`.',
    },
    schema: [],
  },

  create(context) {
    function checkString(node, raw) {
      if (typeof raw !== 'string') return;
      // Bail fast on the common case.
      if (!raw.includes('/assets/') && !raw.includes('/mods/')) return;

      PUBLIC_FILE_RE.lastIndex = 0;
      let match;
      while ((match = PUBLIC_FILE_RE.exec(raw)) !== null) {
        const assetPath = match[0];
        const cleaned = assetPath.split('?')[0].split('#')[0];
        const absPath = path.join(PUBLIC_DIR, cleaned);
        if (!fileExists(absPath)) {
          context.report({ node, messageId: 'missing', data: { path: cleaned } });
        }
      }
    }

    return {
      Program(node) {
        if (!isPersonInteractionBridgeFile(context.filename)) return;
        for (const { key, assetPath } of collectMissingPersonInteractionBackgrounds()) {
          context.report({
            node,
            messageId: 'missingPersonInteractionBackground',
            data: { key, path: assetPath },
          });
        }
      },
      Literal(node) {
        if (typeof node.value !== 'string') return;
        checkString(node, node.value);
      },
      TemplateLiteral(node) {
        // Only no-interpolation templates are statically resolvable.
        if (node.expressions.length > 0) return;
        if (node.quasis.length !== 1) return;
        checkString(node, node.quasis[0].value.cooked);
      },
    };
  },
};

export default rule;
