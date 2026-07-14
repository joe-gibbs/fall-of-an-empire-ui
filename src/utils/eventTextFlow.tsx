import type { ReactNode } from 'react';

function isWhitespaceChar(value: string): boolean {
  return value.trim().length === 0;
}

function pushEventTextNodes(nodes: ReactNode[], text: string, nextKey: () => string): void {
  let token = '';
  let pendingSpace = false;

  const flushSpace = () => {
    if (!pendingSpace) return;
    nodes.push(<span key={nextKey()} className="event-space"> </span>);
    pendingSpace = false;
  };

  const flushToken = () => {
    if (!token) return;
    flushSpace();
    nodes.push(
      <span key={nextKey()} className="event-token">
        {token}
      </span>,
    );
    token = '';
  };

  for (const char of text) {
    if (isWhitespaceChar(char)) {
      flushToken();
      pendingSpace = true;
    } else {
      token += char;
    }
  }

  flushToken();
  flushSpace();
}

export function renderEventTextChunk(text: string, key: string): ReactNode {
  const nodes: ReactNode[] = [];
  let keyCounter = 0;
  const nextKey = () => `${key}-${String(keyCounter++)}`;
  let cursor = 0;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '{') {
      const closeIndex = text.indexOf('}', index + 1);
      if (closeIndex > index + 1) {
        if (index > cursor) {
          pushEventTextNodes(nodes, text.slice(cursor, index), nextKey);
        }
        nodes.push(
          <span key={nextKey()} className="event-token character-name">
            {text.slice(index + 1, closeIndex)}
          </span>,
        );
        index = closeIndex;
        cursor = closeIndex + 1;
        continue;
      }
    }
  }

  if (cursor < text.length) {
    pushEventTextNodes(nodes, text.slice(cursor), nextKey);
  }

  return nodes;
}
