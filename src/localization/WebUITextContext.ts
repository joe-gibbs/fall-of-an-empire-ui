import { createContext, useContext } from 'react';
import { WEBUI_TEXT_SOURCE } from './webui-text.generated';

type TextArg = string | number | boolean | null | undefined;
export type WebUITextArgs = Record<string, TextArg>;
export type WebUITextFormatter = (key: string, args?: WebUITextArgs) => string;

export interface WebUITextContextValue {
  locale: string;
  t: WebUITextFormatter;
}

export function formatWebUIText(template: string, args?: WebUITextArgs): string {
  if (!args) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => {
    const value = args[name];
    return value === null || value === undefined ? match : String(value);
  });
}

const sourceCatalogue: Readonly<Record<string, string>> = WEBUI_TEXT_SOURCE;
const sourceText: WebUITextFormatter = (key, args) => formatWebUIText(sourceCatalogue[key] ?? key, args);

export const WebUITextContext = createContext<WebUITextContextValue>({
  locale: 'en',
  t: sourceText,
});

let currentWebUIText: WebUITextContextValue = {
  locale: 'en',
  t: sourceText,
};

export function setCurrentWebUIText(value: WebUITextContextValue): void {
  currentWebUIText = value;
}

export function webUIText(key: string, args?: WebUITextArgs): string {
  return currentWebUIText.t(key, args);
}

export function useWebUIText(): WebUITextFormatter {
  return useContext(WebUITextContext).t;
}

export function useWebUILocale(): string {
  return useContext(WebUITextContext).locale;
}

export function WebUIText({ textKey, args }: { textKey: string; args?: WebUITextArgs }): string {
  const t = useWebUIText();
  return t(textKey, args);
}
