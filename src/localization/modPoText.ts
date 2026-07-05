import type { WebUITextArgs } from './WebUITextContext';
import { formatWebUIText } from './WebUITextContext';

interface ModPoCatalogue {
  packId: string;
  urlPattern: string;
}

interface PoEntry {
  msgctxt?: string;
  msgid?: string;
  msgstr?: string;
}

type PoField = 'msgctxt' | 'msgid' | 'msgstr';

const catalogues: ModPoCatalogue[] = [];
const loadedLocaleMaps = new Map<string, Promise<Map<string, string>>>();

export function registerModPoCatalogues(nextCatalogues: ModPoCatalogue[]): void {
  for (const catalogue of nextCatalogues) {
    if (!catalogue.packId || !catalogue.urlPattern) continue;
    if (catalogues.some(existing => existing.packId === catalogue.packId && existing.urlPattern === catalogue.urlPattern)) {
      continue;
    }
    catalogues.push(catalogue);
  }
  loadedLocaleMaps.clear();
}

export function formatModPoText(key: string, args?: WebUITextArgs): string {
  return formatWebUIText(key, args);
}

export function loadRegisteredModPoText(locale: string): Promise<Map<string, string>> {
  const normalisedLocale = locale || 'en';
  const cached = loadedLocaleMaps.get(normalisedLocale);
  if (cached) return cached;

  const promise = loadLocaleMap(normalisedLocale);
  loadedLocaleMaps.set(normalisedLocale, promise);
  return promise;
}

function localeCandidates(locale: string): string[] {
  const candidates = ['en'];
  const baseLocale = locale.split('-')[0];
  if (baseLocale && baseLocale !== locale) {
    candidates.push(baseLocale);
  }
  if (locale) {
    candidates.push(locale);
  }
  return Array.from(new Set(candidates));
}

async function loadLocaleMap(locale: string): Promise<Map<string, string>> {
  const merged = new Map<string, string>();
  const locales = localeCandidates(locale);

  for (const catalogue of catalogues) {
    for (const candidate of locales) {
      const url = catalogue.urlPattern.replaceAll('{locale}', candidate);
      const text = await loadTextFile(url);
      if (!text) continue;
      const parsed = parsePo(text);
      for (const [key, value] of parsed) {
        merged.set(key, value);
      }
    }
  }

  return merged;
}

function loadTextFile(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Cache-Control', 'no-store');
    request.onreadystatechange = () => {
      if (request.readyState !== XMLHttpRequest.DONE) return;
      if (request.status < 200 || request.status >= 300) {
        resolve(null);
        return;
      }
      resolve(request.responseText);
    };
    request.onerror = () => resolve(null);
    request.send();
  });
}

function parsePo(source: string): Map<string, string> {
  const result = new Map<string, string>();
  let entry: PoEntry = {};
  let activeField: PoField | null = null;

  const finishEntry = () => {
    if (entry.msgid === undefined) {
      entry = {};
      activeField = null;
      return;
    }

    const key = entry.msgctxt || entry.msgid;
    if (key) {
      result.set(key, entry.msgstr || entry.msgid);
    }
    entry = {};
    activeField = null;
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      finishEntry();
      continue;
    }
    if (line.startsWith('#')) {
      continue;
    }

    const field = poFieldFromLine(line);
    if (field) {
      if (field === 'msgctxt' && entry.msgid !== undefined) {
        finishEntry();
      }
      activeField = field;
      entry[field] = parsePoQuotedValue(line.slice(field.length).trim());
      continue;
    }

    if (activeField && line.startsWith('"')) {
      entry[activeField] = `${entry[activeField] ?? ''}${parsePoQuotedValue(line)}`;
    }
  }

  finishEntry();
  return result;
}

function poFieldFromLine(line: string): PoField | null {
  if (line.startsWith('msgctxt ')) return 'msgctxt';
  if (line.startsWith('msgid ')) return 'msgid';
  if (line.startsWith('msgstr ')) return 'msgstr';
  return null;
}

function parsePoQuotedValue(value: string): string {
  if (!value.startsWith('"')) return '';
  try {
    return JSON.parse(value) as string;
  } catch {
    return value.slice(1, value.endsWith('"') ? -1 : undefined);
  }
}
