type WorldAnchorContentChangeHandler = (element: HTMLElement) => void;

let activeHandler: WorldAnchorContentChangeHandler | null = null;

export function registerWorldAnchorContentChangeHandler(handler: WorldAnchorContentChangeHandler): () => void {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) {
      activeHandler = null;
    }
  };
}

export function prepareWorldAnchorContentChange(element: HTMLElement) {
  activeHandler?.(element);
}
