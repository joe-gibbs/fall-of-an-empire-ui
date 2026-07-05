import React from 'react';
import { FoaeCefUIAssetPath } from '../../../../utils/assets';

export interface DisplayTextSegment {
  text: string;
  tone?: string;
  conceptId?: string;
  linkType?: string;
  linkId?: string;
  isStrong?: boolean;
}

export interface DisplayTextLine {
  kind?: string;
  tone?: string;
  conceptId?: string;
  segments?: DisplayTextSegment[];
}

interface StructuredDisplayTextProps {
  lines?: DisplayTextLine[];
  className?: string;
  lineClassName?: string;
  onLinkClick?: (type: string, id: string) => void;
  onLinkDoubleClick?: (type: string, id: string) => void;
  transformText?: (text: string, key: string) => React.ReactNode;
}

function toneClass(tone?: string): string {
  return tone && !tone.startsWith('#') ? ` structured-text-tone--${tone}` : '';
}

function toneStyle(tone?: string): React.CSSProperties | undefined {
  return tone?.startsWith('#') ? { color: tone } : undefined;
}

function Segment({
  segment,
  indexKey,
  onLinkClick,
  onLinkDoubleClick,
  transformText,
}: {
  segment: DisplayTextSegment;
  indexKey: string;
  onLinkClick?: (type: string, id: string) => void;
  onLinkDoubleClick?: (type: string, id: string) => void;
  transformText?: (text: string, key: string) => React.ReactNode;
}) {
  const icon = segment.conceptId && !segment.text
    ? <img className="structured-text-concept" src={FoaeCefUIAssetPath(`/assets/icons/I_${segment.conceptId}.png`)} alt="" draggable={false} />
    : null;
  const content = icon ?? (transformText ? transformText(segment.text, indexKey) : segment.text);
  const className = [
    'structured-text-segment',
    segment.isStrong ? 'structured-text-segment--strong' : '',
    segment.conceptId ? 'structured-text-segment--concept' : '',
    toneClass(segment.tone),
  ].filter(Boolean).join(' ');

  if (segment.linkType && segment.linkId && onLinkClick) {
    return (
      <button
        type="button"
        className={`${className} structured-text-link`}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onLinkClick(segment.linkType!, segment.linkId!);
        }}
        onDoubleClick={onLinkDoubleClick ? (event) => {
          event.preventDefault();
          event.stopPropagation();
          onLinkDoubleClick(segment.linkType!, segment.linkId!);
        } : undefined}
        style={toneStyle(segment.tone)}
      >
        {content}
      </button>
    );
  }

  return <span className={className} style={toneStyle(segment.tone)}>{content}</span>;
}

export default function StructuredDisplayText({
  lines,
  className,
  lineClassName,
  onLinkClick,
  onLinkDoubleClick,
  transformText,
}: StructuredDisplayTextProps) {
  const visibleLines = (lines ?? []).filter(line => (line.segments ?? []).length > 0 || line.kind === 'hr');
  if (visibleLines.length === 0) return null;

  return (
    <div className={['structured-text', className ?? ''].filter(Boolean).join(' ')}>
      {visibleLines.map((line, lineIndex) => {
        if (line.kind === 'hr') {
          return <div key={lineIndex} className="structured-text-rule" />;
        }

        const kind = line.kind || 'body';
        const lineClasses = [
          'structured-text-line',
          `structured-text-line--${kind}`,
          line.conceptId ? 'structured-text-line--has-concept' : '',
          toneClass(line.tone),
          lineClassName ?? '',
        ].filter(Boolean).join(' ');

        return (
          <div key={lineIndex} className={lineClasses} style={toneStyle(line.tone)}>
            {kind === 'bullet' && <span className="structured-text-bullet" aria-hidden="true">-</span>}
            <span className="structured-text-line-copy">
              {(line.segments ?? []).map((segment, segmentIndex) => (
                <Segment
                  key={segmentIndex}
                  segment={segment}
                  indexKey={`${lineIndex}-${segmentIndex}`}
                  onLinkClick={onLinkClick}
                  onLinkDoubleClick={onLinkDoubleClick}
                  transformText={transformText}
                />
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
