import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SOURCE_DIR = path.resolve(__dirname, '..', 'src');

function loadRuntimeCapabilities() {
  const manifestPath = path.resolve(__dirname, 'gameui-runtime-capabilities.json');
  if (!fs.existsSync(manifestPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return {};
  }
}

const RUNTIME_CAPABILITIES = loadRuntimeCapabilities();
const RUNTIME_POLICY = RUNTIME_CAPABILITIES.policy ?? {};
const RUNTIME_SUPPORTED_INPUT_TYPES = RUNTIME_CAPABILITIES.runtime?.supportedInputTypes;
const RUNTIME_NAME = RUNTIME_CAPABILITIES.runtime?.name ?? '';

const POINTER_EVENT_NAMES = new Set(RUNTIME_POLICY.unsupportedEventNames ?? [
  'pointerover',
  'pointerenter',
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'pointerout',
  'pointerleave',
  'gotpointercapture',
  'lostpointercapture',
]);

const UNSUPPORTED_POINTER_CAPTURE_NAMES = new Set(RUNTIME_POLICY.unsupportedPointerCaptureMethods ?? [
  'setPointerCapture',
  'releasePointerCapture',
]);

const SUPPORTED_INPUT_TYPES = new Set(
  Array.isArray(RUNTIME_SUPPORTED_INPUT_TYPES) && RUNTIME_SUPPORTED_INPUT_TYPES.length > 0
    ? RUNTIME_SUPPORTED_INPUT_TYPES
    : ['text', 'button', 'password'],
);

const UNSUPPORTED_TAGS = new Map([
  ['table', ['HTML table elements', 'Use div-based layout instead.']],
  ['caption', ['HTML table elements', 'Use div-based layout instead.']],
  ['colgroup', ['HTML table elements', 'Use div-based layout instead.']],
  ['col', ['HTML table elements', 'Use div-based layout instead.']],
  ['thead', ['HTML table elements', 'Use div-based layout instead.']],
  ['tbody', ['HTML table elements', 'Use div-based layout instead.']],
  ['tfoot', ['HTML table elements', 'Use div-based layout instead.']],
  ['tr', ['HTML table elements', 'Use div-based layout instead.']],
  ['td', ['HTML table elements', 'Use div-based layout instead.']],
  ['th', ['HTML table elements', 'Use div-based layout instead.']],
  ['select', ['the native select element', 'FoaeCefUI supports only a small subset of native controls. Build a custom control.']],
  ['option', ['the native option element', 'FoaeCefUI supports only a small subset of native controls. Build a custom control.']],
  ['textarea', ['the native textarea element', 'FoaeCefUI supports only text, button, and password inputs.']],
  ['form', ['the native form element', 'Handle submission in React state instead.']],
  ['iframe', ['the iframe element', 'FoaeCefUI does not support embedded browsing contexts.']],
  ['video', ['the video element', 'FoaeCefUI does not support native media elements.']],
  ['audio', ['the audio element', 'FoaeCefUI does not support native media elements.']],
  ['dialog', ['the dialog element', 'Build the modal with regular elements.']],
  ['details', ['the details element', 'Build the disclosure with regular elements.']],
  ['summary', ['the summary element', 'Build the disclosure with regular elements.']],
  ['filter', ['SVG filters', 'FoaeCefUI SVG support does not include filter effects.']],
  ['feturbulence', ['SVG filter primitives', 'FoaeCefUI SVG support does not include filter effects.']],
  ['fedisplacementmap', ['SVG filter primitives', 'FoaeCefUI SVG support does not include filter effects.']],
  ['fegaussianblur', ['SVG filter primitives', 'FoaeCefUI SVG support does not include filter effects.']],
  ['fecolormatrix', ['SVG filter primitives', 'FoaeCefUI SVG support does not include filter effects.']],
  ['fecomposite', ['SVG filter primitives', 'FoaeCefUI SVG support does not include filter effects.']],
  ['feblend', ['SVG filter primitives', 'FoaeCefUI SVG support does not include filter effects.']],
  ['femerge', ['SVG filter primitives', 'FoaeCefUI SVG support does not include filter effects.']],
  ['femergenode', ['SVG filter primitives', 'FoaeCefUI SVG support does not include filter effects.']],
  ['feoffset', ['SVG filter primitives', 'FoaeCefUI SVG support does not include filter effects.']],
]);

const UNSUPPORTED_DOM_CONSTRUCTORS = new Map([
  ['HTMLSelectElement', ['the native select element constructor', 'Use tagName checks or explicit React state instead.']],
  ['HTMLTextAreaElement', ['the native textarea element constructor', 'Use tagName checks or explicit React state instead.']],
  ['HTMLFormElement', ['the native form element constructor', 'Use tagName checks or explicit React state instead.']],
  ['HTMLOptionElement', ['the native option element constructor', 'Use tagName checks or explicit React state instead.']],
]);

const UNSUPPORTED_STYLE_PROPERTIES = new Map([
  ['gap', ['CSS gap properties', 'Use margins or explicit sizing instead.']],
  ['row-gap', ['CSS gap properties', 'Use margins or explicit sizing instead.']],
  ['column-gap', ['CSS gap properties', 'Use margins or explicit sizing instead.']],
  ['grid', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-area', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-auto-columns', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-auto-flow', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-auto-rows', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-column', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-column-end', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-column-start', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-row', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-row-end', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-row-start', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-template', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-template-areas', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-template-columns', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['grid-template-rows', ['CSS Grid', 'Use flex or positioned layout instead.']],
  ['accent-color', ['accent-color', 'Style custom controls directly instead.']],
  ['appearance', ['appearance', 'Use explicit supported control styling instead.']],
  ['background-blend-mode', ['background-blend-mode', 'Bake the blended result into an asset or use supported layering.']],
  ['background-attachment', ['background-attachment', 'Avoid fixed or local background attachment.']],
  ['border-collapse', ['border-collapse', 'Use div-based layout rather than table styling.']],
  ['color-scheme', ['color-scheme', 'FoaeCefUI does not expose browser colour-scheme handling.']],
  ['direction', ['direction', 'Use explicit layout ordering and text content instead.']],
  ['font-variant', ['font-variant', 'Use supported font files and regular font styling instead.']],
  ['font-variant-numeric', ['font-variant-numeric', 'Use supported font files and regular font styling instead.']],
  ['object-fit', ['object-fit', 'Use explicit image sizing and cropping instead.']],
  ['object-position', ['object-position', 'Use explicit positioning instead.']],
  ['inset', ['the inset shorthand', 'Use top, right, bottom, and left instead.']],
  ['justify-self', ['justify-self', 'Use flex alignment or explicit positioning instead.']],
  ['list-style', ['list-style', 'Build list markers with explicit child elements instead.']],
  ['outline', ['outline', 'Use supported border or box styling instead.']],
  ['outline-color', ['outline-color', 'Use supported border or box styling instead.']],
  ['outline-offset', ['outline-offset', 'Use supported border or box styling instead.']],
  ['order', ['flex order', 'Order elements in React render output instead.']],
  ['scale', ['the scale property', 'Use transform: scale(...) instead.']],
  ['scrollbar-color', ['scrollbar-color', 'Use explicit scroll track elements instead.']],
  ['scrollbar-gutter', ['scrollbar-gutter', 'Use fixed layout spacing instead.']],
  ['scrollbar-width', ['scrollbar-width', 'Use explicit scroll track elements instead.']],
  ['touch-action', ['touch-action', 'FoaeCefUI does not expose browser touch gesture handling.']],
  ['overscroll-behavior', ['overscroll-behavior', 'FoaeCefUI does not expose browser scroll chaining behaviour.']],
  ['font-feature-settings', ['font-feature-settings', 'Use supported font files and regular font styling instead.']],
  ['image-rendering', ['image-rendering', 'Use pre-authored image assets at the intended resolution instead.']],
  ['will-change', ['will-change', 'FoaeCefUI does not use browser compositor hinting.']],
  ['word-break', ['word-break', 'Use supported wrapping rules and explicit layout widths instead.']],
  ['writing-mode', ['writing-mode', 'Use horizontal text layout.']],
  ['zoom', ['zoom', 'Use transform scaling or layout sizing instead.']],
  ['border-image', ['border-image', 'Use regular border styling or image-backed UI elements instead.']],
  ['-moz-osx-font-smoothing', ['-moz-osx-font-smoothing', 'FoaeCefUI does not use browser font smoothing properties.']],
  ['-webkit-appearance', ['-webkit-appearance', 'Use explicit supported control styling instead.']],
  ['-webkit-box-orient', ['-webkit-box-orient', 'Avoid legacy WebKit box layout.']],
  ['-webkit-font-smoothing', ['-webkit-font-smoothing', 'FoaeCefUI does not use browser font smoothing properties.']],
  ['-webkit-line-clamp', ['-webkit-line-clamp', 'Clamp text through layout or content rules instead.']],
  ['-webkit-mask', ['-webkit-mask', 'Use regular image assets or supported mask styling instead.']],
  ['-webkit-tap-highlight-color', ['-webkit-tap-highlight-color', 'FoaeCefUI does not support mobile browser tap highlight styling.']],
  ['-webkit-touch-callout', ['-webkit-touch-callout', 'FoaeCefUI does not expose mobile browser callout styling.']],
  ['-webkit-user-drag', ['-webkit-user-drag', 'FoaeCefUI does not support browser drag hint styling.']],
  ['-webkit-user-select', ['-webkit-user-select', 'Use regular user-select handling instead.']],
  ['-webkit-mask-image', ['-webkit-mask-image', 'Use regular image assets or supported mask styling instead.']],
  ['-webkit-mask-position', ['-webkit-mask-position', 'Use regular image assets or supported mask styling instead.']],
  ['-webkit-mask-repeat', ['-webkit-mask-repeat', 'Use regular image assets or supported mask styling instead.']],
  ['-webkit-mask-size', ['-webkit-mask-size', 'Use regular image assets or supported mask styling instead.']],
  ['-webkit-mask-mode', ['-webkit-mask-mode', 'Use supported mask assets without mask-mode.']],
]);

const UNSUPPORTED_PSEUDO_CLASSES = [
  '-webkit-autofill',
  'checked',
  'disabled',
  'empty',
  'focus-visible',
  'focus-within',
  'last-of-type',
  'not',
];

const UNSUPPORTED_PSEUDO_ELEMENTS = [
  '-moz-range-thumb',
  '-webkit-scrollbar',
  '-webkit-scrollbar-thumb',
  '-webkit-scrollbar-track',
  '-webkit-slider-runnable-track',
  '-webkit-slider-thumb',
  'marker',
  'placeholder',
];

function mergeGeneratedMap(target, values) {
  if (!values || typeof values !== 'object') {
    return;
  }
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value) && value.length >= 2) {
      target.set(key, [String(value[0]), String(value[1])]);
    }
  }
}

function replaceGeneratedArray(target, values) {
  if (!Array.isArray(values)) {
    return;
  }
  target.splice(0, target.length, ...values.map(String));
}

mergeGeneratedMap(UNSUPPORTED_TAGS, RUNTIME_POLICY.unsupportedTags);
mergeGeneratedMap(UNSUPPORTED_DOM_CONSTRUCTORS, RUNTIME_POLICY.unsupportedDomConstructors);
mergeGeneratedMap(UNSUPPORTED_STYLE_PROPERTIES, RUNTIME_POLICY.unsupportedStyleProperties);
replaceGeneratedArray(UNSUPPORTED_PSEUDO_CLASSES, RUNTIME_POLICY.unsupportedPseudoClasses);
replaceGeneratedArray(UNSUPPORTED_PSEUDO_ELEMENTS, RUNTIME_POLICY.unsupportedPseudoElements);

const CUSTOM_EXPRESSION_SHORTHAND_PROPERTIES = [
  'animation',
  'background',
  'border',
  'border-bottom',
  'border-color',
  'border-image',
  'border-left',
  'border-radius',
  'border-right',
  'border-top',
  'flex',
  'mask',
  'padding',
  'text-decoration',
  'transition',
];

const CUSTOM_EXPRESSION_SHORTHAND_STYLE_PROPERTIES = new Set(CUSTOM_EXPRESSION_SHORTHAND_PROPERTIES);

const CUSTOM_EXPRESSION_SHORTHAND_PATTERN = new RegExp(
  String.raw`(?:^|[;{\s])(?:${CUSTOM_EXPRESSION_SHORTHAND_PROPERTIES.join('|')})\s*:[^;]*\bvar\s*\(`,
  'i',
);

const CUSTOM_PROPERTY_USE_PATTERN = /\bvar\s*\(\s*--([A-Za-z0-9_-]+)/gi;
const CSS_CUSTOM_PROPERTY_DEFINITION_PATTERN = /(?:^|[;{\s])--([A-Za-z0-9_-]+)\s*:/g;
const JS_CUSTOM_PROPERTY_DEFINITION_PATTERN = /['"]--([A-Za-z0-9_-]+)['"]\s*:/g;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const UNSUPPORTED_PSEUDO_CLASS_PATTERN = new RegExp(
  `:(?:${UNSUPPORTED_PSEUDO_CLASSES.map(escapeRegExp).join('|')})\\b`,
  'i',
);

const UNSUPPORTED_PSEUDO_ELEMENT_PATTERN = new RegExp(
  `::(?:${UNSUPPORTED_PSEUDO_ELEMENTS.map(escapeRegExp).join('|')})\\b`,
  'i',
);

const UNSUPPORTED_CSS_PROPERTY_PATTERN = new RegExp(
  String.raw`(?:^|[;{\s])(?:${[...UNSUPPORTED_STYLE_PROPERTIES.keys()].map(escapeRegExp).join('|')})\s*:`,
  'i',
);

const UNSUPPORTED_POINTER_EVENT_ATTRIBUTE_PATTERN = POINTER_EVENT_NAMES.size > 0
  ? new RegExp(String.raw`\bon(?:${[...POINTER_EVENT_NAMES].map(escapeRegExp).join('|')})\s*=`, 'i')
  : /$a/;
const UNSUPPORTED_POINTER_EVENT_LISTENER_PATTERN = POINTER_EVENT_NAMES.size > 0
  ? new RegExp(String.raw`\baddEventListener\s*\(\s*["'](?:${[...POINTER_EVENT_NAMES].map(escapeRegExp).join('|')})["']`, 'i')
  : /$a/;
const UNSUPPORTED_POINTER_CAPTURE_PATTERN = UNSUPPORTED_POINTER_CAPTURE_NAMES.size > 0
  ? new RegExp(String.raw`\b(?:${[...UNSUPPORTED_POINTER_CAPTURE_NAMES].map(escapeRegExp).join('|')})\s*\(`, 'i')
  : /$a/;

const UNSUPPORTED_CSS_PATTERNS = [
  {
    pattern: /\bdisplay\s*:\s*grid\b/i,
    feature: 'CSS Grid',
    detail: 'Use flex or positioned layout instead.',
  },
  {
    pattern: /\bdisplay\s*:\s*contents\b/i,
    feature: 'display: contents',
    detail: 'Use regular element layout instead.',
  },
  {
    pattern: /\bdisplay\s*:\s*inline-flex\b/i,
    feature: 'display: inline-flex',
    detail: 'Use flex on a block-level element instead.',
  },
  {
    pattern: /\bdisplay\s*:\s*(?:-webkit-box|inline-block)\b/i,
    feature: 'unsupported display values',
    detail: 'Use block or flex layout instead.',
  },
  {
    pattern: UNSUPPORTED_CSS_PROPERTY_PATTERN,
    feature: 'unsupported CSS properties',
    detail: 'Use FoaeCefUI-supported CSS properties instead.',
  },
  {
    pattern: /(?:^|[;{\s])background-image\s*:\s*var\(\s*--(?:bg-card|bg-panel-dark|separator)\s*\)/i,
    feature: 'colour variables in background-image',
    detail: 'Use background-color for colour tokens.',
  },
  {
    pattern: /data:image\/svg(?:\+|%2b)xml/i,
    feature: 'SVG data URI assets',
    detail: 'FoaeCefUI treats data:image/svg+xml URLs as unsupported resource protocols. Use CSS geometry or a packaged image asset.',
  },
  {
    pattern: /(?:^|[;{\s])grid(?:-[a-z-]+)?\s*:/i,
    feature: 'CSS Grid',
    detail: 'Use flex or positioned layout instead.',
  },
  {
    pattern: /(?:^|[;{\s])(?:gap|row-gap|column-gap)\s*:/i,
    feature: 'CSS gap properties',
    detail: 'Use margins or explicit sizing instead.',
  },
  {
    pattern: /\bbackground-blend-mode\s*:/i,
    feature: 'background-blend-mode',
    detail: 'Bake the blended result into an asset or use supported layering.',
  },
  {
    pattern: /\bbackground-attachment\s*:/i,
    feature: 'background-attachment',
    detail: 'Avoid fixed or local background attachment.',
  },
  {
    pattern: /\bobject-fit\s*:/i,
    feature: 'object-fit',
    detail: 'Use explicit image sizing and cropping instead.',
  },
  {
    pattern: /\bobject-position\s*:/i,
    feature: 'object-position',
    detail: 'Use explicit positioning instead.',
  },
  {
    pattern: /(?:^|[;{\s])inset\s*:/i,
    feature: 'the inset shorthand',
    detail: 'Use top, right, bottom, and left instead.',
  },
  {
    pattern: /\bposition\s*:\s*sticky\b/i,
    feature: 'position: sticky',
    detail: 'Use static, relative, absolute, or fixed positioning.',
  },
  {
    pattern: /(?:^|[;{\s])zoom\s*:/i,
    feature: 'zoom',
    detail: 'Use transform scaling or layout sizing instead.',
  },
  {
    pattern: /:has\s*\(/i,
    feature: ':has()',
    detail: 'Move the state into React and apply a class to the target element.',
  },
  {
    pattern: /\bcolor-mix\s*\(/i,
    feature: 'color-mix()',
    detail: 'Use a concrete colour token instead.',
  },
  {
    pattern: /\b(?:min|max|clamp)\s*\(/i,
    feature: 'CSS min(), max(), and clamp() functions',
    detail: 'Resolve the value to explicit CSS before runtime.',
  },
  {
    pattern: /(?:^|[;{\s])(?:align-items|align-self|justify-content|justify-items|justify-self|place-items)\s*:\s*(?:baseline|start|end)\b/i,
    feature: 'unsupported CSS Box Alignment keywords',
    detail: 'Use flex-start or flex-end where alignment is needed.',
  },
  {
    pattern: /(?:^|[;{\s])[\w-]+\s*:\s*unset\b/i,
    feature: 'the unset CSS keyword',
    detail: 'Use an explicit supported value instead.',
  },
  {
    pattern: /(?:^|[;{\s])(?:width|max-width|min-width|max-height|min-height)\s*:\s*(?:max-content|min-content|fit-content|none)\b/i,
    feature: 'unsupported intrinsic sizing keywords',
    detail: 'Use explicit dimensions or percentages instead.',
  },
  {
    pattern: /(?:^|[;{\s])(?:color|font-size)\s*:\s*(?:currentColor|inherit)\b/i,
    feature: 'unsupported inherited declaration values',
    detail: 'Use explicit colour and font-size values instead.',
  },
  {
    pattern: /(?:^|[;{\s])image-rendering\s*:\s*-webkit-optimize-contrast\b/i,
    feature: 'image-rendering: -webkit-optimize-contrast',
    detail: 'Use pre-authored image assets at the intended resolution instead.',
  },
  {
    pattern: /(?:^|[;{\s])vertical-align\s*:\s*-[\d.]+(?:px|rem|em|%)\b/i,
    feature: 'negative vertical-align offsets',
    detail: 'Use flex alignment or explicit positioning instead.',
  },
  {
    pattern: /(?:^|[;{\s])-webkit-line-clamp\s*:/i,
    feature: '-webkit-line-clamp',
    detail: 'Clamp text through layout or content rules instead.',
  },
  {
    pattern: /(?:^|[;{\s])background\s*:[^;]*(?:linear-gradient|radial-gradient)\s*\([^;]*(?:linear-gradient|radial-gradient)\s*\(/i,
    feature: 'multi-layer gradient background shorthand',
    detail: 'Use a single supported background layer or explicit child elements.',
  },
  {
    pattern: /(?:^|[;{\s])(?:-webkit-)?mask-image\s*:\s*linear-gradient\s*\(/i,
    feature: 'gradient mask images',
    detail: 'Use a supported mask asset or regular overlay.',
  },
  {
    pattern: /\bcalc\([^)]*(?:%[^)]*(?:px|rem|em|vh|vw)|(?:px|rem|em|vh|vw)[^)]*%)/i,
    feature: 'mixed-unit calc() expressions',
    detail: 'FoaeCefUI calc() support is limited to same-unit arithmetic.',
  },
  {
    pattern: /\bvar\(\s*--[\w-]+\s*,/i,
    feature: 'CSS variable fallback values',
    detail: 'FoaeCefUI supports CSS variables without fallback arguments.',
  },
  {
    pattern: /(?:\.world-glance-node\.detail-name\s+\.gset-(?:body|head|info)|\.glance--convoy\s+\.gconv-cargo|\.screen--negotiation\s+\.screen-title-area|\.pns-panel\s+\.panel-body)\s*>\s*(?:\*|:first-child)(?:\s*\+\s*\*)?/i,
    feature: 'full subtree invalidating universal child selectors',
    detail: 'Use explicit child classes instead of > * or > :first-child in selectors that sit under frequently mutated FoaeCefUI classes.',
  },
  {
    pattern: CUSTOM_EXPRESSION_SHORTHAND_PATTERN,
    feature: 'CSS custom properties inside shorthand declarations',
    detail: 'FoaeCefUI requires longhand declarations when var() is involved.',
  },
  {
    pattern: /(?:^|[;{\s])border(?:-[a-z-]+)?\s*:[^;]*\bdashed\b/i,
    feature: 'dashed borders',
    detail: 'Use solid borders or image-backed border art instead.',
  },
  {
    pattern: /(?:^|[;{\s])border-style\s*:\s*dashed\b/i,
    feature: 'dashed borders',
    detail: 'Use solid borders or image-backed border art instead.',
  },
  {
    pattern: /(?:^|[;{\s])cursor\s*:\s*url\s*\(/i,
    feature: 'image cursor URLs',
    detail: 'Use the native game cursor path instead.',
  },
  {
    pattern: /(?:^|[;{\s])text-decoration\s*:[^;]*\bdotted\b/i,
    feature: 'complex text-decoration shorthand',
    detail: 'Use simple supported text decoration or a separate visual element.',
  },
  {
    pattern: /(?:^|[;{\s])text-decoration-style\s*:\s*dotted\b/i,
    feature: 'dotted text-decoration style',
    detail: 'Use simple supported text decoration or a separate visual element.',
  },
  {
    pattern: /(?:^|[;{\s])border-image\s*:/i,
    feature: 'border-image',
    detail: 'Use regular border styling or image-backed UI elements instead.',
  },
  {
    pattern: UNSUPPORTED_PSEUDO_ELEMENT_PATTERN,
    feature: 'unsupported CSS pseudo elements',
    detail: 'Style explicit child elements instead.',
  },
  {
    pattern: UNSUPPORTED_PSEUDO_CLASS_PATTERN,
    feature: 'unsupported CSS pseudo classes',
    detail: 'Move that state into React and apply explicit classes.',
  },
  {
    pattern: /<\s*(?:table|caption|colgroup|col|thead|tbody|tfoot|tr|td|th)\b/i,
    feature: 'HTML table elements',
    detail: 'Use div-based layout instead.',
  },
  {
    pattern: /<\s*input\b[^>]*\btype\s*=\s*["']?(?!text\b|button\b|password\b)[^"'\s>]+/i,
    feature: 'unsupported native input types',
    detail: 'FoaeCefUI supports only text, button, and password inputs.',
  },
  {
    pattern: /<\s*(?:select|option|textarea|form|iframe|video|audio|dialog|details|summary)\b/i,
    feature: 'unsupported native HTML elements',
    detail: 'Build the control with regular FoaeCefUI-supported elements.',
  },
  {
    pattern: /<\s*(?:filter|fe[a-z]+)\b/i,
    feature: 'SVG filters',
    detail: 'FoaeCefUI SVG support does not include filter effects.',
  },
  {
    pattern: /\bfilter\s*=\s*["']url\s*\(/i,
    feature: 'SVG filters',
    detail: 'FoaeCefUI SVG support does not include filter effects.',
  },
  {
    pattern: UNSUPPORTED_POINTER_EVENT_ATTRIBUTE_PATTERN,
    feature: 'pointer events',
    detail: 'Use events supported by FoaeCefUI.',
  },
  {
    pattern: UNSUPPORTED_POINTER_EVENT_LISTENER_PATTERN,
    feature: 'pointer events',
    detail: 'Use events supported by FoaeCefUI.',
  },
  {
    pattern: UNSUPPORTED_POINTER_CAPTURE_PATTERN,
    feature: 'pointer capture',
    detail: 'Use event state tracked in React instead.',
  },
  {
    pattern: /\bgetContext\s*\(\s*["'](?:webgl2?|experimental-webgl)["']/i,
    feature: 'WebGL canvas contexts',
    detail: 'FoaeCefUI canvas support is limited to 2D rendering.',
  },
  {
    pattern: /\b(?:createImageData|putImageData)\s*\(/i,
    feature: 'Canvas ImageData APIs',
    detail: 'FoaeCefUI canvas support does not include ImageData APIs.',
  },
  {
    pattern: /\b(?:imageSmoothingEnabled|imageSmoothingQuality)\b/i,
    feature: 'canvas image smoothing controls',
    detail: 'FoaeCefUI canvas support does not include image smoothing controls.',
  },
  {
    pattern: /\bnew\s+(?:window\.)?(?:AudioContext|webkitAudioContext)\s*\(/i,
    feature: 'the Web Audio API',
    detail: 'Trigger sound through the game bridge instead of browser audio APIs.',
  },
  {
    pattern: /\b(?:window\.|globalThis\.|self\.)?fetch\s*\(/i,
    feature: 'the native Fetch API',
    detail: 'Use XMLHttpRequest, a packaged import, or the game bridge instead.',
  },
];

const UNSUPPORTED_CSS_BLOCK_PATTERNS = [
  {
    pattern: /(?:^|})\s*\.tooltip-wrapper-inline\s*\{[\s\S]*?\bposition\s*:\s*relative\b/i,
    feature: 'positioned inline tooltip wrappers',
    detail: 'FoaeCefUI can stop wrapping inline text around positioned tooltip trigger spans. Keep the shared inline wrapper static and scope block/flex layout to the caller.',
  },
];

const UNSUPPORTED_CANVAS_CALLS = new Map([
  ['createImageData', ['CanvasRenderingContext2D.createImageData()', 'FoaeCefUI canvas support does not include ImageData APIs.']],
  ['putImageData', ['CanvasRenderingContext2D.putImageData()', 'FoaeCefUI canvas support does not include ImageData APIs.']],
]);

const UNSUPPORTED_CANVAS_PROPERTIES = new Map([
  ['imageSmoothingEnabled', ['CanvasRenderingContext2D.imageSmoothingEnabled', 'FoaeCefUI canvas support does not include image smoothing controls.']],
  ['imageSmoothingQuality', ['CanvasRenderingContext2D.imageSmoothingQuality', 'FoaeCefUI canvas support does not include image smoothing controls.']],
]);

function reportUnsupported(context, node, feature, detail, loc = null) {
  const descriptor = {
    node,
    messageId: 'unsupported',
    data: { feature, detail },
  };

  if (loc) {
    descriptor.loc = loc;
  }

  context.report(descriptor);
}

function reportUndefinedCustomProperty(context, node, name, loc = null) {
  const descriptor = {
    node,
    messageId: 'undefinedCustomProperty',
    data: { name },
  };

  if (loc) {
    descriptor.loc = loc;
  }

  context.report(descriptor);
}

function collectFiles(rootDir, extensions, outFiles = []) {
  if (!fs.existsSync(rootDir)) {
    return outFiles;
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, extensions, outFiles);
      continue;
    }

    if (extensions.has(path.extname(entry.name))) {
      outFiles.push(fullPath);
    }
  }

  return outFiles;
}

let definedCustomPropertiesCache = null;

function collectDefinedCustomProperties() {
  if (definedCustomPropertiesCache) {
    return definedCustomPropertiesCache;
  }

  const defined = new Set();
  const sourceFiles = collectFiles(SOURCE_DIR, new Set(['.css', '.ts', '.tsx']));

  for (const filePath of sourceFiles) {
    const text = fs.readFileSync(filePath, 'utf8');

    for (const match of text.matchAll(CSS_CUSTOM_PROPERTY_DEFINITION_PATTERN)) {
      defined.add(match[1]);
    }

    for (const match of text.matchAll(JS_CUSTOM_PROPERTY_DEFINITION_PATTERN)) {
      defined.add(match[1]);
    }
  }

  definedCustomPropertiesCache = defined;
  return definedCustomPropertiesCache;
}

function checkUndefinedCustomProperties(context, node, text, locForLine = null) {
  if (!text || !text.includes('var(')) {
    return;
  }

  const defined = collectDefinedCustomProperties();
  const reported = new Set();

  CUSTOM_PROPERTY_USE_PATTERN.lastIndex = 0;
  let match;
  while ((match = CUSTOM_PROPERTY_USE_PATTERN.exec(text)) !== null) {
    const name = match[1];
    if (!defined.has(name) && !reported.has(name)) {
      reportUndefinedCustomProperty(context, node, name, locForLine);
      reported.add(name);
    }
  }
}

function getJsxName(name) {
  if (!name) {
    return null;
  }

  if (name.type === 'JSXIdentifier') {
    return name.name;
  }

  if (name.type === 'JSXMemberExpression') {
    return getJsxName(name.property);
  }

  if (name.type === 'JSXNamespacedName') {
    return getJsxName(name.name);
  }

  return null;
}

function getPropertyName(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'Identifier' || node.type === 'PrivateIdentifier') {
    return node.name;
  }

  if (node.type === 'Literal') {
    return String(node.value);
  }

  return null;
}

function getCallableName(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'MemberExpression') {
    return getPropertyName(node.property);
  }

  return null;
}

function isRequireruntimeEngineCall(node) {
  return node?.type === 'CallExpression'
    && node.callee.type === 'Identifier'
    && node.callee.name === 'requireruntimeEngine';
}

function isNativeFetchCallee(node) {
  if (!node) {
    return false;
  }

  if (node.type === 'Identifier') {
    return node.name === 'fetch';
  }

  if (node.type !== 'MemberExpression') {
    return false;
  }

  const propertyName = getPropertyName(node.property);
  const objectName = getPropertyName(node.object);

  return propertyName === 'fetch'
    && (objectName === 'window' || objectName === 'globalThis' || objectName === 'self');
}

function normaliseStyleName(name) {
  return name
    .replace(/^Webkit/, '-webkit')
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .toLowerCase();
}

function getStaticString(node) {
  if (!node) {
    return null;
  }

  if (
    node.type === 'TSAsExpression'
    || node.type === 'TSSatisfiesExpression'
    || node.type === 'TSNonNullExpression'
    || node.type === 'ChainExpression'
  ) {
    return getStaticString(node.expression);
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  if (node.type === 'TemplateLiteral') {
    return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('${}');
  }

  return null;
}

function getExpression(node) {
  let current = node;
  while (
    current?.type === 'TSAsExpression'
    || current?.type === 'TSSatisfiesExpression'
    || current?.type === 'TSNonNullExpression'
    || current?.type === 'ChainExpression'
  ) {
    current = current.expression;
  }
  return current;
}

function hasDynamicTemplateExpression(node) {
  const expression = getExpression(node);
  return expression?.type === 'TemplateLiteral' && expression.expressions.length > 0;
}

function isStaticNonStringLiteral(node) {
  const expression = getExpression(node);
  return expression?.type === 'Literal' && typeof expression.value !== 'string';
}

function isCssPropertiesTypeAnnotation(context, node) {
  const annotation = node?.typeAnnotation;
  if (!annotation) {
    return false;
  }

  return /\b(?:React\.)?CSSProperties\b/.test(context.sourceCode.getText(annotation));
}

function getAttributeValue(attribute) {
  if (!attribute.value) {
    return null;
  }

  if (attribute.value.type === 'Literal') {
    return typeof attribute.value.value === 'string' ? attribute.value.value : null;
  }

  if (attribute.value.type === 'JSXExpressionContainer') {
    return getStaticString(attribute.value.expression);
  }

  return null;
}

function findJsxAttribute(node, attributeName) {
  return node.attributes.find((attribute) => (
    attribute.type === 'JSXAttribute'
    && attribute.name.type === 'JSXIdentifier'
    && attribute.name.name === attributeName
  ));
}

function isUnsupportedPointerEventName(name) {
  return typeof name === 'string' && POINTER_EVENT_NAMES.has(name.toLowerCase());
}

function checkCssText(context, node, text) {
  if (!text) {
    return;
  }

  for (const { pattern, feature, detail } of UNSUPPORTED_CSS_BLOCK_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const prefix = text.slice(0, match.index);
      const lineOffset = prefix.split(/\r?\n/).length - 1;
      const matchedLine = text.slice(match.index).split(/\r?\n/, 1)[0];
      reportUnsupported(
        context,
        node,
        feature,
        detail,
        node.loc
          ? {
              start: {
                line: node.loc.start.line + lineOffset,
                column: 0,
              },
              end: {
                line: node.loc.start.line + lineOffset,
                column: matchedLine.length,
              },
            }
          : null,
      );
    }
  }

  const lines = text.split(/\r?\n/);
  if (lines.length <= 1 || !node.loc) {
    checkUndefinedCustomProperties(context, node, text);
    for (const { pattern, feature, detail } of UNSUPPORTED_CSS_PATTERNS) {
      if (pattern.test(text)) {
        reportUnsupported(context, node, feature, detail);
      }
    }
    return;
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineText = lines[lineIndex];
    const lineLoc = {
      start: {
        line: node.loc.start.line + lineIndex,
        column: 0,
      },
      end: {
        line: node.loc.start.line + lineIndex,
        column: lineText.length,
      },
    };
    checkUndefinedCustomProperties(context, node, lineText, lineLoc);
    for (const { pattern, feature, detail } of UNSUPPORTED_CSS_PATTERNS) {
      if (pattern.test(lineText)) {
        reportUnsupported(
          context,
          node,
          feature,
          detail,
          lineLoc,
        );
      }
    }
  }
}

function checkStyleValue(context, node, name, valueNode, options = {}) {
  const value = getStaticString(valueNode);

  if (CUSTOM_EXPRESSION_SHORTHAND_STYLE_PROPERTIES.has(name)) {
    if (hasDynamicTemplateExpression(valueNode)) {
      reportUnsupported(
        context,
        valueNode,
        'dynamic inline CSS shorthand declarations',
        'Use FoaeCefUI-supported longhand declarations so helper-returned var() values cannot reach shorthand parsing.',
      );
    } else if (value !== null && /\bvar\s*\(/i.test(value)) {
      reportUnsupported(
        context,
        valueNode,
        'CSS custom properties inside inline style shorthand declarations',
        'Use longhand declarations such as backgroundColor or backgroundImage when var() is involved.',
      );
    } else if (value === null && !isStaticNonStringLiteral(valueNode)) {
      reportUnsupported(
        context,
        valueNode,
        'dynamic inline CSS shorthand declarations',
        'Use FoaeCefUI-supported longhand declarations so helper-returned var() values cannot reach shorthand parsing.',
      );
    }
  }

  if (options.customExpressionOnly) {
    return;
  }

  if (value) {
    if (name === 'display' && /\bgrid\b/i.test(value)) {
      reportUnsupported(context, valueNode, 'CSS Grid', 'Use flex or positioned layout instead.');
    }

    if (name === 'display' && /\bcontents\b/i.test(value)) {
      reportUnsupported(context, valueNode, 'display: contents', 'Use regular element layout instead.');
    }

    if (name === 'position' && /\bsticky\b/i.test(value)) {
      reportUnsupported(context, valueNode, 'position: sticky', 'Use static, relative, absolute, or fixed positioning.');
    }

    if ((name === 'mask-image' || name === '-webkit-mask-image') && /\blinear-gradient\s*\(/i.test(value)) {
      reportUnsupported(context, valueNode, 'gradient mask images', 'Use a supported mask asset or regular overlay.');
    }
  }
}

function checkInlineStyle(context, styleExpression, options = {}) {
  const expression = getExpression(styleExpression);

  if (!expression) {
    return;
  }

  if (expression.type === 'ConditionalExpression') {
    checkInlineStyle(context, expression.consequent, options);
    checkInlineStyle(context, expression.alternate, options);
    return;
  }

  if (expression.type !== 'ObjectExpression') {
    return;
  }

  for (const property of expression.properties) {
    if (property.type !== 'Property') {
      continue;
    }

    const rawName = getPropertyName(property.key);
    if (!rawName) {
      continue;
    }

    const styleName = normaliseStyleName(rawName);
    const unsupportedProperty = UNSUPPORTED_STYLE_PROPERTIES.get(styleName);

    if (!options.customExpressionOnly && unsupportedProperty) {
      const [feature, detail] = unsupportedProperty;
      reportUnsupported(context, property.key, feature, detail);
    }

    checkStyleValue(context, property, styleName, property.value, options);
  }
}

function checkInputType(context, node) {
  const typeAttribute = findJsxAttribute(node, 'type');
  if (!typeAttribute) {
    return;
  }

  const value = getAttributeValue(typeAttribute);
  if (value === null) {
    reportUnsupported(
      context,
      typeAttribute,
      'dynamic native input types',
      'FoaeCefUI supports only text, button, and password inputs.',
    );
    return;
  }

  if (!SUPPORTED_INPUT_TYPES.has(value.toLowerCase())) {
    reportUnsupported(
      context,
      typeAttribute,
      `input type="${value}"`,
      'FoaeCefUI supports only text, button, and password inputs.',
    );
  }
}

function checkJsxAttribute(context, node, attribute) {
  if (attribute.type !== 'JSXAttribute' || attribute.name.type !== 'JSXIdentifier') {
    return;
  }

  const attributeName = attribute.name.name;

  if (/^onPointer[A-Z]/.test(attributeName)) {
    const eventName = `pointer${attributeName.slice('onPointer'.length).toLowerCase()}`;
    if (isUnsupportedPointerEventName(eventName)) {
      reportUnsupported(context, attribute, 'pointer events', 'Use events supported by FoaeCefUI.');
    }
  }

  if (attributeName === 'filter') {
    const value = getAttributeValue(attribute);
    if (value && /\burl\s*\(/i.test(value)) {
      reportUnsupported(context, attribute, 'SVG filters', 'FoaeCefUI SVG support does not include filter effects.');
    }
  }

  if (
    attributeName === 'style'
    && attribute.value?.type === 'JSXExpressionContainer'
  ) {
    checkInlineStyle(context, attribute.value.expression);
  }
}

function getTypeScriptTypeName(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'TSQualifiedName') {
    const left = getTypeScriptTypeName(node.left);
    const right = getTypeScriptTypeName(node.right);
    return left && right ? `${left}.${right}` : left ?? right;
  }

  return null;
}

function isInsideFunction(node) {
  let current = node.parent;
  while (current && current.type !== 'Program') {
    if (
      current.type === 'FunctionDeclaration'
      || current.type === 'FunctionExpression'
      || current.type === 'ArrowFunctionExpression'
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow WebUI features that FoaeCefUI does not support',
    },
    schema: [],
    messages: {
      unsupported: 'FoaeCefUI does not support {{feature}}. {{detail}}',
      undefinedCustomProperty: 'FoaeCefUI cannot resolve CSS custom property --{{name}}. Define the token or use an existing WebUI CSS variable.',
    },
  },

  create(context) {
    if (RUNTIME_NAME === 'FoaeCefUI') {
      return {};
    }

    return {
      JSXOpeningElement(node) {
        const rawTagName = getJsxName(node.name);
        const tagName = rawTagName?.toLowerCase();

        if (!tagName) {
          return;
        }

        const unsupportedTag = UNSUPPORTED_TAGS.get(tagName);
        if (unsupportedTag) {
          const [feature, detail] = unsupportedTag;
          reportUnsupported(context, node.name, feature, detail);
        }

        if (tagName === 'input') {
          checkInputType(context, node);
        }

        for (const attribute of node.attributes) {
          checkJsxAttribute(context, node, attribute);
        }
      },

      Literal(node) {
        if (typeof node.value === 'string') {
          checkCssText(context, node, node.value);
        }
      },

      TemplateLiteral(node) {
        checkCssText(context, node, getStaticString(node));
      },

      CallExpression(node) {
        if (isNativeFetchCallee(node.callee)) {
          reportUnsupported(context, node.callee, 'the native Fetch API', 'Use XMLHttpRequest, a packaged import, or the game bridge instead.');
        }

        if (node.callee.type !== 'MemberExpression') {
          return;
        }

        const calleeName = getPropertyName(node.callee.property);
        if (!calleeName) {
          return;
        }

        if (calleeName === 'call' && isRequireruntimeEngineCall(node.callee.object)) {
          reportUnsupported(
            context,
            node.callee,
            'direct FoaeCefUI engine calls before readiness checks',
            'Await waitForruntimeEngine() before calling engine.call().',
          );
        }

        if (calleeName === 'addEventListener' || calleeName === 'removeEventListener') {
          const eventName = getStaticString(node.arguments[0]);
          if (isUnsupportedPointerEventName(eventName)) {
            reportUnsupported(context, node.arguments[0], 'pointer events', 'Use mouse events supported by FoaeCefUI.');
          }
        }

        if (calleeName === 'getContext') {
          const contextType = getStaticString(node.arguments[0]);
          if (/^(webgl2?|experimental-webgl)$/i.test(contextType ?? '')) {
            reportUnsupported(context, node.arguments[0], 'WebGL canvas contexts', 'FoaeCefUI canvas support is limited to 2D rendering.');
          }
        }

        const unsupportedCanvasCall = UNSUPPORTED_CANVAS_CALLS.get(calleeName);
        if (unsupportedCanvasCall) {
          const [feature, detail] = unsupportedCanvasCall;
          reportUnsupported(context, node.callee.property, feature, detail);
        }
      },

      BinaryExpression(node) {
        if (node.operator !== 'instanceof') {
          return;
        }

        const constructorName = getCallableName(node.right);
        const unsupportedConstructor = UNSUPPORTED_DOM_CONSTRUCTORS.get(constructorName);
        if (unsupportedConstructor) {
          const [feature, detail] = unsupportedConstructor;
          reportUnsupported(context, node.right, feature, detail);
        }
      },

      MemberExpression(node) {
        const propertyName = getPropertyName(node.property);

        if (UNSUPPORTED_POINTER_CAPTURE_NAMES.has(propertyName)) {
          reportUnsupported(context, node.property, 'pointer capture', 'Use event state tracked in React instead.');
        }

        const unsupportedCanvasProperty = UNSUPPORTED_CANVAS_PROPERTIES.get(propertyName);
        if (unsupportedCanvasProperty) {
          const [feature, detail] = unsupportedCanvasProperty;
          reportUnsupported(context, node.property, feature, detail);
        }
      },

      NewExpression(node) {
        const calleeName = getCallableName(node.callee);

        if (calleeName === 'AudioContext' || calleeName === 'webkitAudioContext') {
          reportUnsupported(context, node.callee, 'the Web Audio API', 'Trigger sound through the game bridge instead of browser audio APIs.');
        }
      },

      AwaitExpression(node) {
        if (!isInsideFunction(node)) {
          reportUnsupported(context, node, 'top-level await', 'Mount React before asynchronous startup work.');
        }
      },

      ImportExpression(node) {
        reportUnsupported(context, node, 'runtime import()', 'Load optional modules by injecting a module script after the base UI has mounted.');
      },

      TSTypeReference(node) {
        const typeName = getTypeScriptTypeName(node.typeName);

        if (
          (typeName === 'PointerEvent' || typeName === 'React.PointerEvent')
          && POINTER_EVENT_NAMES.size > 0
        ) {
          reportUnsupported(context, node.typeName, 'pointer events', 'Use events supported by FoaeCefUI.');
        }
      },

      VariableDeclarator(node) {
        if (
          node.id.type === 'Identifier'
          && isCssPropertiesTypeAnnotation(context, node.id)
        ) {
          checkInlineStyle(context, node.init, { customExpressionOnly: true });
        }
      },
    };
  },
};
