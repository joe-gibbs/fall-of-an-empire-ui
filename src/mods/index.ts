import { bridgeCall, onBridgeEvent, type GetContentPackWebUIManifestResponse } from '../bridge-types.generated.ts';
import { getRuntimeEngine } from '../bridge/core/runtimeEngine';
import { registerModPoCatalogues } from '../localization/modPoText';
import { registerAssetOverride, registerContentPackAssetPaths } from '../utils/assets';
import { joinGameLocalResourceUrl } from '../utils/localResourceUrl';

/** Loads active content-pack UI entries supplied by the game bridge. */

interface ContentPackScriptEntry {
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
  localization?: string;
  assetOverrides?: Record<string, string>;
  assetPaths?: string[];
  entries?: ContentPackWebUIEntry[];
}

interface ContentPackWebUIManifest {
  packs?: ContentPackWebUIPack[];
}

const loadedModEntries = new Set<string>();

function isContentPackManifest(value: unknown): value is ContentPackWebUIManifest {
  return !!value && typeof value === 'object' && Array.isArray((value as ContentPackWebUIManifest).packs);
}

function parseContentPackManifest(response: GetContentPackWebUIManifestResponse): ContentPackWebUIManifest | null {
  try {
    const parsed = JSON.parse(response.manifestJson) as unknown;
    return isContentPackManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function contentPackManifestEntries(parsed: ContentPackWebUIManifest): ContentPackScriptEntry[] {
  const entries: ContentPackScriptEntry[] = [];
  for (const pack of parsed.packs ?? []) {
    const baseUrl = pack.resourceBaseUrl || '';
    if (!baseUrl) continue;

    const styles = (pack.styles ?? [])
      .map(style => joinGameLocalResourceUrl(baseUrl, style))
      .filter(Boolean);
    const localizationPath = pack.localization;
    if (localizationPath) {
      registerModPoCatalogues([{
        packId: pack.id ?? pack.name ?? baseUrl,
        urlPattern: joinGameLocalResourceUrl(baseUrl, localizationPath),
      }]);
    }

    registerContentPackAssetPaths(baseUrl, pack.assetPaths ?? []);

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

/**
 * Resolves once the Webkiln bridge is callable.
 *
 * `window.gameUI` is installed with the rest of the runtime scripts when the document finishes
 * loading, so bridge calls made while the page is still parsing have nothing to talk to. The
 * runtime announces itself with `webkiln:runtime-ready`; outside the game (dev server, mock mode)
 * that event never fires and this never resolves, so only background work may await it.
 */
function whenBridgeAvailable(): Promise<void> {
  if (getRuntimeEngine()) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    window.addEventListener('webkiln:runtime-ready', () => resolve(), { once: true });
  });
}

/**
 * Loads content-pack UI once the bridge is up. This runs off the boot path because the manifest
 * needs the bridge: the pack entries register after the first paint, the same way they do when
 * `game.get_content_pack_webui_manifest` arrives as a change event.
 */
async function loadContentPackMods(): Promise<void> {
  await whenBridgeAvailable();
  try {
    const parsed = parseContentPackManifest(await bridgeCall('game.get_content_pack_webui_manifest'));
    if (parsed) {
      await loadModManifestEntries(contentPackManifestEntries(parsed));
    }
  } catch (error) {
    console.error('[mods] failed to load content-pack manifest:', error);
  }
}

function injectStyles(hrefs: string[]): void {
  for (const href of hrefs) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

async function loadOne(mod: ContentPackScriptEntry): Promise<void> {
  if (mod.styles?.length) injectStyles(mod.styles);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = mod.entry;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${mod.entry}`));
    document.head.appendChild(script);
  });
}

async function loadModManifestEntries(mods: ContentPackScriptEntry[]): Promise<boolean> {
  const pendingMods = mods.filter(mod => mod.entry && !loadedModEntries.has(mod.entry));
  if (pendingMods.length === 0) {
    return false;
  }

  const loaded: string[] = [];
  const failed: { name: string; error: unknown }[] = [];

  await Promise.all(pendingMods.map(async (mod) => {
    try {
      await loadOne(mod);
      loadedModEntries.add(mod.entry);
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

  return loaded.length > 0;
}

async function loadMods(): Promise<void> {
  if (import.meta.env.DEV && (import.meta.env.MODE === 'mock' || new URLSearchParams(window.location.search).has('mock'))) {
    return;
  }

  await loadContentPackMods();
}

onBridgeEvent('game.get_content_pack_webui_manifest', (response) => {
  const parsed = parseContentPackManifest(response);
  if (parsed) {
    void loadModManifestEntries(contentPackManifestEntries(parsed));
  }
});

/** Resolves after content-pack asset aliases and UI entries have been registered. */
export const modsReady: Promise<void> = loadMods();
