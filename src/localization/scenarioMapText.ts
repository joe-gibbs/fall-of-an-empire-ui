export interface ScenarioMapText {
  displayName?: string;
  menuKicker?: string;
  menuDescription?: string;
  factionSelectionDescription?: string;
  names?: Record<string, string>;
}

const loadedScenarioText = new Map<string, Promise<ScenarioMapText>>();

export function scenarioMapLocaleCandidates(locale: string): string[] {
  const candidates = ['en'];
  const baseLocale = locale.split('-')[0];
  if (baseLocale && baseLocale !== locale) {
    candidates.push(baseLocale);
  }
  if (baseLocale.toLowerCase() === 'zh') {
    const localeLower = locale.toLowerCase();
    const traditionalRegions = ['zh-hant', 'zh-tw', 'zh-hk', 'zh-mo'];
    candidates.push(traditionalRegions.some(candidate => localeLower.startsWith(candidate)) ? 'zh-Hant' : 'zh-Hans');
  }
  if (locale) {
    candidates.push(locale);
  }
  return Array.from(new Set(candidates));
}

export function loadScenarioMapText(mapId: string, locale: string): Promise<ScenarioMapText> {
  if (!mapId) return Promise.resolve({});
  const cacheKey = `${mapId}:${locale || 'en'}`;
  const cached = loadedScenarioText.get(cacheKey);
  if (cached) return cached;

  const promise = loadScenarioMapTextUncached(mapId, locale || 'en')
    .then((text) => {
      if (!hasScenarioMapText(text)) {
        loadedScenarioText.delete(cacheKey);
      }
      return text;
    })
    .catch((error) => {
      loadedScenarioText.delete(cacheKey);
      throw error;
    });
  loadedScenarioText.set(cacheKey, promise);
  return promise;
}

export async function loadScenarioMapTexts(mapIds: string[], locale: string): Promise<Record<string, ScenarioMapText>> {
  const uniqueMapIds = Array.from(new Set(mapIds.filter(Boolean)));
  const entries = await Promise.all(uniqueMapIds.map(async (mapId) => [
    mapId,
    await loadScenarioMapText(mapId, locale),
  ] as const));
  return Object.fromEntries(entries);
}

function mergeScenarioMapText(target: ScenarioMapText, source: ScenarioMapText): ScenarioMapText {
  return {
    ...target,
    ...source,
    names: {
      ...(target.names ?? {}),
      ...(source.names ?? {}),
    },
  };
}

function hasScenarioMapText(text: ScenarioMapText): boolean {
  return !!(
    text.displayName ||
    text.menuKicker ||
    text.menuDescription ||
    text.factionSelectionDescription ||
    Object.keys(text.names ?? {}).length > 0
  );
}

async function loadScenarioMapTextUncached(mapId: string, locale: string): Promise<ScenarioMapText> {
  let merged: ScenarioMapText = {};
  for (const candidate of scenarioMapLocaleCandidates(locale)) {
    const text = await loadScenarioMapTextFile(mapId, candidate);
    if (text) {
      merged = mergeScenarioMapText(merged, text);
    }
  }
  return merged;
}

function loadScenarioMapTextFile(mapId: string, locale: string): Promise<ScenarioMapText | null> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open('GET', `http://foae.local/scenario-maps/${encodeURIComponent(mapId)}/Localization/${encodeURIComponent(locale)}.json`, true);
    request.setRequestHeader('Cache-Control', 'no-store');
    request.onreadystatechange = () => {
      if (request.readyState !== XMLHttpRequest.DONE) return;
      if (request.status < 200 || request.status >= 300) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(request.responseText) as ScenarioMapText);
      } catch {
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
    request.send();
  });
}
