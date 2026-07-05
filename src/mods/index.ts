import { bridgeCall } from '../bridge-types.generated.ts';
import { registerAssetOverride } from '../utils/assets';
import { joinGameLocalResourceUrl } from '../utils/localResourceUrl';

/**
 * Runtime mod loader.
 *
 * At boot this fetches `/mods/manifest.json` and loads every entry URL it
 * lists as a classic script. Each mod is a standalone file on disk, not part
 * of the main bundle and not known to Vite at the main app's build time.
 *
 * Mod contract:
 *   - The entry file is served as a classic script.
 *   - It uses `globalThis.FOAE` for React, components, hooks, and the
 *     registry. It does NOT `import` anything, because there is no
 *     bundler in the loop.
 *   - Its top-level code calls `FOAE.registry.register*()` to add
 *     screens / sidebars / topbar buttons. Those calls fire as a side
 *     effect of loading the script.
 *
 * Manifest shape (a JSON array):
 *   [
 *     { "name": "sample", "entry": "/mods/sample/index.js", "styles": ["/mods/sample/style.css"] }
 *   ]
 *
 * `main.tsx` awaits `modsReady` before rendering so registrations land
 * in the registry before the first paint.
 *
 * Deployment notes:
 *   - In dev, files under `WebUI/public/mods/` are served at `/mods/...`
 *     by Vite. The dev loop is "drop a file, refresh".
 *   - In the shipped game, `public/` contents are packaged and served by
 *     the native web UI host. To support true third-party drop-in mods from
 *     `<GameDir>/Mods/`, the C++ side needs to (a) scan that directory,
 *     (b) expose the files through the host (custom URL scheme or a small HTTP
 *     server), and (c) build the manifest JSON dynamically via a bridge
 *     call. The JS-side loader below doesn't change - it just fetches
 *     the manifest URL it's given.
 */

interface ModManifestEntry {
  /** Human-readable identifier for logs. Not used for registry keying. */
  name: string;
  /** URL of the mod's classic-script entry file. */
  entry: string;
  /** Optional CSS files to inject via <link> before the entry runs. */
  styles?: string[];
}

interface ContentPackWebUIEntry {
  id?: string;
  script?: string;
}

interface ContentPackWebUIPack {
  id?: string;
  name?: string;
  resourceBaseUrl?: string;
  rootPath?: string;
  styles?: string[];
  assetOverrides?: Record<string, string>;
  entries?: ContentPackWebUIEntry[];
}

interface ContentPackWebUIManifest {
  packs?: ContentPackWebUIPack[];
}

const MANIFEST_URL = '/mods/manifest.json';
const CONTENT_PACK_MANIFEST_RETRY_MS = 2500;
const CONTENT_PACK_MANIFEST_RETRY_INTERVAL_MS = 100;

function loadJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Cache-Control', 'no-store');
    request.onreadystatechange = () => {
      if (request.readyState !== XMLHttpRequest.DONE) return;
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`HTTP ${request.status.toString()}`));
        return;
      }
      try {
        resolve(JSON.parse(request.responseText));
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(new Error('manifest request failed'));
    request.send();
  });
}

async function fetchManifest(): Promise<ModManifestEntry[]> {
  try {
    const parsed = await loadJson(MANIFEST_URL);
    if (!Array.isArray(parsed)) {
      console.warn(`[mods] ${MANIFEST_URL} did not parse as an array; ignoring`);
      return [];
    }
    return parsed as ModManifestEntry[];
  } catch {
    // No manifest is a valid state - means no mods are installed.
    return [];
  }
}

function isContentPackManifest(value: unknown): value is ContentPackWebUIManifest {
  return !!value && typeof value === 'object' && Array.isArray((value as ContentPackWebUIManifest).packs);
}

function contentPackManifestHasWebUISurface(value: ContentPackWebUIManifest): boolean {
  return (value.packs ?? []).some(pack => (
    (pack.styles?.length ?? 0) > 0
    || Object.keys(pack.assetOverrides ?? {}).length > 0
    || (pack.entries?.length ?? 0) > 0
  ));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function pathBaseName(path: string | undefined): string {
  if (!path) return '';
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

async function fetchContentPackManifestOnce(): Promise<ContentPackWebUIManifest | null> {
  try {
    const response = await bridgeCall('game.get_content_pack_webui_manifest');
    const parsed = JSON.parse(response.manifestJson) as unknown;
    return isContentPackManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchContentPackManifest(): Promise<ModManifestEntry[]> {
  const startedAt = Date.now();
  let parsed: ContentPackWebUIManifest | null = null;
  do {
    parsed = await fetchContentPackManifestOnce();
    if (parsed && contentPackManifestHasWebUISurface(parsed)) {
      break;
    }
    await delay(CONTENT_PACK_MANIFEST_RETRY_INTERVAL_MS);
  } while (Date.now() - startedAt < CONTENT_PACK_MANIFEST_RETRY_MS);

  if (!parsed) return [];

  const entries: ModManifestEntry[] = [];
  for (const pack of parsed.packs ?? []) {
    const fallbackBase = pack.id
      ? `http://foae.local/foae-mods/${pathBaseName(pack.rootPath) || pack.id}`
      : '';
    const baseUrl = pack.resourceBaseUrl || fallbackBase;
    if (!baseUrl) continue;

    const styles = (pack.styles ?? [])
      .map(style => joinGameLocalResourceUrl(baseUrl, style))
      .filter(Boolean);

    for (const [sourcePath, targetPath] of Object.entries(pack.assetOverrides ?? {})) {
      registerAssetOverride(sourcePath, joinGameLocalResourceUrl(baseUrl, targetPath));
    }

    for (const entry of pack.entries ?? []) {
      if (!entry.script) continue;
      entries.push({
        name: pack.name ?? pack.id ?? entry.id ?? entry.script,
        entry: joinGameLocalResourceUrl(baseUrl, entry.script),
        styles,
      });
    }
  }
  return entries;
}

function injectStyles(hrefs: string[]): void {
  for (const href of hrefs) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

async function loadOne(mod: ModManifestEntry): Promise<void> {
  if (mod.styles?.length) injectStyles(mod.styles);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = mod.entry;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${mod.entry}`));
    document.head.appendChild(script);
  });
}

async function loadMods(): Promise<void> {
  if (import.meta.env.DEV && (import.meta.env.MODE === 'mock' || new URLSearchParams(window.location.search).has('mock'))) {
    return;
  }

  const manifest = await fetchManifest();
  const contentPackManifest = await fetchContentPackManifest();
  const byEntry = new Map<string, ModManifestEntry>();
  [...manifest, ...contentPackManifest].forEach(mod => {
    if (mod.entry) byEntry.set(mod.entry, mod);
  });
  const allMods = Array.from(byEntry.values());
  if (allMods.length === 0) return;

  const loaded: string[] = [];
  const failed: { name: string; error: unknown }[] = [];

  // Load in parallel. Each mod's registrations are idempotent and keyed
  // by id, so ordering only matters when two mods claim the same id -
  // the one that resolves last wins, same rule as the static path.
  await Promise.all(allMods.map(async (mod) => {
    try {
      await loadOne(mod);
      loaded.push(mod.name);
    } catch (e) {
      failed.push({ name: mod.name, error: e });
    }
  }));

  if (loaded.length > 0) {
    console.log(`[mods] loaded: ${loaded.join(', ')}`);
  }
  for (const f of failed) {
    console.error(`[mods] failed to load ${f.name}:`, f.error);
  }
}

/**
 * Promise that resolves once every mod the manifest listed has been
 * loaded (successfully or not - a single broken mod does not block
 * the others). `main.tsx` awaits this before rendering.
 */
export const modsReady: Promise<void> = loadMods();
