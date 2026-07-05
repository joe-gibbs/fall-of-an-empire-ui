import { useMemo, type ReactNode } from 'react';
import { useBridgeQuery } from '../bridge/core/useBridgeQuery';
import { formatWebUIText, setCurrentWebUIText, WebUITextContext, type WebUITextContextValue } from './WebUITextContext';
import { WEBUI_TEXT_SOURCE } from './webui-text.generated.ts';

export function WebUITextProvider({ children }: { children: ReactNode }) {
  const response = useBridgeQuery({
    action: 'game.get_webui_text',
    cacheResponse: true,
    map: data => data,
  });

  const textByKey = useMemo(() => {
    const map = new Map<string, string>(Object.entries(WEBUI_TEXT_SOURCE));
    for (const entry of response?.texts ?? []) {
      map.set(entry.key, entry.text);
    }
    return map;
  }, [response]);

  const value = useMemo<WebUITextContextValue>(() => ({
    locale: response?.locale ?? 'en',
    t: (key, args) => formatWebUIText(textByKey.get(key) ?? key, args),
  }), [response?.locale, textByKey]);

  setCurrentWebUIText(value);

  return (
    <WebUITextContext.Provider key={value.locale} value={value}>
      {children}
    </WebUITextContext.Provider>
  );
}
