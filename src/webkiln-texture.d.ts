import type { DetailedHTMLProps, HTMLAttributes } from 'react';

interface WebkilnTextureAttributes extends HTMLAttributes<HTMLElement> {
  source?: string;
  src?: string;
  mode?: 'auto' | 'native' | 'dom';
  'native-layer'?: 'above' | 'below';
  alt?: string;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'webkiln-texture': DetailedHTMLProps<WebkilnTextureAttributes, HTMLElement>;
    }
  }
}
