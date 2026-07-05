import { isGameLocalResourceUrl } from './localResourceUrl';

const OPTIMISED_ASSET_EXT = /\.(png|jpe?g)([?#].*)?$/i;
const SIZABLE_ASSET_EXT = /\.(png|jpe?g|webp)([?#].*)?$/i;
const SIZED_ASSET_FAMILIES = new Set(['icons']);
export const SIZED_ASSET_BUCKETS = [16, 24, 32, 48, 64, 96, 128, 192, 256] as const;
const BASE_GAME_ASSET_URL_PREFIX = 'coui://foae/assets/';
const HTTP_LOCAL_MODS_PREFIX = 'http://foae.local/foae-mods/';
const assetOverrides = new Map<string, string>();

function shouldUseOptimisedAsset(path: string): boolean {
  return path.startsWith('/assets/')
    || path.startsWith(BASE_GAME_ASSET_URL_PREFIX)
    || ((path.startsWith('coui://foae-mods/') || path.startsWith(HTTP_LOCAL_MODS_PREFIX)) && path.indexOf('/dist/assets/') >= 0);
}

export function registerAssetOverride(sourcePath: string, targetPath: string): void {
  if (!sourcePath || !targetPath) return;
  if (!isGameLocalResourceUrl(targetPath)) return;
  assetOverrides.set(sourcePath, targetPath);
}

function baseAssetPathFromUrl(path: string): string | undefined {
  if (!path.startsWith(BASE_GAME_ASSET_URL_PREFIX)) return undefined;
  return `/assets/${path.slice(BASE_GAME_ASSET_URL_PREFIX.length)}`;
}

function assetOverrideForPath(path: string): string | undefined {
  const override = assetOverrides.get(path);
  if (override) return override;

  const baseAssetPath = baseAssetPathFromUrl(path);
  if (!baseAssetPath) return undefined;

  return assetOverrides.get(baseAssetPath);
}

function splitQuery(path: string): { base: string; query: string } {
  const queryIndex = path.search(/[?#]/);
  if (queryIndex < 0) return { base: path, query: '' };
  return {
    base: path.slice(0, queryIndex),
    query: path.slice(queryIndex),
  };
}

function sizedAssetRoot(path: string): { prefix: string; assetRest: string } | undefined {
  if (path.startsWith('/assets/')) {
    return { prefix: '/assets/', assetRest: path.slice('/assets/'.length) };
  }

  if (path.startsWith(BASE_GAME_ASSET_URL_PREFIX)) {
    return {
      prefix: BASE_GAME_ASSET_URL_PREFIX,
      assetRest: path.slice(BASE_GAME_ASSET_URL_PREFIX.length),
    };
  }

  const modAssetsSegment = '/dist/assets/';
  const modAssetsIndex = path.indexOf(modAssetsSegment);
  if ((path.startsWith('coui://foae-mods/') || path.startsWith(HTTP_LOCAL_MODS_PREFIX)) && modAssetsIndex >= 0) {
    const prefixEnd = modAssetsIndex + modAssetsSegment.length;
    return {
      prefix: path.slice(0, prefixEnd),
      assetRest: path.slice(prefixEnd),
    };
  }

  if (path.startsWith('/mods/') && modAssetsIndex >= 0) {
    const prefixEnd = modAssetsIndex + modAssetsSegment.length;
    return {
      prefix: path.slice(0, prefixEnd),
      assetRest: path.slice(prefixEnd),
    };
  }

  return undefined;
}

function unsizedAssetPath(path: string): string {
  const { base, query } = splitQuery(path);
  const root = sizedAssetRoot(base);
  if (!root) return path;

  const parts = root.assetRest.split('/');
  if (parts.length < 4 || parts[1] !== '__sizes') return path;

  return `${root.prefix}${parts[0]}/${parts.slice(3).join('/')}${query}`;
}

function sizedAssetBucket(displaySizePx: number): number | undefined {
  if (!Number.isFinite(displaySizePx) || displaySizePx <= 0) return undefined;
  for (const bucket of SIZED_ASSET_BUCKETS) {
    if (displaySizePx <= bucket) return bucket;
  }
  return undefined;
}

export function normaliseSizedAssetSource(path: string): string {
  return unsizedAssetPath(path);
}

export function isSizableAssetPath(path: string): boolean {
  const { base } = splitQuery(unsizedAssetPath(path));
  if (base.startsWith('coui://foae-mods/') || base.startsWith(HTTP_LOCAL_MODS_PREFIX) || base.startsWith('/mods/')) return false;

  const root = sizedAssetRoot(base);
  if (!root) return false;

  const parts = root.assetRest.split('/');
  if (parts.length < 2) return false;
  if (!SIZED_ASSET_FAMILIES.has(parts[0])) return false;
  if (parts[1] === '__sizes') return false;
  return SIZABLE_ASSET_EXT.test(parts[parts.length - 1]);
}

export function FoaeCefUIAutoSizedAssetPath(path: string, displaySizePx: number): string {
  const source = FoaeCefUIAssetPath(normaliseSizedAssetSource(path));
  if (!source || !isSizableAssetPath(source)) return source ?? path;

  const bucket = sizedAssetBucket(displaySizePx);
  if (!bucket) return source;

  const { base, query } = splitQuery(source);
  const root = sizedAssetRoot(base);
  if (!root) return source;

  const parts = root.assetRest.split('/');
  const family = parts[0];
  const rest = parts.slice(1).join('/');
  const sizedRest = rest.replace(SIZABLE_ASSET_EXT, (_match, _suffix, suffixQuery = '') => `.webp${suffixQuery}`);
  return `${root.prefix}${family}/__sizes/${bucket}/${sizedRest}${query}`;
}

export function FoaeCefUIAssetPath(path: string): string;
export function FoaeCefUIAssetPath(path?: string | null): string | undefined;
export function FoaeCefUIAssetPath(path?: string | null): string | undefined {
  if (!path) return undefined;
  const override = assetOverrideForPath(path);
  if (override) return override;
  if (!import.meta.env.PROD) return path;
  if (!shouldUseOptimisedAsset(path)) return path;

  const optimised = path.replace(OPTIMISED_ASSET_EXT, (_match, _suffix, query = '') => `.webp${query}`);
  return assetOverrideForPath(optimised) ?? optimised;
}

export function interactionAssetPath(key: string | undefined | null, basePath: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('/') || key.startsWith('coui://')) return FoaeCefUIAssetPath(key);
  return FoaeCefUIAssetPath(`${basePath}${key}.png`);
}

export function FoaeCefUISizedAssetPath(path: string, sizePx: number): string;
export function FoaeCefUISizedAssetPath(path?: string | null, sizePx?: number): string | undefined;
export function FoaeCefUISizedAssetPath(path?: string | null, sizePx?: number): string | undefined {
  if (!path || !sizePx) return FoaeCefUIAssetPath(path);
  return FoaeCefUIAutoSizedAssetPath(path, sizePx);
}
