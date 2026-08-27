import type { ActionBindingLike } from '../../utils/actionBindings';
import { KeyGlyph } from './KeyGlyph';

export type ActionKeyGlyphProps = {
  binding: ActionBindingLike | null | undefined;
  className?: string;
};

/** KeyGlyph from a live settings control binding. Null when unbound. */
export function ActionKeyGlyph({ binding, className }: ActionKeyGlyphProps) {
  if (!binding) return null;

  const keyDisplay = (binding.keyDisplay || binding.keyName || '').trim();
  if (!keyDisplay && !binding.glyphId) return null;

  return (
    <KeyGlyph
      className={className}
      keyDisplay={keyDisplay}
      glyphId={binding.glyphId}
      shift={Boolean(binding.shift)}
      ctrl={Boolean(binding.ctrl)}
      alt={Boolean(binding.alt)}
      cmd={Boolean(binding.cmd)}
    />
  );
}

export default ActionKeyGlyph;
