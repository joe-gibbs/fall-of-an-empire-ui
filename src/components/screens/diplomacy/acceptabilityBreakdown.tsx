import type { ReactNode } from 'react';
import { renderRichText, stripRichTags } from '../../../utils/richText';

function normaliseBreakdownLine(line: string): string {
  return line.replace(/<bold>([^<>]*)<\/>:/gi, '<bold>$1:</>');
}

function isBoldOnlyLine(line: string): boolean {
  return /^<bold>[^<>]+<\/>$/.test(line.trim());
}

function renderBreakdownLine(line: string, index: number) {
  const normalised = normaliseBreakdownLine(line.trim());
  if (!normalised) return null;
  if (normalised === '<hr></>' || normalised === '<hr/>') {
    return <div key={index} className="pns-acceptability-rule" />;
  }

  const resultMatch = normalised.match(/^<bold>([^<>]+):<\/>\s*(.*)$/i);
  if (resultMatch) {
    const label = stripRichTags(resultMatch[1]);
    const value = resultMatch[2];
    const isOutcome = label.toLowerCase() === 'outcome' || stripRichTags(value).length > 34;
    return (
      <div key={index} className={`pns-acceptability-result${isOutcome ? ' pns-acceptability-result--outcome' : ''}`}>
        <span className="pns-acceptability-result-label">{label}</span>
        <span className="pns-acceptability-result-value">{renderRichText(value)}</span>
      </div>
    );
  }

  if (isBoldOnlyLine(normalised)) {
    return (
      <div key={index} className="pns-acceptability-section">
        {renderRichText(normalised)}
      </div>
    );
  }

  return (
    <div key={index} className="pns-acceptability-line">
      {renderRichText(normalised, { blockBullets: true })}
    </div>
  );
}

export function renderAcceptabilityBreakdown(input: string): ReactNode {
  const lines = input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length > 1 && isBoldOnlyLine(lines[0])) {
    lines.shift();
  }

  return (
    <div className="pns-acceptability-tooltip-body">
      {lines.map(renderBreakdownLine)}
    </div>
  );
}
