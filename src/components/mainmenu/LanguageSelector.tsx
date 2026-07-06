import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguageBridge } from '../../bridge/app/useLanguageBridge';
import StyledScrollArea from '../common/layout/scrolling/StyledScrollArea';
import { useEscapeStackEntry } from '../../context/EscapeStack';
import { webUIText, useWebUIText } from '../../localization/WebUITextContext';
import './LanguageSelector.css';

const FALLBACK_LANGUAGES = [
  { code: 'en', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.8.1"); } },
  { code: 'de', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.9.1"); } },
  { code: 'fr', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.10.1"); } },
  { code: 'es', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.11.1"); } },
  { code: 'it', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.12.1"); } },
  { code: 'pt-BR', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.13.1"); } },
  { code: 'ru', name: 'Русский' },
  { code: 'pl', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.15.1"); } },
  { code: 'tr', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.16.1"); } },
  { code: 'nl', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.17.1"); } },
  { code: 'sv', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.18.1"); } },
  { code: 'nb', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.19.1"); } },
  { code: 'da', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.20.1"); } },
  { code: 'fi', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.21.1"); } },
  { code: 'cs', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.22.1"); } },
  { code: 'hu', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.23.1"); } },
  { code: 'uk', name: 'Українська' },
  { code: 'ro', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.25.1"); } },
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'zh-Hant', name: '繁體中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'vi', get name() { return webUIText("Auto.Prop.componentsmainmenuLanguageSelector.30.1"); } },
];

const flagSrc = (code: string) => `/assets/icons/Flags/I_Flag_${code}.png`;
const CLOSE_MS = 200;

const LanguageSelector: React.FC = () => {
  const t = useWebUIText();
  const { state, setLanguage } = useLanguageBridge();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  const languages = state?.languages ?? FALLBACK_LANGUAGES;
  const currentCode = state?.currentLocale ?? 'en';
  const current = languages.find(l => l.code === currentCode) ?? languages[0];

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, CLOSE_MS);
    return () => clearTimeout(t);
  }, [closing]);

  const open = useCallback(() => {
    setClosing(false);
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    if (!mounted || closing) return;
    setClosing(true);
  }, [mounted, closing]);
  useEscapeStackEntry({
    id: 'modal.language-selector',
    active: mounted,
    onClose: close,
    allowFromInput: true,
  });

  const handleSelect = (code: string) => {
    if (code !== currentCode) {
      setLanguage(code);
    }
    close();
  };

  const overlayClass = closing ? 'mm-lang-overlay mm-lang-overlay--closing' : 'mm-lang-overlay';
  const modalClass = closing ? 'mm-lang-modal mm-lang-modal--closing' : 'mm-lang-modal';
  const overlay = mounted ? (
    <div
      className={overlayClass}
      onMouseDown={e => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        e.stopPropagation();
        close();
      }}
      onClick={e => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className={modalClass} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <div className="mm-lang-modal__header">
          <span className="mm-lang-modal__title">{t('Common.Language')}</span>
          <button className="mm-lang-modal__close" onClick={close} aria-label={t('Common.Close')}>
            <img src="/assets/icons/I_Close.png" alt="" className="mm-lang-modal__close-icon" draggable={false} />
          </button>
        </div>
        <StyledScrollArea
          className="mm-lang-modal__list"
          viewportClassName="mm-lang-modal__list-viewport"
        >
          {languages.map(lang => (
            <button
              key={lang.code}
              className={`mm-lang-row ${lang.code === currentCode ? 'mm-lang-row--active' : ''}`}
              onClick={() => handleSelect(lang.code)}
            >
              <img
                src={flagSrc(lang.code)}
                alt=""
                className="mm-lang-row__flag"
                onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
              />
              <span className="mm-lang-row__name">{lang.name}</span>
              <span className="mm-lang-row__code">{lang.code}</span>
            </button>
          ))}
        </StyledScrollArea>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        className="mm-lang-trigger"
        onClick={open}
        aria-label={`${t('Common.Language')}: ${current.name}`}
      >
        <img src={flagSrc(current.code)} alt="" className="mm-lang-trigger__flag" />
        <span className="mm-lang-trigger__code">{current.code.toUpperCase()}</span>
      </button>

      {overlay && createPortal(overlay, document.body)}
    </>
  );
};

export default LanguageSelector;
