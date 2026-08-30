import StructuredDisplayText, { type DisplayTextLine } from '../layout/content/StructuredDisplayText';
import { webUIText } from '../../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../../utils/assets';
import { conceptIconPath } from '../../../utils/iconMaps';
import './InteractionEffectsTooltip.css';

interface InteractionEffectsTooltipProps {
  lines?: DisplayTextLine[];
}

function EffectRow({ line }: { line: DisplayTextLine }) {
  return (
    <div className="interaction-effects-tooltip__effect">
      <div className="interaction-effects-tooltip__effect-icon" aria-hidden="true">
        {line.conceptId ? (
          <img src={WebkilnAssetPath(conceptIconPath(line.conceptId))} alt="" draggable={false} />
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
  );
}

export default function InteractionEffectsTooltip({ lines = [] }: InteractionEffectsTooltipProps) {
  if (lines.length === 0) return null;

  const successLines = lines.filter(line => line.kind === 'outcome-success');
  const failureLines = lines.filter(line => line.kind === 'outcome-failure');
  const effectLines = lines.filter(line => line.kind === 'effect');
  const otherLines = lines.filter(line => {
    const kind = line.kind;
    return kind !== 'outcome-success' && kind !== 'outcome-failure' && kind !== 'effect' && kind !== 'header';
  });

  if (successLines.length + failureLines.length + effectLines.length + otherLines.length === 0) {
    return null;
  }

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
              <EffectRow key={index} line={line} />
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
        {effectLines.length > 0 && (
          <div className="interaction-effects-tooltip__outcome interaction-effects-tooltip__outcome--effects">
            <div className="interaction-effects-tooltip__outcome-content">
              <div className="interaction-effects-tooltip__outcome-lines">
                {effectLines.map((line, index) => (
                  <EffectRow key={index} line={line} />
                ))}
              </div>
            </div>
          </div>
        )}
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
