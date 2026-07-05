import { formatSignedNumber } from '../../utils/numberFormat';
import { webUIText } from '../../localization/WebUITextContext';

type InlineKind = 'load' | 'capacity';
type Tone = 'good' | 'bad' | 'neutral';

function inlineTone(value: number, kind: InlineKind): Tone {
  if (value === 0) return 'neutral';
  if (kind === 'capacity') return value > 0 ? 'good' : 'bad';
  return value > 0 ? 'bad' : 'good';
}

function inlineText(value: number, kind: InlineKind): string {
  if (kind === 'capacity') {
    return webUIText('BureaucracyMock.Inline.CapacityValue', { Value: formatSignedNumber(value) });
  }
  if (value === 0) {
    return webUIText('BureaucracyMock.Inline.NoLoad');
  }
  return webUIText('BureaucracyMock.Inline.LoadValue', { Load: formatSignedNumber(value) });
}

export function bureaucraticTooltipLine(value: number, kind: InlineKind = 'load') {
  const tone = inlineTone(value, kind);
  return {
    label: webUIText('BureaucracyMock.Inline.Label'),
    value: inlineText(value, kind),
    valueIcon: '/assets/power-blocs/BureaucracyBloc.png',
    valueColor: tone === 'good' ? 'var(--green)' : tone === 'bad' ? 'var(--orange)' : 'var(--text-muted)',
  };
}
