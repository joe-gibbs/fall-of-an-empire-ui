const HOVER_EVENT = 'foae:selected-military-connector-hover';

export function setSelectedMilitaryConnectorHover(id: string | null): void {
  window.dispatchEvent(new CustomEvent(HOVER_EVENT, { detail: { id } }));
}

export function onSelectedMilitaryConnectorHover(callback: (id: string | null) => void): () => void {
  const handleHover = (event: Event) => {
    const id = (event as CustomEvent<{ id?: string | null }>).detail?.id;
    callback(typeof id === 'string' ? id : null);
  };
  window.addEventListener(HOVER_EVENT, handleHover);
  return () => window.removeEventListener(HOVER_EVENT, handleHover);
}
