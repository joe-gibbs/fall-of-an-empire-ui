import { webUIText } from '../../localization/WebUITextContext';
import './KeyGlyph.css';

export type KeyGlyphProps = {
  /** Glyph id from the bridge (InputDisplay::GetKeyGlyphId). Empty for plain text keys. */
  glyphId?: string;
  keyDisplay?: string;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  cmd?: boolean;
  className?: string;
};

const GLYPH_LABELS: Record<string, string> = {
  gamepad_a: 'A',
  gamepad_b: 'B',
  gamepad_x: 'X',
  gamepad_y: 'Y',
  gamepad_lb: 'LB',
  gamepad_rb: 'RB',
  gamepad_lt: 'LT',
  gamepad_rt: 'RT',
  gamepad_ls: 'L3',
  gamepad_rs: 'R3',
  gamepad_view: 'View',
  gamepad_menu: 'Menu',
  gamepad_dpad_up: '↑',
  gamepad_dpad_down: '↓',
  gamepad_dpad_left: '←',
  gamepad_dpad_right: '→',
  gamepad_lstick: 'LS',
  gamepad_rstick: 'RS',
  mouse_left: 'LMB',
  mouse_right: 'RMB',
  mouse_middle: 'MMB',
  mouse_wheel: 'Wheel',
};

function formatTextChord(props: KeyGlyphProps): string {
  const parts: string[] = [];
  if (props.ctrl) parts.push(webUIText('Settings.KeyModifier.Ctrl'));
  if (props.shift) parts.push(webUIText('Settings.KeyModifier.Shift'));
  if (props.alt) parts.push(webUIText('Settings.KeyModifier.Alt'));
  if (props.cmd) parts.push(webUIText('Settings.KeyModifier.Cmd'));
  parts.push(props.keyDisplay || webUIText('Settings.KeyUnbound'));
  return parts.join(' + ');
}

/**
 * Renders a key or gamepad button prompt. Gamepad face buttons use coloured
 * circle glyphs; other keys fall back to a compact keycap label.
 */
export function KeyGlyph(props: KeyGlyphProps) {
  const glyph = props.glyphId ?? '';
  const className = ['key-glyph', props.className].filter(Boolean).join(' ');

  if (glyph.startsWith('gamepad_')) {
    const label = GLYPH_LABELS[glyph] ?? props.keyDisplay ?? '?';
    const face = glyph === 'gamepad_a' || glyph === 'gamepad_b' || glyph === 'gamepad_x' || glyph === 'gamepad_y';
    const modParts: string[] = [];
    if (props.ctrl) modParts.push('Ctrl');
    if (props.shift) modParts.push('Shift');
    if (props.alt) modParts.push('Alt');

    return (
      <span className={className} aria-label={formatTextChord(props)}>
        {modParts.length > 0 && (
          <span className="key-glyph__mod">{modParts.join(' + ')} + </span>
        )}
        <span
          className={[
            'key-glyph__pad',
            face ? 'key-glyph__pad--face' : 'key-glyph__pad--wide',
            `key-glyph__pad--${glyph.replace('gamepad_', '')}`,
          ].join(' ')}
        >
          {label}
        </span>
      </span>
    );
  }

  if (glyph.startsWith('mouse_')) {
    const label = GLYPH_LABELS[glyph] ?? props.keyDisplay ?? '?';
    return (
      <span className={className} aria-label={formatTextChord(props)}>
        <span className={`key-glyph__mouse key-glyph__mouse--${glyph.replace('mouse_', '')}`}>
          {label}
        </span>
      </span>
    );
  }

  return (
    <span className={`${className} key-glyph__keycap`} aria-label={formatTextChord(props)}>
      {formatTextChord(props)}
    </span>
  );
}

export default KeyGlyph;
