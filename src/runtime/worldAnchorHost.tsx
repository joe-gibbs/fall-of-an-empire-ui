import { type ReactNode } from 'react';

/**
 * The atlas page only owns the game-specific plate content. Webkiln discovers and packs every
 * descendant carrying data-webkiln-anchor, maintains paint-safe atlas generations and forwards
 * pointer input from the main view to the matching DOM cell.
 */
export default function WorldAnchorHost({ children }: { children: ReactNode }) {
  return <div className="world-anchor-atlas-root">{children}</div>;
}
