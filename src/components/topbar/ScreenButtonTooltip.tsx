import React from 'react';
import type { TooltipLine } from '../common/tooltips/Tooltip';

export function ScreenButtonTooltipBody({ body, lines }: { body?: React.ReactNode; lines: TooltipLine[] }) {
  return (
    <div className="screen-button-tooltip-flow">
      {body && <div className="screen-button-tooltip-body-text">{body}</div>}
      {lines.length > 0 && (
        <>
          <div className="screen-button-tooltip-rule"><span /><span /></div>
          <div className="screen-button-tooltip-lines">
            {lines.map((line, index) => (
              <div key={index} className="screen-button-tooltip-line" style={line.labelColor ? { color: line.labelColor } : undefined}>
                {line.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
