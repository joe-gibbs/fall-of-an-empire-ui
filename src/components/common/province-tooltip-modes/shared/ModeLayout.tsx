import { Children, isValidElement, type ReactNode } from 'react';
import { WebkilnAssetPath } from '../../../../utils/assets';
import { readableFactionTextColour } from '../../../../utils/colorFormatters';

interface RowProps {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'muted' | 'warning';
  colour?: string;
  icon?: string;
}

interface SectionProps {
  title?: string;
  children: ReactNode;
}

function toneClass(tone?: RowProps['tone']): string {
  return tone ? `province-tooltip-mode-value province-tooltip-mode-value--${tone}` : 'province-tooltip-mode-value';
}

function rowUsesIcon(node: ReactNode): boolean {
  if (!isValidElement(node)) {
    return false;
  }

  const props = node.props as { icon?: string; children?: ReactNode };
  if (typeof props.icon === 'string' && props.icon.length > 0) {
    return true;
  }

  return Children.toArray(props.children).some(rowUsesIcon);
}

export function ModeRows({ children }: { children: ReactNode }) {
  const hasIcons = Children.toArray(children).some(rowUsesIcon);
  return (
    <div className={hasIcons ? 'province-tooltip-mode-rows province-tooltip-mode-rows--icons' : 'province-tooltip-mode-rows'}>
      {children}
    </div>
  );
}

export function ModeRow({ label, value, tone, colour, icon }: RowProps) {
  if (!value) {
    return null;
  }

  return (
    <div className="province-tooltip-mode-row">
      <span className="province-tooltip-mode-icon">
        {icon ? <img src={WebkilnAssetPath(icon)} alt="" /> : null}
      </span>
      <span className="province-tooltip-mode-label">{label}</span>
      <span className={toneClass(tone)} style={colour ? { color: readableFactionTextColour(colour) } : undefined}>{value}</span>
    </div>
  );
}

export function ModeSection({ title, children }: SectionProps) {
  return (
    <div className="province-tooltip-mode-section">
      {title && <div className="province-tooltip-mode-section-title">{title}</div>}
      {children}
    </div>
  );
}

export function ModeNote({ children, tone }: { children: ReactNode; tone?: RowProps['tone'] }) {
  return <div className={toneClass(tone)}>{children}</div>;
}

export function ModeBullet({ children, tone }: { children: ReactNode; tone?: RowProps['tone'] }) {
  return (
    <div className="province-tooltip-mode-bullet">
      <span className="province-tooltip-mode-bullet-mark" />
      <span className={toneClass(tone)}>{children}</span>
    </div>
  );
}
