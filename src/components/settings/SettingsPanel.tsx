import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SidebarTabBar from '../sidebars/shared/SidebarTabBar';
import SectionHeading from '../common/data-display/stats/SectionHeading';
import GameButton from '../common/buttons/GameButton';
import StyledScrollArea from '../common/layout/scrolling/StyledScrollArea';
import DropdownSelect from '../common/forms/DropdownSelect';
import Tooltip, { type TooltipContent } from '../common/tooltips/Tooltip';
import { useSettingsBridge } from '../../bridge/app/useSettingsBridge';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { browserKeyToUnrealKey, browserMouseButtonToUnrealKey, isModifierCode } from '../../bridge/core/browserKeyToUnrealKey';
import { useAnimatedPresence } from '../../hooks/useAnimatedPresence';
import { useEscapeStackEntry } from '../../context/EscapeStack';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { FoaeCefUIAssetPath } from '../../utils/assets';
import type {
  ApplySettingsRequest,
  ControlBindingDTO,
  GetSettingsResponse,
  LlmModelDTO,
  NotificationTypeDTO,
  SettingsGraphicsDTO,
} from '../../bridge-types.generated.ts';
import './SettingsPanel.css';

import { webUIText, WebUIText } from '../../localization/WebUITextContext';
type SettingsTab = 'gameplay' | 'graphics' | 'audio' | 'controls' | 'events' | 'notifications';

const settingsTabs = [
  { id: 'gameplay', get label() { return webUIText('Auto.TopProp.ComponentsSettingsSettingsPanel.26.1'); } },
  { id: 'graphics', get label() { return webUIText('Auto.TopProp.ComponentsSettingsSettingsPanel.27.2'); } },
  { id: 'audio', get label() { return webUIText('Auto.TopProp.ComponentsSettingsSettingsPanel.28.3'); } },
  { id: 'controls', get label() { return webUIText('Auto.TopProp.ComponentsSettingsSettingsPanel.29.4'); } },
  { id: 'events', get label() { return webUIText('Auto.TopProp.ComponentsSettingsSettingsPanel.30.5'); } },
  { id: 'notifications', get label() { return webUIText('Auto.TopProp.ComponentsSettingsSettingsPanel.31.6'); } },
];

const FALLBACK_RESOLUTIONS = ['1280x720', '1366x768', '1600x900', '1920x1080', '2560x1440', '3840x2160'];
const FPS_OPTIONS = ['30', '60', '120', '144', 'Unlimited'];
type SettingsOption = { value: string; label: string };

const DIFFICULTY_OPTIONS: SettingsOption[] = [
  { value: 'Easy', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.740.12'); } },
  { value: 'Normal', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.740.13'); } },
  { value: 'Hard', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.740.14'); } },
  { value: 'VeryHard', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.740.15'); } },
];
const SAVE_FREQUENCY_OPTIONS: SettingsOption[] = [
  { value: 'Monthly', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.741.17'); } },
  { value: 'SixMonths', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.741.18'); } },
  { value: 'Yearly', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.741.19'); } },
  { value: 'Never', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.741.20'); } },
];
const AUTOSAVE_SLOT_OPTIONS: SettingsOption[] = Array.from({ length: 10 }, (_, index) => {
  const value = (index + 1).toString();
  return { value, label: value };
});
const PAUSE_NOTIFICATION_OPTIONS: SettingsOption[] = [
  { value: 'Off', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.742.22'); } },
  { value: 'Diplomatic', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.742.23'); } },
  { value: 'Regular', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.742.24'); } },
  { value: 'Both', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.742.25'); } },
];
const WINDOW_MODE_OPTIONS: SettingsOption[] = [
  { value: 'Fullscreen', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.761.40'); } },
  { value: 'WindowedFullscreen', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.761.41'); } },
  { value: 'Windowed', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.761.42'); } },
];
const DLSS_MODE_OPTIONS: SettingsOption[] = [
  { value: 'Off', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.766.47'); } },
  { value: 'DLAA', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.766.48'); } },
  { value: 'Quality', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.766.49'); } },
  { value: 'Balanced', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.766.50'); } },
  { value: 'Performance', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.766.51'); } },
  { value: 'UltraPerformance', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.766.52'); } },
];
const ANTI_ALIASING_OPTIONS: SettingsOption[] = [
  { value: 'None', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.768.54'); } },
  { value: 'FXAA', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.768.55'); } },
  { value: 'TAA', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.768.56'); } },
];
const GRAPHICS_QUALITY_OPTIONS: SettingsOption[] = [
  { value: '0', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.773.60'); } },
  { value: '1', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.773.61'); } },
  { value: '2', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.773.62'); } },
  { value: '3', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.773.63'); } },
];
const GLANCE_DENSITY_OPTIONS: SettingsOption[] = [
  { value: 'Minimal', get label() { return webUIText('Settings.GlanceDensity.Minimal'); } },
  { value: 'Normal', get label() { return webUIText('Settings.GlanceDensity.Normal'); } },
  { value: 'Detailed', get label() { return webUIText('Settings.GlanceDensity.Detailed'); } },
];
const OVERALL_GRAPHICS_QUALITY_OPTIONS: SettingsOption[] = [
  ...GRAPHICS_QUALITY_OPTIONS,
  { value: 'Custom', get label() { return webUIText('Settings.GraphicsQuality.Custom'); } },
];
type GraphicsQualityKey =
  | 'textureQuality'
  | 'shadowQuality'
  | 'effectsQuality'
  | 'foliageQuality'
  | 'shadingQuality'
  | 'viewDistanceQuality';
const GRAPHICS_QUALITY_KEYS: GraphicsQualityKey[] = [
  'textureQuality',
  'shadowQuality',
  'effectsQuality',
  'foliageQuality',
  'shadingQuality',
  'viewDistanceQuality',
];
const GRAPHICS_QUALITY_LABEL_KEYS: Record<string, string> = {
  textureQuality: 'Settings.GraphicsQuality.Texture',
  shadowQuality: 'Settings.GraphicsQuality.Shadow',
  effectsQuality: 'Settings.GraphicsQuality.Effects',
  foliageQuality: 'Settings.GraphicsQuality.Foliage',
  shadingQuality: 'Settings.GraphicsQuality.Shading',
  viewDistanceQuality: 'Settings.GraphicsQuality.ViewDistance',
};
const GRAPHICS_QUALITY_TOOLTIP_KEYS: Record<string, string> = {
  textureQuality: 'Settings.Tooltip.TextureQuality.Body',
  shadowQuality: 'Settings.Tooltip.ShadowQuality.Body',
  effectsQuality: 'Settings.Tooltip.EffectsQuality.Body',
  foliageQuality: 'Settings.Tooltip.FoliageQuality.Body',
  shadingQuality: 'Settings.Tooltip.ShadingQuality.Body',
  viewDistanceQuality: 'Settings.Tooltip.ViewDistanceQuality.Body',
};

type ApplyPayload = ApplySettingsRequest;
type DisplayConfirmState = {
  priorSnapshot: ApplyPayload;
  expiresAtMs: number;
  secondsLeft: number;
};

const fpsNumberToOption = (n: number): string => (n <= 0 ? 'Unlimited' : n.toString());
const fpsOptionToNumber = (s: string): number => (s === 'Unlimited' ? 0 : parseInt(s, 10) || 60);
const fpsOptionLabel = (s: string): string => (s === 'Unlimited' ? webUIText('Settings.Unlimited') : s);
const getOverallGraphicsQuality = (graphics: SettingsGraphicsDTO): string => {
  const firstQuality = graphics[GRAPHICS_QUALITY_KEYS[0]];
  return GRAPHICS_QUALITY_KEYS.every(key => graphics[key] === firstQuality)
    ? firstQuality.toString()
    : 'Custom';
};
const makeOverallGraphicsQualityPatch = (quality: number): Partial<SettingsGraphicsDTO> => {
  const patch: Partial<SettingsGraphicsDTO> = {};
  for (const key of GRAPHICS_QUALITY_KEYS) {
    patch[key] = quality;
  }
  return patch;
};
const graphicsQualityLabel = (key: string): string => {
  const labelKey = GRAPHICS_QUALITY_LABEL_KEYS[key];
  return labelKey ? webUIText(labelKey) : key.replace('Quality', '').replace(/([A-Z])/g, ' $1').trim();
};
const graphicsQualityTooltip = (key: string): TooltipContent | undefined => {
  const bodyKey = GRAPHICS_QUALITY_TOOLTIP_KEYS[key];
  return bodyKey ? { title: graphicsQualityLabel(key), body: webUIText(bodyKey) } : undefined;
};
const settingsTooltip = (title: string, bodyKey: string): TooltipContent => ({
  title,
  body: webUIText(bodyKey),
});

function applyGameplayCssVariables(gameplay: ApplyPayload['gameplay']) {
  if (Number.isFinite(gameplay.uiScale) && gameplay.uiScale > 0) {
    document.documentElement.style.setProperty('--ui-scale', String(gameplay.uiScale));
  }
  if (Number.isFinite(gameplay.uiScrollSpeed) && gameplay.uiScrollSpeed > 0) {
    document.documentElement.style.setProperty('--ui-scroll-speed', String(gameplay.uiScrollSpeed));
  }
  if (Number.isFinite(gameplay.tooltipDelaySeconds) && gameplay.tooltipDelaySeconds >= 0) {
    document.documentElement.style.setProperty('--tooltip-delay-ms', String(Math.round(gameplay.tooltipDelaySeconds * 1000)));
  }
}

const toPercent = (value: number): number => Math.round(value * 100);
const fromPercent = (value: number): number => value / 100;
const formatMultiplier = (value: number): string => `${value.toFixed(value < 1 ? 2 : 1)}x`;
const POPUP_EXIT_MS = 120;
const SETTINGS_MODAL_EXIT_MS = 160;
const DISPLAY_CONFIRM_SECONDS = 10;
const DISPLAY_CONFIRM_STORAGE_KEY = 'foae.settings.displayConfirm';
const DEFAULT_AUDIO_VALUES: ApplyPayload['audio'] = {
  master: 1.0,
  music: 0.7,
  effects: 0.8,
  ui: 0.8,
  ambience: 0.8,
};

const finiteNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

function sanitiseAudioSettings(audio: ApplyPayload['audio']): ApplyPayload['audio'] {
  return {
    master: finiteNumber(audio.master, DEFAULT_AUDIO_VALUES.master),
    music: finiteNumber(audio.music, DEFAULT_AUDIO_VALUES.music),
    effects: finiteNumber(audio.effects, DEFAULT_AUDIO_VALUES.effects),
    ui: finiteNumber(audio.ui, DEFAULT_AUDIO_VALUES.ui),
    ambience: finiteNumber(audio.ambience, DEFAULT_AUDIO_VALUES.ambience),
  };
}

function sanitiseApplyPayload(payload: ApplyPayload): ApplyPayload {
  return {
    ...payload,
    audio: sanitiseAudioSettings(payload.audio),
  };
}

function snapshotToPayload(data: GetSettingsResponse): ApplyPayload {
  return sanitiseApplyPayload({
    video: { ...data.video },
    audio: { ...data.audio },
    gameplay: { ...data.gameplay, mutedNotificationTypes: [...data.gameplay.mutedNotificationTypes] },
    graphics: { ...data.graphics },
  });
}

function displayConfirmSecondsLeft(expiresAtMs: number): number {
  return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
}

function makeDisplayConfirmState(priorSnapshot: ApplyPayload): DisplayConfirmState {
  return {
    priorSnapshot,
    expiresAtMs: Date.now() + DISPLAY_CONFIRM_SECONDS * 1000,
    secondsLeft: DISPLAY_CONFIRM_SECONDS,
  };
}

function readStoredDisplayConfirm(): DisplayConfirmState | null {
  const raw = window.sessionStorage.getItem(DISPLAY_CONFIRM_STORAGE_KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Pick<DisplayConfirmState, 'priorSnapshot' | 'expiresAtMs'>;
    return {
      priorSnapshot: stored.priorSnapshot,
      expiresAtMs: stored.expiresAtMs,
      secondsLeft: displayConfirmSecondsLeft(stored.expiresAtMs),
    };
  } catch {
    window.sessionStorage.removeItem(DISPLAY_CONFIRM_STORAGE_KEY);
    return null;
  }
}

function storeDisplayConfirm(priorSnapshot: ApplyPayload): DisplayConfirmState {
  const state = makeDisplayConfirmState(priorSnapshot);
  window.sessionStorage.setItem(DISPLAY_CONFIRM_STORAGE_KEY, JSON.stringify({
    priorSnapshot: state.priorSnapshot,
    expiresAtMs: state.expiresAtMs,
  }));
  return state;
}

function clearStoredDisplayConfirm(): void {
  window.sessionStorage.removeItem(DISPLAY_CONFIRM_STORAGE_KEY);
}

/* ── Setting Row Helpers (module-scope to avoid remount on re-render) ── */

const SettingsLabel: React.FC<{
  label: string;
  tooltip?: TooltipContent;
}> = ({ label, tooltip }) => {
  const labelNode = <span className={`settings-row__label${tooltip ? ' settings-row__label--help' : ''}`}>{label}</span>;
  if (!tooltip) return labelNode;
  return (
    <Tooltip content={tooltip} position="left" delay={180} inline>
      {labelNode}
    </Tooltip>
  );
};

const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
  desc?: string;
  tooltip?: TooltipContent;
  disabled?: boolean;
}> = ({ checked, onChange, label, desc, tooltip, disabled = false }) => (
  <div className={`settings-row${disabled ? ' settings-row--disabled' : ''}`} onClick={disabled ? undefined : onChange}>
    <div className="settings-row__text">
      <SettingsLabel label={label} tooltip={tooltip} />
      {desc && <span className="settings-row__desc">{desc}</span>}
    </div>
    <div className={`settings-toggle ${checked ? 'settings-toggle--on' : ''}${disabled ? ' settings-toggle--disabled' : ''}`}>
      <div className="settings-toggle__knob" />
    </div>
  </div>
);

const Choice: React.FC<{ label: string; desc?: string; tooltip?: TooltipContent; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }> = ({ label, desc, tooltip, value, options, onChange }) => (
  <div className="settings-row settings-row--choice">
    <div className="settings-row__text">
      <SettingsLabel label={label} tooltip={tooltip} />
      {desc && <span className="settings-row__desc">{desc}</span>}
    </div>
    <div className="settings-choice-group">
      {options.map(o => (
        <button key={o.value} className={`settings-choice-btn ${o.value === value ? 'settings-choice-btn--active' : ''}`} onClick={(e) => { e.stopPropagation(); onChange(o.value); }}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const Dropdown: React.FC<{ label: string; desc?: string; tooltip?: TooltipContent; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }> = ({ label, desc, tooltip, value, options, onChange }) => {
  const hasCurrentValue = options.some(o => o.value === value);
  const mergedOptions = hasCurrentValue ? options : [{ value, label: value }, ...options];

  return (
    <div className="settings-row settings-row--choice">
      <div className="settings-row__text">
        <SettingsLabel label={label} tooltip={tooltip} />
        {desc && <span className="settings-row__desc">{desc}</span>}
      </div>
      <DropdownSelect
        id={`settings-${label}`}
        className="settings-dropdown-select"
        triggerClassName="settings-dropdown"
        textClassName="settings-dropdown__value"
        chevronClassName="settings-dropdown__chevron"
        menuClassName="settings-dropdown-popup"
        menuClosingClassName="settings-dropdown-popup--closing"
        optionClassName="settings-dropdown-popup__item"
        optionActiveClassName="settings-dropdown-popup__item--active"
        value={value}
        options={mergedOptions}
        position="below-left"
        portal
        offset={4}
        useRootRem
        minSpaceBelow={160}
        maxPopupHeight={280}
        closeOnScroll
        durationMs={POPUP_EXIT_MS}
        escapeId={`settings.dropdown.${label}`}
        isActive={false}
        onChange={onChange}
      />
    </div>
  );
};

const SettingsSlider: React.FC<{ label: string; desc?: string; tooltip?: TooltipContent; value: number; min?: number; max?: number; suffix?: string; display?: string; onChange: (v: number) => void }> = ({ label, desc, tooltip, value, min = 0, max = 100, suffix = '%', display, onChange }) => {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const thumbTransform = pct <= 0 ? 'translateX(0)' : pct >= 100 ? 'translateX(-100%)' : 'translateX(-50%)';
  const applyFromClientX = (clientX: number, track: HTMLDivElement) => {
    const rect = track.getBoundingClientRect();
    const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    onChange(Math.round(min + (max - min) * ratio));
  };
  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = e.currentTarget;
    applyFromClientX(e.clientX, track);

    const handleMove = (moveEvent: MouseEvent) => applyFromClientX(moveEvent.clientX, track);
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return (
    <div className="settings-row settings-row--slider">
      <div className="settings-row__text">
        <SettingsLabel label={label} tooltip={tooltip} />
        {desc && <span className="settings-row__desc">{desc}</span>}
      </div>
      <span className="settings-slider-value">{display ?? `${value.toString()}${suffix}`}</span>
      <div
        className="settings-slider-track"
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onMouseDown={handleTrackMouseDown}
      >
        <div className="settings-slider-fill" style={{ width: `${pct.toFixed(1)}%` }} />
        <span
          className="settings-slider-thumb"
          style={{
            left: `${pct.toFixed(1)}%`,
            transform: thumbTransform,
          }}
        />
      </div>
    </div>
  );
};

/* ── Notifications Tab ── */

const NOTIFICATION_CATEGORY_ORDER = ['Military', 'Diplomatic', 'Political', 'Character', 'Settlement', 'General'];

const NotificationsTab: React.FC<{
  notifications: NotificationTypeDTO[];
  notificationDurationMultiplier: number;
  setMuted: (typeId: string, muted: boolean) => void;
  resetMutes: () => void;
  setGameplay: (patch: Partial<ApplyPayload['gameplay']>) => void;
}> = ({ notifications, notificationDurationMultiplier, setMuted, resetMutes, setGameplay }) => {
  const grouped = useMemo(() => {
    const map = new Map<string, NotificationTypeDTO[]>();
    for (const n of notifications) {
      const arr = map.get(n.category) ?? [];
      arr.push(n);
      map.set(n.category, arr);
    }
    return map;
  }, [notifications]);

  const categories = NOTIFICATION_CATEGORY_ORDER.filter(c => grouped.has(c));
  for (const c of grouped.keys()) {
    if (!categories.includes(c)) categories.push(c);
  }

  return (
    <div className="settings-panel">
      <SettingsSlider
        label={webUIText('Settings.NotificationDuration.Label')}
        desc={webUIText('Settings.NotificationDuration.Description')}
        value={toPercent(notificationDurationMultiplier)}
        min={25}
        max={300}
        suffix="%"
        onChange={v => setGameplay({ notificationDurationMultiplier: fromPercent(v) })}
      />
      {categories.map(cat => (
        <React.Fragment key={cat}>
          <SectionHeading title={cat} variant="ornate" />
          {(grouped.get(cat) ?? []).map(n => (
            <Toggle
              key={n.id}
              label={n.label}
              desc={n.description}
              checked={!n.muted}
              onChange={() => setMuted(n.id, !n.muted)}
            />
          ))}
        </React.Fragment>
      ))}
      <div className="settings-panel-action-row">
        <GameButton variant="outline" onClick={resetMutes}><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.251.1" /></GameButton>
      </div>
    </div>
  );
};

/* ── Controls Tab ── */

interface PendingRebind {
  index: number;
  isAxis: boolean;
  label: string;
}

type ControlListItem =
  | { kind: 'control'; control: ControlBindingDTO }
  | { kind: 'group'; key: string; label: string; controls: ControlBindingDTO[] };

const ControlsTab: React.FC<{
  controls: ControlBindingDTO[];
  rebind: (index: number, isAxis: boolean, keyName: string, mods: { shift: boolean; ctrl: boolean; alt: boolean; cmd: boolean }) => Promise<string[]>;
  clearBinding: (index: number, isAxis: boolean) => void;
}> = ({ controls, rebind, clearBinding }) => {
  const [pending, setPending] = useState<PendingRebind | null>(null);
  const [renderedPending, setRenderedPending] = useState<PendingRebind | null>(null);
  const [mods, setMods] = useState({ shift: false, ctrl: false, alt: false });
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [renderedConflictNotice, setRenderedConflictNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const clearRenderedPending = useCallback(() => {
    setRenderedPending(null);
    setMods({ shift: false, ctrl: false, alt: false });
  }, []);
  const clearRenderedConflictNotice = useCallback(() => setRenderedConflictNotice(null), []);
  const pendingPresence = useAnimatedPresence(pending !== null, {
    durationMs: SETTINGS_MODAL_EXIT_MS,
    onClosed: clearRenderedPending,
  });
  const conflictPresence = useAnimatedPresence(conflictNotice !== null, {
    durationMs: SETTINGS_MODAL_EXIT_MS,
    onClosed: clearRenderedConflictNotice,
  });
  const closePendingRebind = useCallback(() => setPending(null), []);
  useEscapeStackEntry({
    id: 'settings.rebind',
    active: pendingPresence.mounted,
    onClose: closePendingRebind,
    allowFromInput: true,
  });

  if (pending && pending !== renderedPending) setRenderedPending(pending);
  if (conflictNotice && conflictNotice !== renderedConflictNotice) setRenderedConflictNotice(conflictNotice);

  useEffect(() => {
    if (!conflictNotice) return;
    const t = setTimeout(() => setConflictNotice(null), 4000);
    return () => clearTimeout(t);
  }, [conflictNotice]);

  useEffect(() => {
    if (!pending) return;

    const finishRebind = async (
      currentPending: PendingRebind,
      keyName: string,
      nextMods: { shift: boolean; ctrl: boolean; alt: boolean; cmd: boolean },
    ) => {
      setPending(null);
      const cleared = currentPending.isAxis
        ? await rebind(currentPending.index, true, keyName, { shift: false, ctrl: false, alt: false, cmd: false })
        : await rebind(currentPending.index, false, keyName, nextMods);
      if (cleared.length > 0) {
        setConflictNotice(webUIText('Settings.Controls.UnboundFrom', { Actions: cleared.join(', ') }));
      }
    };

    const keyHandler = async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setPending(null);
        return;
      }

      setMods({ shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey });

      if (isModifierCode(e.code)) return;

      const keyName = browserKeyToUnrealKey(e.code, e.key);
      if (!keyName) return;

      await finishRebind(pending, keyName, { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, cmd: e.metaKey });
    };

    const mouseHandler = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keyName = browserMouseButtonToUnrealKey(e.button);
      if (!keyName) return;

      setMods({ shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey });
      await finishRebind(pending, keyName, { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, cmd: e.metaKey });
    };

    const wheelHandler = async (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keyName = pending.isAxis ? 'MouseWheelAxis' : (e.deltaY < 0 ? 'MouseScrollUp' : 'MouseScrollDown');
      setMods({ shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey });
      await finishRebind(pending, keyName, { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, cmd: e.metaKey });
    };

    const blockMouseMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', keyHandler, true);
    window.addEventListener('mousedown', mouseHandler, true);
    window.addEventListener('wheel', wheelHandler, { capture: true, passive: false });
    window.addEventListener('contextmenu', blockMouseMenu, true);
    window.addEventListener('auxclick', blockMouseMenu, true);
    return () => {
      window.removeEventListener('keydown', keyHandler, true);
      window.removeEventListener('mousedown', mouseHandler, true);
      window.removeEventListener('wheel', wheelHandler, true);
      window.removeEventListener('contextmenu', blockMouseMenu, true);
      window.removeEventListener('auxclick', blockMouseMenu, true);
    };
  }, [pending, rebind]);

  const filteredControls = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return controls;
    return controls.filter(c =>
      c.label.toLowerCase().includes(q)
      || c.groupLabel.toLowerCase().includes(q)
      || c.groupItemLabel.toLowerCase().includes(q)
      || c.keyDisplay.toLowerCase().includes(q)
      || c.actionName.toLowerCase().includes(q)
    );
  }, [controls, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ControlListItem[]>();
    const controlGroups = new Map<string, Extract<ControlListItem, { kind: 'group' }>>();
    for (const c of filteredControls) {
      const arr = map.get(c.description) ?? [];
      if (c.groupName) {
        const groupKey = `${c.description}:${c.groupName}`;
        let group = controlGroups.get(groupKey);
        if (!group) {
          group = { kind: 'group', key: groupKey, label: c.groupLabel || c.label, controls: [] };
          controlGroups.set(groupKey, group);
          arr.push(group);
        }
        group.controls.push(c);
      } else {
        arr.push({ kind: 'control', control: c });
      }
      map.set(c.description, arr);
    }
    return map;
  }, [filteredControls]);

  const categoryOrder = ['Selection', 'Camera', 'Game Speed', 'System', 'Screens', 'Map Modes', 'Production', 'Other'];
  const categories = categoryOrder.filter(c => grouped.has(c));
  for (const c of grouped.keys()) {
    if (!categories.includes(c)) categories.push(c);
  }

  const formatChord = (b: ControlBindingDTO) => {
    const parts: string[] = [];
    if (b.ctrl) parts.push('Ctrl');
    if (b.shift) parts.push('Shift');
    if (b.alt) parts.push('Alt');
    if (b.cmd) parts.push('Cmd');
    parts.push(b.keyDisplay || 'Unbound');
    return parts.join(' + ');
  };

  const movementSort = (a: ControlBindingDTO, b: ControlBindingDTO) => {
    const order = (control: ControlBindingDTO) => {
      if (control.actionName === 'MoveForward') return control.scale >= 0 ? 0 : 1;
      if (control.actionName === 'MoveRight') return control.scale < 0 ? 2 : 3;
      return 4;
    };
    const byDirection = order(a) - order(b);
    if (byDirection !== 0) return byDirection;
    return a.keyDisplay.localeCompare(b.keyDisplay);
  };

  const renderControlActions = (b: ControlBindingDTO, compact = false) => (
    <div className={`settings-controls-actions${compact ? ' settings-controls-actions--compact' : ''}`}>
      <button
        className="settings-key-badge settings-key-badge--clickable"
        onClick={() => setPending({ index: b.index, isAxis: b.isAxis, label: b.label })}
      >
        {formatChord(b)}
      </button>
      {!compact && b.keyName && (
        <button className="settings-key-clear" onClick={() => clearBinding(b.index, b.isAxis)} aria-label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.437.3')}>
          <img src="/assets/icons/I_Close.png" alt="" className="settings-clear-icon" draggable={false} />
        </button>
      )}
    </div>
  );

  const renderControlItem = (item: ControlListItem) => {
    if (item.kind === 'control') {
      const b = item.control;
      return (
        <div key={`${b.isAxis ? 'axis' : 'act'}-${b.index.toString()}`} className="settings-row">
          <div className="settings-row__text">
            <span className="settings-row__label">{b.label}</span>
          </div>
          {renderControlActions(b)}
        </div>
      );
    }

    const directionGroups: { label: string; controls: ControlBindingDTO[] }[] = [];
    for (const control of [...item.controls].sort(movementSort)) {
      const directionLabel = control.groupItemLabel || control.label;
      const existing = directionGroups.find(group => group.label === directionLabel);
      if (existing) {
        existing.controls.push(control);
      } else {
        directionGroups.push({ label: directionLabel, controls: [control] });
      }
    }

    return (
      <div key={item.key} className="settings-row settings-row--keybind-group">
        <div className="settings-row__text">
          <span className="settings-row__label">{item.label}</span>
        </div>
        <div className="settings-keybind-group">
          {directionGroups.map(group => (
            <div key={group.label} className="settings-keybind-direction">
              <span className="settings-keybind-direction__label">{group.label}</span>
              <div className="settings-keybind-direction__keys">
                {group.controls.map(control => (
                  <React.Fragment key={`axis-${control.index.toString()}`}>
                    {renderControlActions(control, true)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="settings-panel">
      {conflictPresence.mounted && renderedConflictNotice && (
        <div className={`settings-conflict-toast${conflictPresence.closing ? ' settings-conflict-toast--closing' : ''}`}>
          {renderedConflictNotice}
        </div>
      )}
      {pendingPresence.mounted && renderedPending && (
        <div
          className={`settings-rebind-overlay${pendingPresence.closing ? ' settings-rebind-overlay--closing' : ''}`}
          onClick={() => setPending(null)}
          onContextMenu={e => e.preventDefault()}
        >
          <div
            className={`settings-rebind-modal${pendingPresence.closing ? ' settings-rebind-modal--closing' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="settings-rebind-title">{renderedPending.label}</div>
            <div className="settings-rebind-body">
              <div><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.393.2" /></div>
              {(mods.shift || mods.ctrl || mods.alt) && (
                <div className="settings-rebind-mods">
                  {[mods.ctrl ? 'Ctrl' : '', mods.shift ? 'Shift' : '', mods.alt ? 'Alt' : ''].filter(Boolean).join(' ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="settings-keybind-search">
        <input
          type="text"
          placeholder={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.407.1')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input settings-keybind-search-input"
        />
        {search && (
          <button className="settings-keybind-search-clear" onClick={() => setSearch('')} aria-label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.413.2')}>
            <img src="/assets/icons/I_Close.png" alt="" className="settings-clear-icon" draggable={false} />
          </button>
        )}
      </div>
      {categories.length === 0 && search && (
        <div className="settings-keybind-empty"><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.418.3" />{search}".</div>
      )}
      {categories.map(cat => (
        <React.Fragment key={cat}>
          <SectionHeading title={cat} variant="ornate" />
          {(grouped.get(cat) ?? []).map(renderControlItem)}
        </React.Fragment>
      ))}
    </div>
  );
};

/* ── Events Tab ── */

const EventsTab: React.FC<{
  llmProvider: string;
  localLlmModel: string;
  eventFrequency: number;
  models: LlmModelDTO[];
  hardware: { videoMemoryMB: number; systemMemoryMB: number };
  setGameplay: (patch: { llmProvider?: string; localLlmModel?: string; eventFrequency?: number }) => void;
}> = ({ llmProvider, localLlmModel, eventFrequency, models, hardware, setGameplay }) => {
  const formatMB = (mb: number): string => {
    if (mb <= 0) return webUIText('Settings.Unknown');
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };
  const modelVramShortfall = (model: LlmModelDTO): number => (
    model.vramRequirementMB > 0 && hardware.videoMemoryMB > 0
      ? model.vramRequirementMB - hardware.videoMemoryMB
      : 0
  );
  const modelRamShortfall = (model: LlmModelDTO): number => (
    model.ramRequirementMB > 0 && hardware.systemMemoryMB > 0
      ? model.ramRequirementMB - hardware.systemMemoryMB
      : 0
  );
  const eventIconPath = (path: string): string => FoaeCefUIAssetPath(path) ?? path;
  const modelIconPath = (model: LlmModelDTO): string => {
    if (model.iconPath) return eventIconPath(model.iconPath);
    if (model.filename === 'Small.gguf') return eventIconPath('/assets/icons/Models/T_Events_Small.png');
    if (model.filename === 'Medium.gguf') return eventIconPath('/assets/icons/Models/T_Events_Medium.png');
    if (model.filename === 'Large.gguf') return eventIconPath('/assets/icons/Models/T_Events_Large.png');
    return eventIconPath('/assets/icons/Models/T_Events_Small.png');
  };

  const openModelDownload = (model: LlmModelDTO) => {
    if (model.filename !== 'Large.gguf') return;
    void bridgeCall('ui.open_external_link', { linkId: 'large_model' }).catch(acknowledgeBridgeFailure);
  };

  const selectModel = (model: LlmModelDTO) => {
    if (!model.installed) {
      if (model.downloadUrl) openModelDownload(model);
      return;
    }

    if (modelVramShortfall(model) > 0 || modelRamShortfall(model) > 0) return;

    setGameplay({ llmProvider: 'LocalModel', localLlmModel: model.filename });
  };
  const modelIssue = (model: LlmModelDTO): string | null => {
    if (!model.installed && model.downloadUrl) return null;
    if (!model.installed) return webUIText('Settings.Events.Card.NotInstalled');
    return null;
  };

  const providerCards = [
    {
      id: 'scripted',
      title: webUIText('Settings.Events.Scripted.Title'),
      description: webUIText('Settings.Events.Scripted.Description'),
      iconPath: '/assets/icons/Models/T_ScriptedEvents.png',
      selected: llmProvider === 'Scripted',
      onSelect: () => setGameplay({ llmProvider: 'Scripted', localLlmModel: '' }),
    },
  ];

  return (
    <div className="settings-panel">
      <SectionHeading title={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.479.4')} variant="ornate" />
      <div className="settings-event-cards">
        {providerCards.map(card => (
          <button
            key={card.id}
            type="button"
            className={`settings-event-card${card.selected ? ' settings-event-card--selected' : ''}`}
            onMouseDown={card.onSelect}
            aria-pressed={card.selected}
            aria-label={card.title}
          >
            <span className="settings-event-card__icon-wrap">
              <img src={eventIconPath(card.iconPath)} alt="" className="settings-event-card__icon" draggable={false} />
            </span>
            <span className="settings-event-card__body">
              <span className="settings-event-card__title">{card.title}</span>
              <span className="settings-event-card__desc">{card.description}</span>
            </span>
          </button>
        ))}
        {models.map(model => {
          const selected = llmProvider === 'LocalModel' && localLlmModel === model.filename;
          const vramShortfall = modelVramShortfall(model);
          const ramShortfall = modelRamShortfall(model);
          const unsupported = vramShortfall > 0 || ramShortfall > 0;
          const locked = !model.installed || unsupported;
          const canDownload = !model.installed && !!model.downloadUrl;
          const issue = modelIssue(model);

          return (
            <button
              key={model.filename}
              type="button"
              className={`settings-event-card settings-event-card--model${selected ? ' settings-event-card--selected' : ''}${locked ? ' settings-event-card--locked' : ''}${canDownload ? ' settings-event-card--download' : ''}`}
              onMouseDown={() => selectModel(model)}
              disabled={locked && !canDownload}
              aria-pressed={selected}
              aria-label={model.title || model.filename}
            >
              <span className="settings-event-card__icon-wrap">
                <img src={modelIconPath(model)} alt="" className="settings-event-card__icon" draggable={false} />
                {locked && !canDownload && <img src={eventIconPath('/assets/icons/I_Locked.png')} alt="" className="settings-event-card__lock" draggable={false} />}
              </span>
              <span className="settings-event-card__body">
                <span className="settings-event-card__title">{model.title || model.filename}</span>
                {model.description && <span className="settings-event-card__desc">{model.description}</span>}
                {(model.vramRequirement || model.vramRequirementMB > 0) && (
                  <span className="settings-event-card__req">
                    <span><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.493.5" /></span>
                    <span className={vramShortfall > 0 ? 'settings-event-card__req-value settings-event-card__req-value--warning' : 'settings-event-card__req-value'}>
                      {model.vramRequirement || formatMB(model.vramRequirementMB)}
                    </span>
                    <span className="settings-event-card__req-available">{webUIText('Settings.AvailableMemory', { Amount: formatMB(hardware.videoMemoryMB) })}</span>
                  </span>
                )}
                {model.ramRequirementMB > 0 && (
                  <span className="settings-event-card__req">
                    <span><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.501.6" /></span>
                    <span className={ramShortfall > 0 ? 'settings-event-card__req-value settings-event-card__req-value--warning' : 'settings-event-card__req-value'}>
                      {formatMB(model.ramRequirementMB)}
                    </span>
                    <span className="settings-event-card__req-available">{webUIText('Settings.AvailableMemory', { Amount: formatMB(hardware.systemMemoryMB) })}</span>
                  </span>
                )}
                {!model.installed && (
                  <span className="settings-event-card__hint">
                    {canDownload ? webUIText('Settings.Events.Model.DownloadHint') : webUIText('Settings.Events.Model.NotInstalledHint')}
                  </span>
                )}
                {model.installed && unsupported && (
                  <span className="settings-event-card__hint settings-event-card__hint--warning">
                    {webUIText('Settings.ModelExceedsMemory', { Memory: vramShortfall > 0 ? 'VRAM' : 'RAM' })}
                  </span>
                )}
                {issue && <span className="settings-event-card__hint settings-event-card__hint--warning">{issue}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <SettingsSlider
        label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.520.10')}
        desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.521.3')}
        value={toPercent(eventFrequency)}
        min={25}
        max={1000}
        display={formatMultiplier(eventFrequency)}
        onChange={v => setGameplay({ eventFrequency: fromPercent(v) })}
      />
    </div>
  );
};

const SettingsPanel: React.FC = () => {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('gameplay');
  const { settings, apply, reset, setNotificationMuted, resetNotificationMutes, rebindActionKey } = useSettingsBridge();
  const [working, setWorking] = useState<ApplyPayload | null>(null);
  const [hydratedFrom, setHydratedFrom] = useState<GetSettingsResponse | null>(null);
  const [appliedSnapshot, setAppliedSnapshot] = useState<ApplyPayload | null>(null);
  const [displayConfirm, setDisplayConfirm] = useState<DisplayConfirmState | null>(() => readStoredDisplayConfirm());
  const [renderedDisplayConfirm, setRenderedDisplayConfirm] = useState<DisplayConfirmState | null>(null);
  const livePreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLivePreview = useRef<ApplyPayload | null>(null);
  const clearRenderedDisplayConfirm = useCallback(() => setRenderedDisplayConfirm(null), []);
  const revertDisplaySettings = useCallback((priorSnapshot: ApplyPayload) => {
    clearStoredDisplayConfirm();
    const next = sanitiseApplyPayload(priorSnapshot);
    void apply(next)
      .then(() => {
        setWorking(next);
        setAppliedSnapshot(next);
        setDisplayConfirm(null);
      })
      .catch(acknowledgeBridgeFailure);
  }, [apply]);
  const displayConfirmPresence = useAnimatedPresence(displayConfirm !== null, {
    durationMs: SETTINGS_MODAL_EXIT_MS,
    onClosed: clearRenderedDisplayConfirm,
  });

  if (displayConfirm && displayConfirm !== renderedDisplayConfirm) setRenderedDisplayConfirm(displayConfirm);

  useEffect(() => () => {
    if (livePreviewTimer.current) clearTimeout(livePreviewTimer.current);
    if (pendingLivePreview.current) {
      void apply(pendingLivePreview.current).catch(acknowledgeBridgeFailure);
      pendingLivePreview.current = null;
    }
  }, [apply]);

  useEffect(() => {
    if (!displayConfirm) return;
    if (displayConfirm.secondsLeft <= 0) {
      revertDisplaySettings(displayConfirm.priorSnapshot);
      return;
    }
    const t = setTimeout(() => {
      const secondsLeft = displayConfirmSecondsLeft(displayConfirm.expiresAtMs);
      if (secondsLeft <= 0) {
        revertDisplaySettings(displayConfirm.priorSnapshot);
      } else {
        setDisplayConfirm(c => (c && c.expiresAtMs === displayConfirm.expiresAtMs ? { ...c, secondsLeft } : c));
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [displayConfirm, revertDisplaySettings]);

  if (settings && settings !== hydratedFrom) {
    setHydratedFrom(settings);
    const fresh = snapshotToPayload(settings);
    const hasLocalChanges = working !== null
      && appliedSnapshot !== null
      && JSON.stringify(working) !== JSON.stringify(appliedSnapshot);
    setAppliedSnapshot(fresh);
    if (!working || !hasLocalChanges) {
      setWorking(fresh);
    }
  }

  const handleConfirmDisplay = () => {
    clearStoredDisplayConfirm();
    setDisplayConfirm(null);
  };

  const handleRevertDisplay = () => {
    if (!displayConfirm) return;
    revertDisplaySettings(displayConfirm.priorSnapshot);
  };
  useEscapeStackEntry({
    id: 'settings.display-confirm',
    active: displayConfirmPresence.mounted,
    onClose: handleRevertDisplay,
    allowFromInput: true,
  });

  if (!working || !settings || !appliedSnapshot) {
    return (
      <StyledScrollArea className="settings-body" viewportClassName="settings-body__viewport">
        <div className="settings-panel" />
      </StyledScrollArea>
    );
  }

  const resolutionOptions = settings.supportedResolutions.length > 0 ? settings.supportedResolutions : FALLBACK_RESOLUTIONS;
  const llmModelOptions = settings.availableLlmModels;
  const activeSettingsTabLabel = settingsTabs.find(tab => tab.id === settingsTab)?.label ?? settingsTab;
  const resetButtonLabel = webUIText('Settings.ResetPageToDefault', { Page: activeSettingsTabLabel });

  const isDirty = JSON.stringify(working) !== JSON.stringify(appliedSnapshot);

  const video = working.video;
  const audio = working.audio;
  const gameplay = working.gameplay;
  const graphics = working.graphics;
  const audioMaster = finiteNumber(audio.master, appliedSnapshot.audio.master);
  const audioMusic = finiteNumber(audio.music, appliedSnapshot.audio.music);
  const audioEffects = finiteNumber(audio.effects, appliedSnapshot.audio.effects);
  const audioUi = finiteNumber(audio.ui, appliedSnapshot.audio.ui);
  const audioAmbience = finiteNumber(audio.ambience, appliedSnapshot.audio.ambience);
  const canSelectResolution = video.windowMode === 'Fullscreen';
  const dlssActive = settings.dlssSupported && video.dlssMode !== 'Off';

  const setVideo = (patch: Partial<typeof video>) => setWorking(w => w && { ...w, video: { ...w.video, ...patch } });
  const setGameplay = (patch: Partial<typeof gameplay>) => setWorking(w => w && { ...w, gameplay: { ...w.gameplay, ...patch } });
  const setGraphics = (patch: Partial<typeof graphics>) => setWorking(w => w && { ...w, graphics: { ...w.graphics, ...patch } });

  // Fields where the player expects to hear/see the change immediately.
  // Update working synchronously, then schedule a debounced apply so a drag
  // doesn't hammer the bridge with every slider tick.
  const applyLiveAudio = (patch: Partial<typeof audio>) => {
    const previousApplied = appliedSnapshot;
    const next = sanitiseApplyPayload({ ...working, audio: { ...working.audio, ...patch } });
    setWorking(next);
    setAppliedSnapshot(next);
    pendingLivePreview.current = next;
    if (livePreviewTimer.current) clearTimeout(livePreviewTimer.current);
    livePreviewTimer.current = setTimeout(() => {
      void apply(next).catch((error) => {
        acknowledgeBridgeFailure(error);
        setAppliedSnapshot(current => (current === next ? previousApplied : current));
      }).finally(() => {
        if (pendingLivePreview.current === next) pendingLivePreview.current = null;
      });
    }, 150);
  };
  const applyLiveVideo = (patch: Partial<typeof video>) => {
    const previousApplied = appliedSnapshot;
    const next = sanitiseApplyPayload({ ...working, video: { ...working.video, ...patch } });
    setWorking(next);
    setAppliedSnapshot(next);
    pendingLivePreview.current = next;
    if (livePreviewTimer.current) clearTimeout(livePreviewTimer.current);
    livePreviewTimer.current = setTimeout(() => {
      void apply(next).catch((error) => {
        acknowledgeBridgeFailure(error);
        setAppliedSnapshot(current => (current === next ? previousApplied : current));
      }).finally(() => {
        if (pendingLivePreview.current === next) pendingLivePreview.current = null;
      });
    }, 150);
  };
  const applyLiveGameplay = (patch: Partial<typeof gameplay>) => {
    const previousApplied = appliedSnapshot;
    const next = sanitiseApplyPayload({ ...working, gameplay: { ...working.gameplay, ...patch } });
    applyGameplayCssVariables(next.gameplay);
    setWorking(next);
    setAppliedSnapshot(next);
    pendingLivePreview.current = next;
    if (livePreviewTimer.current) clearTimeout(livePreviewTimer.current);
    livePreviewTimer.current = setTimeout(() => {
      void apply(next).catch((error) => {
        acknowledgeBridgeFailure(error);
        applyGameplayCssVariables(previousApplied.gameplay);
        setAppliedSnapshot(current => (current === next ? previousApplied : current));
      }).finally(() => {
        if (pendingLivePreview.current === next) pendingLivePreview.current = null;
      });
    }, 150);
  };

  const resolution = `${video.resolutionX.toString()}x${video.resolutionY.toString()}`;
  const setResolution = (s: string) => {
    const [x, y] = s.split('x').map(n => parseInt(n, 10));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    setVideo({ resolutionX: x, resolutionY: y });
  };

  const handleApply = () => {
    if (livePreviewTimer.current) {
      clearTimeout(livePreviewTimer.current);
      livePreviewTimer.current = null;
    }
    pendingLivePreview.current = null;
    const prior = appliedSnapshot;
    const next = sanitiseApplyPayload(working);
    setWorking(next);
    const displayChanged = prior.video.resolutionX !== next.video.resolutionX
      || prior.video.resolutionY !== next.video.resolutionY
      || prior.video.windowMode !== next.video.windowMode;
    const pendingDisplayConfirm = displayChanged ? storeDisplayConfirm(prior) : null;
    void apply(next)
      .then(() => {
        setAppliedSnapshot(next);
        if (pendingDisplayConfirm) {
          setDisplayConfirm(storeDisplayConfirm(prior));
        }
      })
      .catch((error) => {
        if (pendingDisplayConfirm) {
          clearStoredDisplayConfirm();
        }
        acknowledgeBridgeFailure(error);
      });
  };

  const handleReset = async () => {
    if (livePreviewTimer.current) {
      clearTimeout(livePreviewTimer.current);
      livePreviewTimer.current = null;
    }
    pendingLivePreview.current = null;
    const previousWorking = working;
    const previousHydratedFrom = hydratedFrom;
    const previousAppliedSnapshot = appliedSnapshot;
    setWorking(null);
    setHydratedFrom(null);
    setAppliedSnapshot(null);
    const pendingDisplayConfirm = settingsTab === 'graphics' ? storeDisplayConfirm(previousAppliedSnapshot) : null;
    try {
      const resetSettings = await reset(settingsTab);
      const fresh = snapshotToPayload(resetSettings);
      setHydratedFrom(resetSettings);
      setWorking(fresh);
      setAppliedSnapshot(fresh);
      const displayChanged = settingsTab === 'graphics'
        && (previousAppliedSnapshot.video.resolutionX !== fresh.video.resolutionX
          || previousAppliedSnapshot.video.resolutionY !== fresh.video.resolutionY
          || previousAppliedSnapshot.video.windowMode !== fresh.video.windowMode);
      if (displayChanged) {
        setDisplayConfirm(storeDisplayConfirm(previousAppliedSnapshot));
      } else if (pendingDisplayConfirm) {
        clearStoredDisplayConfirm();
      }
    } catch (error) {
      if (pendingDisplayConfirm) {
        clearStoredDisplayConfirm();
      }
      acknowledgeBridgeFailure(error);
      setWorking(previousWorking);
      setHydratedFrom(previousHydratedFrom);
      setAppliedSnapshot(previousAppliedSnapshot);
    }
  };

  const handleRebind = async (index: number, isAxis: boolean, keyName: string, mods: { shift: boolean; ctrl: boolean; alt: boolean; cmd: boolean }): Promise<string[]> => {
    const response = await rebindActionKey({ index, isAxis, keyName, ...mods });
    return response?.clearedActions ?? [];
  };

  const handleClearBinding = (index: number, isAxis: boolean) => {
    rebindActionKey({ index, isAxis, keyName: '', shift: false, ctrl: false, alt: false, cmd: false });
  };

  const handleSetNotificationMuted = (typeId: string, muted: boolean) => {
    void setNotificationMuted(typeId, muted).catch(acknowledgeBridgeFailure);
  };

  const handleResetNotificationMutes = () => {
    void resetNotificationMutes().catch(acknowledgeBridgeFailure);
  };

  const displayConfirmOverlay = displayConfirmPresence.mounted && renderedDisplayConfirm ? (
    <div className={`settings-display-confirm-overlay${displayConfirmPresence.closing ? ' settings-display-confirm-overlay--closing' : ''}`}>
      <div className={`settings-display-confirm-modal${displayConfirmPresence.closing ? ' settings-display-confirm-modal--closing' : ''}`}>
        <div className="settings-display-confirm-title"><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.722.7" /></div>
        <div className="settings-display-confirm-body">
          {webUIText('Settings.RevertingInSeconds', { Seconds: renderedDisplayConfirm.secondsLeft })}
        </div>
        <div className="settings-display-confirm-actions">
          <GameButton variant="burgundy" onClick={handleConfirmDisplay}><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.727.8" /></GameButton>
          <GameButton variant="outline" onClick={handleRevertDisplay}><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.728.9" /></GameButton>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {displayConfirmOverlay && createPortal(displayConfirmOverlay, document.body)}
      <div className="settings-tabs">
        <SidebarTabBar tabs={settingsTabs} activeTab={settingsTab} onTabChange={(id) => setSettingsTab(id as SettingsTab)} />
      </div>
      <StyledScrollArea className="settings-body" viewportClassName="settings-body__viewport">
        {settingsTab === 'gameplay' && (
          <div className="settings-panel">
            <Choice label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.740.11')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.740.4')} value={gameplay.difficulty} options={DIFFICULTY_OPTIONS} onChange={v => setGameplay({ difficulty: v })} />
            <Choice label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.741.16')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.741.5')} value={gameplay.saveFrequency} options={SAVE_FREQUENCY_OPTIONS} onChange={v => setGameplay({ saveFrequency: v })} />
            <Choice label={webUIText('Settings.AutosaveSlotCount.Label')} desc={webUIText('Settings.AutosaveSlotCount.Description')} value={gameplay.autosaveSlotCount.toString()} options={AUTOSAVE_SLOT_OPTIONS} onChange={v => setGameplay({ autosaveSlotCount: parseInt(v, 10) })} />
            <Choice label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.742.21')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.742.6')} value={gameplay.pauseOnNotifications} options={PAUSE_NOTIFICATION_OPTIONS} onChange={v => setGameplay({ pauseOnNotifications: v })} />
            <Toggle label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.743.26')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.743.7')} checked={gameplay.autoResumeOnDismiss} onChange={() => setGameplay({ autoResumeOnDismiss: !gameplay.autoResumeOnDismiss })} />
            <Toggle label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.744.27')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.744.8')} checked={gameplay.edgeScrolling} onChange={() => setGameplay({ edgeScrolling: !gameplay.edgeScrolling })} />
            <Toggle label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.745.28')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.745.9')} checked={gameplay.invertZoom} onChange={() => setGameplay({ invertZoom: !gameplay.invertZoom })} />
            <SettingsSlider label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.746.29')} value={toPercent(gameplay.cameraPanSpeed)} max={200} suffix="%" onChange={v => setGameplay({ cameraPanSpeed: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.747.30')} value={toPercent(gameplay.cameraZoomSpeed)} max={200} suffix="%" onChange={v => setGameplay({ cameraZoomSpeed: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.748.31')} value={toPercent(gameplay.cameraRotationSpeed)} max={200} suffix="%" onChange={v => setGameplay({ cameraRotationSpeed: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.749.32')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.749.10')} value={toPercent(gameplay.advisorFrequency)} max={200} suffix="%" onChange={v => setGameplay({ advisorFrequency: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.750.33')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.750.11')} value={toPercent(gameplay.cursorScale)} min={50} max={300} suffix="%" onChange={v => applyLiveGameplay({ cursorScale: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.751.34')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.751.12')} value={toPercent(gameplay.uiScale)} min={50} max={200} suffix="%" onChange={v => applyLiveGameplay({ uiScale: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Settings.UIScrollSpeed.Label')} desc={webUIText('Settings.UIScrollSpeed.Description')} value={toPercent(gameplay.uiScrollSpeed)} min={25} max={300} suffix="%" onChange={v => applyLiveGameplay({ uiScrollSpeed: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Settings.TooltipDelay.Label')} desc={webUIText('Settings.TooltipDelay.Description')} value={Math.round(gameplay.tooltipDelaySeconds * 1000)} min={0} max={2000} suffix="" display={webUIText('Settings.Milliseconds', { Value: Math.round(gameplay.tooltipDelaySeconds * 1000) })} onChange={v => applyLiveGameplay({ tooltipDelaySeconds: v / 1000 })} />
            <Toggle label={webUIText('Settings.ReduceMotion.Label')} desc={webUIText('Settings.ReduceMotion.Description')} checked={gameplay.reduceMotion} onChange={() => setGameplay({ reduceMotion: !gameplay.reduceMotion })} />
            <Toggle label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.752.35')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.752.13')} checked={gameplay.consoleEnabled} onChange={() => setGameplay({ consoleEnabled: !gameplay.consoleEnabled })} />
            <Toggle label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.753.36')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.753.14')} checked={gameplay.includeSaveInCrashReport} onChange={() => setGameplay({ includeSaveInCrashReport: !gameplay.includeSaveInCrashReport })} />
          </div>
        )}

        {settingsTab === 'graphics' && (
          <div className="settings-panel">
            <SectionHeading title={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.759.37')} variant="ornate" />
            {canSelectResolution && (
              <Dropdown
                label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.760.38')}
                tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.760.38'), 'Settings.Tooltip.Resolution.Body')}
                value={resolution}
                options={resolutionOptions.map(v => ({ value: v, label: v }))}
                onChange={setResolution}
              />
            )}
            <Choice
              label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.761.39')}
              tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.761.39'), 'Settings.Tooltip.WindowMode.Body')}
              value={video.windowMode}
              options={WINDOW_MODE_OPTIONS}
              onChange={v => setVideo({ windowMode: v })}
            />
            <Toggle
              label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.762.43')}
              desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.762.15')}
              tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.762.43'), 'Settings.Tooltip.VSync.Body')}
              checked={video.vsync}
              onChange={() => setVideo({ vsync: !video.vsync })}
            />
            <Choice
              label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.763.44')}
              tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.763.44'), 'Settings.Tooltip.FrameRateLimit.Body')}
              value={fpsNumberToOption(video.frameRateLimit)}
              options={FPS_OPTIONS.map(v => ({ value: v, label: fpsOptionLabel(v) }))}
              onChange={v => setVideo({ frameRateLimit: fpsOptionToNumber(v) })}
            />
            {!dlssActive && (
              <SettingsSlider
                label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.764.45')}
                desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.764.16')}
                tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.764.45'), 'Settings.Tooltip.ResolutionScale.Body')}
                value={Math.round(video.resolutionScale)}
                min={50}
                max={200}
                suffix="%"
                onChange={v => setVideo({ resolutionScale: v })}
              />
            )}
            {settings.dlssSupported && (
              <Choice
                label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.766.46')}
                desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.766.17')}
                tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.766.46'), 'Settings.Tooltip.DLSS.Body')}
                value={video.dlssMode}
                options={DLSS_MODE_OPTIONS}
                onChange={v => setVideo({ dlssMode: v })}
              />
            )}
            {!dlssActive && (
              <Choice
                label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.768.53')}
                tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.768.53'), 'Settings.Tooltip.AntiAliasing.Body')}
                value={video.antiAliasing}
                options={ANTI_ALIASING_OPTIONS}
                onChange={v => setVideo({ antiAliasing: v })}
              />
            )}
            <SettingsSlider
              label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.769.57')}
              tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.769.57'), 'Settings.Tooltip.Gamma.Body')}
              value={Math.round(video.gamma * 100)}
              min={150}
              max={300}
              display={video.gamma.toFixed(2)}
              onChange={v => applyLiveVideo({ gamma: v / 100 })}
            />
            <SettingsSlider
              label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.770.58')}
              tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.770.58'), 'Settings.Tooltip.Brightness.Body')}
              value={Math.round(video.brightness * 100)}
              min={-200}
              max={200}
              display={video.brightness.toFixed(2)}
              onChange={v => applyLiveVideo({ brightness: v / 100 })}
            />
            <SectionHeading title={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.771.59')} variant="ornate" />
            <Dropdown
              label={webUIText('Settings.GraphicsQuality.Overall')}
              tooltip={settingsTooltip(webUIText('Settings.GraphicsQuality.Overall'), 'Settings.Tooltip.OverallQuality.Body')}
              value={getOverallGraphicsQuality(graphics)}
              options={OVERALL_GRAPHICS_QUALITY_OPTIONS}
              onChange={v => {
                const quality = parseInt(v, 10);
                if (!Number.isFinite(quality)) return;
                setGraphics(makeOverallGraphicsQualityPatch(quality));
              }}
            />
            {GRAPHICS_QUALITY_KEYS.map(key => (
              <Choice key={key} label={graphicsQualityLabel(key)} tooltip={graphicsQualityTooltip(key)} value={graphics[key].toString()} options={GRAPHICS_QUALITY_OPTIONS} onChange={v => setGraphics({ [key]: parseInt(v, 10) } as Partial<typeof graphics>)} />
            ))}
            <Toggle label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.775.64')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.775.18')} tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.775.64'), 'Settings.Tooltip.ProvinceBorders.Body')} checked={graphics.showProvinceBorders} onChange={() => setGraphics({ showProvinceBorders: !graphics.showProvinceBorders })} />
            <Toggle label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.776.65')} desc={webUIText('Auto.ExtraAttr.ComponentsSettingsSettingsPanel.776.19')} tooltip={settingsTooltip(webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.776.65'), 'Settings.Tooltip.FpsCounter.Body')} checked={graphics.showFpsCounter} onChange={() => setGraphics({ showFpsCounter: !graphics.showFpsCounter })} />
            <SectionHeading title={webUIText('Settings.Glances.Title')} variant="ornate" />
            <Dropdown label={webUIText('Settings.GlanceDensity.Label')} desc={webUIText('Settings.GlanceDensity.Description')} tooltip={settingsTooltip(webUIText('Settings.GlanceDensity.Label'), 'Settings.Tooltip.GlanceDensity.Body')} value={graphics.glanceDensity} options={GLANCE_DENSITY_OPTIONS} onChange={v => setGraphics({ glanceDensity: v })} />
            <Toggle label={webUIText('Settings.ShowSettlementGlances.Label')} desc={webUIText('Settings.ShowSettlementGlances.Description')} tooltip={settingsTooltip(webUIText('Settings.ShowSettlementGlances.Label'), 'Settings.Tooltip.SettlementGlances.Body')} checked={graphics.showSettlementGlances} onChange={() => setGraphics({ showSettlementGlances: !graphics.showSettlementGlances })} />
            <Toggle label={webUIText('Settings.ShowMilitaryGlances.Label')} desc={webUIText('Settings.ShowMilitaryGlances.Description')} tooltip={settingsTooltip(webUIText('Settings.ShowMilitaryGlances.Label'), 'Settings.Tooltip.MilitaryGlances.Body')} checked={graphics.showMilitaryGlances} onChange={() => setGraphics({ showMilitaryGlances: !graphics.showMilitaryGlances })} />
            <Toggle label={webUIText('Settings.ShowConvoyGlances.Label')} desc={webUIText('Settings.ShowConvoyGlances.Description')} tooltip={settingsTooltip(webUIText('Settings.ShowConvoyGlances.Label'), 'Settings.Tooltip.ConvoyGlances.Body')} checked={graphics.showConvoyGlances} onChange={() => setGraphics({ showConvoyGlances: !graphics.showConvoyGlances })} />
          </div>
        )}

        {settingsTab === 'audio' && (
          <div className="settings-panel">
            <SettingsSlider label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.782.66')} value={toPercent(audioMaster)} suffix="%" onChange={v => applyLiveAudio({ master: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.783.67')} value={toPercent(audioMusic)} suffix="%" onChange={v => applyLiveAudio({ music: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.784.68')} value={toPercent(audioEffects)} suffix="%" onChange={v => applyLiveAudio({ effects: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Settings.UIVolume.Label')} desc={webUIText('Settings.UIVolume.Description')} value={toPercent(audioUi)} suffix="%" onChange={v => applyLiveAudio({ ui: fromPercent(v) })} />
            <SettingsSlider label={webUIText('Settings.AmbienceVolume.Label')} desc={webUIText('Settings.AmbienceVolume.Description')} value={toPercent(audioAmbience)} suffix="%" onChange={v => applyLiveAudio({ ambience: fromPercent(v) })} />
          </div>
        )}

        {settingsTab === 'controls' && (
          <ControlsTab
            controls={settings.controls}
            rebind={handleRebind}
            clearBinding={handleClearBinding}
          />
        )}

        {settingsTab === 'events' && (
          <EventsTab
            llmProvider={gameplay.llmProvider}
            localLlmModel={gameplay.localLlmModel}
            eventFrequency={gameplay.eventFrequency}
            models={llmModelOptions}
            hardware={settings.hardware}
            setGameplay={setGameplay}
          />
        )}

        {settingsTab === 'notifications' && (
          <NotificationsTab
            notifications={settings.notifications}
            notificationDurationMultiplier={gameplay.notificationDurationMultiplier}
            setMuted={handleSetNotificationMuted}
            resetMutes={handleResetNotificationMutes}
            setGameplay={setGameplay}
          />
        )}
      </StyledScrollArea>
      <div className="settings-footer">
        {isDirty && <span className="settings-dirty-indicator"><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.816.10" /></span>}
        <GameButton variant="outline" onClick={handleReset}>{resetButtonLabel}</GameButton>
        <GameButton variant="burgundy" disabled={!isDirty} onClick={handleApply}><WebUIText textKey="Auto.ComponentsSettingsSettingsPanel.817.11" /></GameButton>
      </div>
    </>
  );
};

export default SettingsPanel;
