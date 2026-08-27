import type { ReactNode } from 'react';
import type { ActionBindingLike } from '../../utils/actionBindings';
import { ActionKeyGlyph } from './ActionKeyGlyph';

/** Tooltip footer showing a single keycap, right-aligned. */
export function actionBindingFooter(
  binding: ActionBindingLike | null | undefined,
): ReactNode | undefined {
  if (!binding) return undefined;
  const keyDisplay = (binding.keyDisplay || binding.keyName || '').trim();
  if (!keyDisplay && !binding.glyphId) return undefined;
  return (
    <span className="tt-footer-shortcut">
      <ActionKeyGlyph binding={binding} />
    </span>
  );
}
