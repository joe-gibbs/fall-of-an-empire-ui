import type { DisplayTextLine } from '../data/types';

export function displayTextToPlain(lines?: DisplayTextLine[]): string {
  return (lines ?? [])
    .map(line => (line.segments ?? []).map(segment => segment.text).join(''))
    .join('\n')
    .trim();
}
