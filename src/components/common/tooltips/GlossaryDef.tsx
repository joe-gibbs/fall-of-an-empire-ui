import type { ReactNode } from 'react';
import { getGlossaryEntry } from '../../../data/glossary';
import { NestedTooltip } from './Tooltip';

interface GlossaryDefProps {
  termId: string;
  children: ReactNode;
}

/**
 * Glossary term from rich-text `<def id="Term">label</>`. Shows a nested
 * glossary tooltip when the term is known; otherwise renders plain text so we
 * never paint a help affordance that does nothing.
 */
export default function GlossaryDef({ termId, children }: GlossaryDefProps) {
  const entry = getGlossaryEntry(termId);
  if (!entry) {
    return <>{children}</>;
  }

  return (
    <NestedTooltip content={entry} inline delay={150}>
      <span className="rich-def">{children}</span>
    </NestedTooltip>
  );
}
