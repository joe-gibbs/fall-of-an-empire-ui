import type { ReactNode } from 'react';
import { FoaeCefUIAssetPath } from '../../../../utils/assets';

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

export function ModeRows({ children }: { children: ReactNode }) {
  return <div className="province-tooltip-mode-rows">{children}</div>;
}

export function ModeRow({ label, value, tone, colour, icon }: RowProps) {
  if (!value) {
    return null;
  }

  return (
    <div className="province-tooltip-mode-row">
      {icon && <img className="province-tooltip-mode-icon" src={FoaeCefUIAssetPath(icon)} alt="" />}
      <span className="province-tooltip-mode-label">{label}</span>
      <span className={toneClass(tone)} style={colour ? { color: colour } : undefined}>{value}</span>
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
