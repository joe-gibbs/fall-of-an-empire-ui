import { useState, useEffect } from 'react';

/**
 * Returns false on the first render, true after one animation frame.
 * Use this to defer heavy content so the screen shell can paint and
 * start its entrance animation before mounting expensive children.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}
