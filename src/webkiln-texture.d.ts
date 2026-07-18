import type { DetailedHTMLProps, HTMLAttributes } from 'react';

interface WebkilnTextureAttributes extends HTMLAttributes<HTMLElement> {
  source?: string;
  src?: string;
  mode?: 'auto' | 'native' | 'dom';
  'native-layer'?: 'above' | 'below';
  alt?: string;
}

declare global {
  interface Window {
    webkiln?: {
      anchors?: {
        refresh(element?: Element): void;
        repack(): void;
      };
      input?: {
        configure(configuration: {
          cursorSelectors?: Partial<Record<'pointer' | 'text' | 'grab' | 'grabbing' | 'blocked' | 'crosshair' | 'help', string>>;
        }): void;
        refresh(): void;
      };
      localisation?: {
        readonly locale: string;
        text(key: string, args?: Record<string, string | number | boolean | null | undefined>, fallback?: string): string;
        subscribe(listener: (locale: string) => void): () => void;
      };
    };
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'webkiln-texture': DetailedHTMLProps<WebkilnTextureAttributes, HTMLElement>;
    }
  }
}
