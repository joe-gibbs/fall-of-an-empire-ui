import React from 'react';
import { WebkilnAssetPath } from './assets';

export interface RichTextOptions {
  onLinkClick?: (type: string, id: string) => void;
  onLinkDoubleClick?: (type: string, id: string) => void;
  /**
   * Render `<def>` contents without the definition span. Use this on compact
   * HUD surfaces where glossary hover styling would break line flow.
   */
  plainDefinitions?: boolean;
  /**
   * Render `<bullet>` rows as block elements. Useful for surfaces that need a
   * compact vertical list rather than inline rich-text flow.
   */
  blockBullets?: boolean;
  /**
   * Applied to each raw text run between tags. Use this for pattern-based
   * transforms (e.g. wrapping `{Name}` markers in a highlight span) without
   * having to pre-parse the XML yourself.
   */
  transformText?: (text: string, key: string) => React.ReactNode;
  /**
   * CSS class prefix used for `<link>` tags. Defaults to `rich-link` (so the
   * rendered class is `rich-link rich-link--<type>`). Event popups and other
   * surfaces with existing styling can override this to reuse their own class.
   */
  linkClassPrefix?: string;
  /**
   * Replace the whitespace immediately before links with a non-breaking space.
   * Compact notifications use this so phrases like "at <link>Settlement</>"
   * do not split between the preposition and linked name. The following
   * whitespace is preserved too because Webkiln can drop a regular leading
   * space text node after an inline link.
   */
  keepLinksWithPreviousWord?: boolean;
}

/**
 * Renders the XML-style rich text emitted by the game (see AGENTS.md "Rich
 * Text Tags"). Supported tags: `<link type="X" id="Y">...</>`, `<bold>...</>`,
 * `<header>...</>`, `<colour NAME>...</>` (named or #RRGGBB), `<colour>...</>`,
 * and `<concept id="X"/>` (rendered as an inline icon). Unknown tags are
 * dropped but their children are preserved. Closing uses UE's `</>` form.
 */
type Token =
  | { kind: 'text'; text: string }
  | { kind: 'open'; tag: string; attrs: Record<string, string>; flags: Set<string> }
  | { kind: 'self'; tag: string; attrs: Record<string, string>; flags: Set<string> }
  | { kind: 'close' };

const TAG_RE = /<\/>|<([a-z]+)((?:\s[^>]*)?)(\/)?>/gi;
const ATTR_RE = /([a-zA-Z][a-zA-Z0-9_-]*)(?:=(?:"([^"]*)"|'([^']*)'))?/g;

const COLOUR_MAP: Record<string, string> = {
  green: 'var(--green)',
  red: 'var(--red)',
  muted: 'var(--text-muted)',
  yellow: 'var(--yellow)',
  blue: 'var(--blue)',
  orange: 'var(--orange)',
  white: '#fff',
  black: '#000',
};

function parseAttrs(raw: string): { attrs: Record<string, string>; flags: Set<string> } {
  const attrs: Record<string, string> = {};
  const flags = new Set<string>();
  if (!raw) return { attrs, flags };
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw))) {
    const value = m[2] ?? m[3];
    if (value !== undefined) attrs[m[1].toLowerCase()] = value;
    else flags.add(m[1].toLowerCase());
  }
  return { attrs, flags };
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  TAG_RE.lastIndex = 0;
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(input))) {
    if (m.index > cursor) {
      tokens.push({ kind: 'text', text: input.slice(cursor, m.index) });
    }
    if (m[0] === '</>') {
      tokens.push({ kind: 'close' });
    } else {
      const { attrs, flags } = parseAttrs(m[2] ?? '');
      tokens.push({
        kind: m[3] ? 'self' : 'open',
        tag: m[1].toLowerCase(),
        attrs,
        flags,
      });
    }
    cursor = TAG_RE.lastIndex;
  }
  if (cursor < input.length) {
    tokens.push({ kind: 'text', text: input.slice(cursor) });
  }
  return tokens;
}

interface Frame {
  tag: string;
  attrs: Record<string, string>;
  flags: Set<string>;
  children: React.ReactNode[];
  preserveLeadingWhitespace?: boolean;
}

function wrapFrame(frame: Frame, opts: RichTextOptions, key: string): React.ReactNode {
  switch (frame.tag) {
    case 'link': {
      const type = frame.attrs.type ?? '';
      const id = frame.attrs.id ?? '';
      const prefix = opts.linkClassPrefix ?? 'rich-link';
      return (
        <span
          key={key}
          className={`${prefix} ${prefix}--${type}${opts.onLinkClick ? ` ${prefix}--clickable` : ''}`}
          onMouseDown={opts.onLinkClick ? (e) => { e.stopPropagation(); opts.onLinkClick!(type, id); } : undefined}
          onDoubleClick={opts.onLinkDoubleClick ? (e) => { e.stopPropagation(); opts.onLinkDoubleClick!(type, id); } : undefined}
        >
          {frame.children}
        </span>
      );
    }
    case 'bold':
      return <strong key={key}>{frame.children}</strong>;
    case 'header':
      return <strong key={key} className="rich-header">{frame.children}</strong>;
    case 'bullet':
      if (opts.blockBullets) {
        return (
          <div key={key} className="rich-bullet">
            <span className="rich-bullet-mark" />
            <span className="rich-bullet-body">{frame.children}</span>
          </div>
        );
      }
      return (
        <span key={key} className="rich-bullet">
          <span className="rich-bullet-mark" />
          <span className="rich-bullet-body">{frame.children}</span>
        </span>
      );
    case 'hr':
      return <span key={key} className="rich-hr">{frame.children}</span>;
    case 'colour':
    case 'color': {
      const named = [...frame.flags][0] ?? '';
      const css = COLOUR_MAP[named] ?? (named.startsWith('#') ? named : undefined);
      return <span key={key} className="rich-colour" style={css ? { color: css } : undefined}>{frame.children}</span>;
    }
    case 'def':
      if (opts.plainDefinitions) {
        return <React.Fragment key={key}>{frame.children}</React.Fragment>;
      }
      return <span key={key} className="rich-def">{frame.children}</span>;
    default:
      return <React.Fragment key={key}>{frame.children}</React.Fragment>;
  }
}

function keepNextNodeWithPreviousWord(children: React.ReactNode[]): void {
  const lastIndex = children.length - 1;
  if (lastIndex < 0) return;

  const previous = children[lastIndex];
  if (typeof previous !== 'string' || previous.length === 0) return;

  children[lastIndex] = previous.replace(/[ \t\r\n]+$/, (match) => (
    match.length > 1 ? `${match.slice(0, -1)}\u00A0` : '\u00A0'
  ));
}

function preserveLeadingWhitespaceAfterInlineNode(text: string): string {
  if (/^[.,;:!?]/.test(text)) {
    return `\u2060${text}`;
  }
  return text.replace(/^[ \t\r\n]+/, (match) => (
    match.length > 1 ? `\u00A0${match.slice(1)}` : '\u00A0'
  ));
}

function preservesInlineSpacing(tag: string, opts: RichTextOptions): boolean {
  if (tag === 'link') return !!opts.keepLinksWithPreviousWord;
  return tag === 'bold'
    || tag === 'header'
    || tag === 'colour'
    || tag === 'color'
    || tag === 'def';
}

/**
 * Strips all rich-text tags from a string, leaving just the text content.
 * Use for contexts (like native tooltips) that cannot render React nodes.
 */
export function stripRichTags(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/<\/>|<[a-z]+(?:\s[^>]*)?\/?>/gi, '').trim();
}

export function renderRichText(input: string | null | undefined, opts: RichTextOptions = {}): React.ReactNode {
  if (!input) return null;
  const tokens = tokenize(input);

  const root: Frame = { tag: '', attrs: {}, flags: new Set(), children: [] };
  const stack: Frame[] = [root];
  let keyCounter = 0;
  const nextKey = () => `rt-${keyCounter++}`;

  for (const t of tokens) {
    const top = stack[stack.length - 1];
    if (t.kind === 'text') {
      let text = t.text;
      if (top.preserveLeadingWhitespace) {
        top.preserveLeadingWhitespace = false;
        text = preserveLeadingWhitespaceAfterInlineNode(text);
      }
      top.children.push(opts.transformText ? opts.transformText(text, nextKey()) : text);
    } else if (t.kind === 'self') {
      top.preserveLeadingWhitespace = false;
      if (t.tag === 'concept') {
        const id = t.attrs.id ?? '';
        top.children.push(
          <img
            key={nextKey()}
            className="rich-concept"
            src={WebkilnAssetPath(`/assets/icons/I_${id}.png`)}
            alt={id}
          />,
        );
      } else if (t.tag === 'br') {
        top.children.push(<br key={nextKey()} />);
      } else if (t.tag === 'hr') {
        top.children.push(<span key={nextKey()} className="rich-hr" />);
      }
      // Other self-closing tags are dropped.
    } else if (t.kind === 'open') {
      top.preserveLeadingWhitespace = false;
      stack.push({ tag: t.tag, attrs: t.attrs, flags: t.flags, children: [] });
    } else if (t.kind === 'close') {
      if (stack.length > 1) {
        const frame = stack.pop()!;
        const parent = stack[stack.length - 1];
        if (preservesInlineSpacing(frame.tag, opts)) {
          keepNextNodeWithPreviousWord(parent.children);
        }
        parent.children.push(wrapFrame(frame, opts, nextKey()));
        if (preservesInlineSpacing(frame.tag, opts)) {
          parent.preserveLeadingWhitespace = true;
        }
      }
    }
  }

  // Flush any unclosed frames.
  while (stack.length > 1) {
    const frame = stack.pop()!;
    const parent = stack[stack.length - 1];
    if (preservesInlineSpacing(frame.tag, opts)) {
      keepNextNodeWithPreviousWord(parent.children);
    }
    parent.children.push(wrapFrame(frame, opts, nextKey()));
    if (preservesInlineSpacing(frame.tag, opts)) {
      parent.preserveLeadingWhitespace = true;
    }
  }

  return <>{root.children}</>;
}
