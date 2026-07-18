import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatWebUIText, setCurrentWebUIText, WebUITextContext, type WebUITextContextValue } from './WebUITextContext';
import { getModPoCatalogueVersion, loadRegisteredModPoText, subscribeModPoCatalogues } from './modPoText';
import { WEBUI_TEXT_SOURCE } from './webui-text.generated.ts';

export function WebUITextProvider({ children }: { children: ReactNode }) {
  const [localisationVersion, setLocalisationVersion] = useState(0);
  const localisation = window.webkiln?.localisation;
  const locale = localisation?.locale ?? 'en';
  const [modTextState, setModTextState] = useState<{ locale: string; texts: Map<string, string> }>(() => ({
    locale: '',
    texts: new Map(),
  }));
  const [modCatalogueVersion, setModCatalogueVersion] = useState(getModPoCatalogueVersion);

  useEffect(() => subscribeModPoCatalogues(() => {
    setModCatalogueVersion(getModPoCatalogueVersion());
  }), []);

  useEffect(() => localisation?.subscribe(() => {
    setLocalisationVersion(version => version + 1);
  }), [localisation]);

  useEffect(() => {
    if (localisation) return undefined;
    const onRuntimeReady = () => setLocalisationVersion(version => version + 1);
    window.addEventListener('webkiln:runtime-ready', onRuntimeReady, { once: true });
    return () => window.removeEventListener('webkiln:runtime-ready', onRuntimeReady);
  }, [localisation]);

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
    void localisationVersion;
    const map = new Map<string, string>(Object.entries(WEBUI_TEXT_SOURCE));
    if (localisation) {
      for (const [key, source] of Object.entries(WEBUI_TEXT_SOURCE)) {
        map.set(key, localisation.text(key, undefined, source));
      }
    }
    if (modTextState.locale === locale) {
      for (const [key, text] of modTextState.texts) {
        map.set(key, text);
      }
    }
    return map;
  }, [locale, localisation, localisationVersion, modTextState]);

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
