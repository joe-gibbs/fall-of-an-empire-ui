import StructuredDisplayText, { type DisplayTextLine } from '../layout/content/StructuredDisplayText';
import { webUIText } from '../../../localization/WebUITextContext';
import './InteractionEffectsTooltip.css';

interface InteractionEffectsTooltipProps {
  lines?: DisplayTextLine[];
}

export default function InteractionEffectsTooltip({ lines = [] }: InteractionEffectsTooltipProps) {
  if (lines.length === 0) return null;

  return (
    <div className="interaction-effects-tooltip">
      <div className="interaction-effects-tooltip__title">{webUIText('InteractionCard.Effects')}</div>
      <StructuredDisplayText
        lines={lines}
        className="interaction-effects-tooltip__lines"
        lineClassName="interaction-effects-tooltip__line"
      />
    </div>
  );
}
