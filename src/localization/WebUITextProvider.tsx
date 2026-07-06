import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useBridgeQuery } from '../bridge/core/useBridgeQuery';
import { formatWebUIText, setCurrentWebUIText, WebUITextContext, type WebUITextContextValue } from './WebUITextContext';
import { getModPoCatalogueVersion, loadRegisteredModPoText, subscribeModPoCatalogues } from './modPoText';
import { WEBUI_TEXT_SOURCE } from './webui-text.generated.ts';

export function WebUITextProvider({ children }: { children: ReactNode }) {
  const response = useBridgeQuery({
    action: 'game.get_webui_text',
    cacheResponse: true,
    map: data => data,
  });
  const locale = response?.locale ?? 'en';
  const [modTextState, setModTextState] = useState<{ locale: string; texts: Map<string, string> }>(() => ({
    locale: '',
    texts: new Map(),
  }));
  const [modCatalogueVersion, setModCatalogueVersion] = useState(getModPoCatalogueVersion);

  useEffect(() => subscribeModPoCatalogues(() => {
    setModCatalogueVersion(getModPoCatalogueVersion());
  }), []);

  useEffect(() => {
    let cancelled = false;
    loadRegisteredModPoText(locale)
      .then((texts) => {
        if (!cancelled) {
          setModTextState({ locale, texts });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModTextState({ locale, texts: new Map() });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale, modCatalogueVersion]);

  const textByKey = useMemo(() => {
    const map = new Map<string, string>(Object.entries(WEBUI_TEXT_SOURCE));
    for (const entry of response?.texts ?? []) {
      map.set(entry.key, entry.text);
    }
    if (modTextState.locale === locale) {
      for (const [key, text] of modTextState.texts) {
        map.set(key, text);
      }
    }
    return map;
  }, [locale, modTextState, response]);

  const value = useMemo<WebUITextContextValue>(() => ({
    locale,
    t: (key, args) => formatWebUIText(textByKey.get(key) ?? key, args),
  }), [locale, textByKey]);

  setCurrentWebUIText(value);

  return (
    <WebUITextContext.Provider key={value.locale} value={value}>
      {children}
    </WebUITextContext.Provider>
  );
}
