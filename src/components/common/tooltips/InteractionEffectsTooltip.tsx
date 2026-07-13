import StructuredDisplayText, { type DisplayTextLine } from '../layout/content/StructuredDisplayText';
import { webUIText } from '../../../localization/WebUITextContext';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import './InteractionEffectsTooltip.css';

interface InteractionEffectsTooltipProps {
  lines?: DisplayTextLine[];
}

export default function InteractionEffectsTooltip({ lines = [] }: InteractionEffectsTooltipProps) {
  if (lines.length === 0) return null;

  const successLines = lines.filter(line => line.kind === 'outcome-success');
  const failureLines = lines.filter(line => line.kind === 'outcome-failure');
  const otherLines = lines.filter(line => line.kind !== 'outcome-success' && line.kind !== 'outcome-failure');

  const outcomeGroup = (kind: 'success' | 'failure', outcomeLines: DisplayTextLine[]) => {
    if (outcomeLines.length === 0) return null;

    return (
      <div className={`interaction-effects-tooltip__outcome interaction-effects-tooltip__outcome--${kind}`}>
        <div className="interaction-effects-tooltip__outcome-content">
          <div className="interaction-effects-tooltip__outcome-label">
            {webUIText(kind === 'success' ? 'InteractionCard.OnSuccess' : 'InteractionCard.OnFailure')}
          </div>
          <div className="interaction-effects-tooltip__outcome-lines">
            {outcomeLines.map((line, index) => (
              <div className="interaction-effects-tooltip__effect" key={index}>
                <div className="interaction-effects-tooltip__effect-icon" aria-hidden="true">
                  {line.conceptId ? (
                    <img src={FoaeCefUIAssetPath(`/assets/icons/I_${line.conceptId}.png`)} alt="" draggable={false} />
                  ) : (
                    <span className="interaction-effects-tooltip__effect-marker" />
                  )}
                </div>
                <StructuredDisplayText
                  lines={[line]}
                  className="interaction-effects-tooltip__effect-copy"
                  lineClassName="interaction-effects-tooltip__outcome-line"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="interaction-effects-tooltip">
      <div className="interaction-effects-tooltip__title">{webUIText('InteractionCard.Effects')}</div>
      <div className="interaction-effects-tooltip__outcomes">
        {outcomeGroup('success', successLines)}
        {outcomeGroup('failure', failureLines)}
      </div>
      {otherLines.length > 0 && (
        <StructuredDisplayText
          lines={otherLines}
          className="interaction-effects-tooltip__lines"
          lineClassName="interaction-effects-tooltip__line"
        />
      )}
    </div>
  );
}
