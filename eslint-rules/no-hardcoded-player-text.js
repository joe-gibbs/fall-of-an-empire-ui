/**
 * Custom ESLint rule: block authored player-facing WebUI strings unless they
 * go through the WebUI localisation path.
 */

const PLAYER_FACING_JSX_ATTRIBUTES = new Set([
  'alt',
  'aria-label',
  'bonusLabel',
  'cancelText',
  'confirmText',
  'desc',
  'detail',
  'emptyLabel',
  'emptyMessage',
  'kicker',
  'label',
  'leftAlt',
  'message',
  'navalLabel',
  'placeholder',
  'rightAlt',
  'searchLabel',
  'sub',
  'subtitle',
  'text',
  'title',
]);

const PLAYER_FACING_PROPERTIES = new Set([
  'body',
  'caption',
  'desc',
  'description',
  'detail',
  'empty',
  'emptyLabel',
  'emptyText',
  'footer',
  'header',
  'label',
  'message',
  'placeholder',
  'subtitle',
  'text',
  'title',
  'tooltip',
  'tooltipBody',
]);

const PLAYER_FACING_BINDINGS = new Set([
  'cancelText',
  'confirmText',
  'emptyLabel',
  'placeholder',
  'searchLabel',
  'searchPlaceholder',
  'subtitle',
  'title',
]);

const PLAYER_FACING_RETURN_NAMES =
  /(daysLabel|fitTier|fmtDays|format.*Duration|format.*Label|formatRange|formatSupplyWindow|patronageStatus|relationLabel|relationshipRelativeLabel|startLabel|statusLabel|subjectTypeLabel)$/i;

function hasReadableText(value) {
  return typeof value === 'string' && /[A-Za-z]/.test(value.replace(/\s+/g, ' ').trim());
}

// ── Prose detection ───────────────────────────────────────────────────────
// The allowlists above only cover text sitting in a known display slot. Authored
// copy also reaches the player as a positional call argument, a `||` fallback, a
// template-literal fragment, or an interpolation argument passed into
// `webUIText()`. Those are caught by shape instead: player copy is multi-word,
// whereas ids, enum values, class lists, and asset paths are not.

// A single CSS class / BEM token, e.g. `panel`, `panel__row`, `panel--open`.
// Trailing separators are allowed because a template quasi can stop mid-token,
// as in `panel panel--${variant}`.
const CSS_TOKEN = /^[a-z][a-z0-9]*(?:[-_]{1,2}[a-z0-9]+)*[-_]{0,2}$/;

/** Paths, URLs, asset filenames, and bare `gameui://`-style protocols. */
const ASSET_LIKE = /^(?:[a-zA-Z0-9._-]*\/|https?:|[a-z]+:\/\/)|\.(?:png|jpe?g|webp|svg|css|json|woff2?|po|mp3|ogg|wav)$/;

/** CSS values: `var(--x)`, `calc(...)`, transforms, gradients, media queries. */
const CSS_VALUE = /var\(--|calc\(|rgba?\(|(?:linear|radial|conic)-gradient|cubic-bezier|url\(|@media|!important|\d(?:px|rem|em|deg|vh|vw|fr|ms|s)\b|\b(?:translate|scale|rotate|skew|matrix|perspective)(?:3d|X|Y|Z)?\(|circle at /;

/** Positional CSS keyword pairs, e.g. the `transform-origin: left center` set. */
const CSS_KEYWORD = /^(?:left|right|center|top|bottom|start|end)$/;

/** Inline HTML markup, e.g. `<span class="chart-drag-ghost-sub">`. */
const HTML_MARKUP = /<\/?[a-z][a-z0-9]*(?:\s|>|\/>)/i;

/** A string built only from `{Placeholder}` tokens and punctuation carries no copy. */
const PLACEHOLDERS_ONLY = /^[\s\p{P}]*(?:\{[A-Za-z0-9_]+\}[\s\p{P}]*)+$/u;

/**
 * True when a string reads as authored player copy rather than an identifier.
 * Requires two or more word-like tokens, which is what separates "No governor"
 * from `noGovernor`, `no-governor`, or `NoGovernor`.
 */
function isProse(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (text.length < 3) return false;
  if (!/[A-Za-z]{2}/.test(text)) return false;
  if (ASSET_LIKE.test(text)) return false;
  if (CSS_VALUE.test(text)) return false;
  if (HTML_MARKUP.test(text)) return false;
  if (PLACEHOLDERS_ONLY.test(text)) return false;

  // Drop the placeholders so `held by {Name}` still reads as two words while
  // `{Count} {Unit}` does not.
  const words = text.replace(/\{[A-Za-z0-9_]+\}/g, ' ').trim().split(/\s+/).filter(Boolean);
  const wordy = words.filter(word => /[A-Za-z]{2}/.test(word));
  if (wordy.length < 2) return false;

  // Class lists such as `panel panel--open is-active`. At least one token must
  // carry a `-` or `_`, otherwise plain lowercase copy like `held by` would
  // read as a class list.
  const cssLike = words.every(word => CSS_TOKEN.test(word)) && words.some(word => /[-_]/.test(word));
  if (cssLike) return false;
  if (words.every(word => CSS_KEYWORD.test(word))) return false;
  return true;
}

/** Comparisons test ids; they never render. */
function isComparisonOperand(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (parent.type === 'BinaryExpression') {
    return ['===', '!==', '==', '!=', '>', '<', '>=', '<='].includes(parent.operator);
  }
  if (parent.type === 'SwitchCase' && parent.test === node) return true;
  return false;
}

/** Membership and lookup calls take ids, not copy. */
const ID_ARGUMENT_CALLEES = new Set([
  'includes', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith', 'has', 'get', 'set', 'delete',
  'add', 'match', 'search', 'split', 'closest', 'matches', 'querySelector', 'querySelectorAll',
  'getElementById', 'getAttribute', 'setAttribute', 'removeAttribute', 'addEventListener',
  'removeEventListener', 'getItem', 'setItem', 'removeItem', 'matchMedia', 'createElement',
  'getPropertyValue', 'setProperty', 'dispatchEvent', 'openScreen', 'bridgeCall', 'playSound',
]);

/** Diagnostics never reach the player. */
const DIAGNOSTIC_CALLEES = new Set(['error', 'warn', 'log', 'info', 'debug', 'trace', 'assert']);

/** Bare-identifier calls that take a developer diagnostic message. */
const DIAGNOSTIC_IDENTIFIER_CALLEES = new Set(['acknowledgeBridgeFailure', 'sendTextToNative']);

/**
 * Properties whose array value is a list of ids or proper nouns rather than
 * copy - relationship `types`, credited `names`, and the like.
 */
const ID_LIST_PROPERTIES = new Set(['types', 'ids', 'keys', 'names', 'tags', 'categories']);

/** JSX attributes that carry lookup keys or markup hooks, never copy. */
const NON_DISPLAY_JSX_ATTRIBUTES = new Set([
  'className', 'class', 'style', 'key', 'id', 'href', 'src', 'glossaryKey',
  'textKey', 'tutorialTarget', 'name', 'type', 'role', 'rel', 'target',
]);

function isNonDisplayCallArgument(node) {
  // Walk out of fallbacks and ternaries so `fn(x || 'text')` still resolves to
  // the enclosing call.
  let current = node;
  let parent = current.parent;
  while (
    parent
    && (parent.type === 'LogicalExpression' || parent.type === 'ConditionalExpression'
      || (parent.type === 'BinaryExpression' && parent.operator === '+'))
  ) {
    current = parent;
    parent = current.parent;
  }
  if (!parent || parent.type !== 'CallExpression') return false;
  if (!parent.arguments.includes(current)) return false;
  node = current;

  const callee = parent.callee;
  const name = callee?.type === 'Identifier'
    ? callee.name
    : callee?.type === 'MemberExpression'
      ? propertyName(callee.property)
      : '';

  if (ID_ARGUMENT_CALLEES.has(name)) return true;
  if (DIAGNOSTIC_CALLEES.has(name) && callee?.type === 'MemberExpression') return true;
  if (DIAGNOSTIC_IDENTIFIER_CALLEES.has(name)) return true;
  // `webUIText('Some.Key')` / `t('Some.Key')` - the key itself, not the args object.
  if ((name === 'webUIText' || name === 't') && parent.arguments[0] === node) return true;
  return false;
}

/** `throw new Error('...')` and friends are developer diagnostics. */
function isThrownDiagnostic(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'ThrowStatement') return true;
    if (current.type === 'NewExpression' && current.callee?.name?.endsWith('Error')) return true;
    if (current.type === 'FunctionDeclaration' || current.type === 'ArrowFunctionExpression') break;
  }
  return false;
}

function isNonDisplayJsxAttribute(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'JSXAttribute') {
      const name = propertyName(current.name);
      return NON_DISPLAY_JSX_ATTRIBUTES.has(name) || name.startsWith('data-');
    }
    if (current.type === 'JSXElement' || current.type === 'JSXFragment') return false;
  }
  return false;
}

/** `glossary['Power Bloc']` and friends: the string is a lookup key. */
function isComputedMemberKey(node) {
  const parent = node.parent;
  return Boolean(parent)
    && parent.type === 'MemberExpression'
    && parent.computed
    && parent.property === node;
}

/** An element of an id / proper-noun list, e.g. `types: ['Designated Heir']`. */
function isIdListElement(node) {
  const array = node.parent;
  if (!array || array.type !== 'ArrayExpression') return false;
  const owner = array.parent;
  if (!owner) return false;
  if (owner.type === 'Property' && owner.value === array) {
    return ID_LIST_PROPERTIES.has(propertyName(owner.key));
  }
  if (owner.type === 'VariableDeclarator' && owner.id?.type === 'Identifier') {
    return ID_LIST_PROPERTIES.has(owner.id.name.replace(/^[A-Z_]+$/, m => m.toLowerCase()));
  }
  return false;
}

/** A value bound to an id-shaped name, e.g. `const tutorialTarget = ...`. */
function isIdNamedBinding(node) {
  let current = node;
  let parent = current.parent;
  while (
    parent
    && (parent.type === 'LogicalExpression' || parent.type === 'ConditionalExpression'
      || (parent.type === 'BinaryExpression' && parent.operator === '+'))
  ) {
    current = parent;
    parent = current.parent;
  }
  if (!parent) return false;
  if (parent.type === 'VariableDeclarator' && parent.init === current && parent.id?.type === 'Identifier') {
    return NON_DISPLAY_JSX_ATTRIBUTES.has(parent.id.name);
  }
  return false;
}

/** Object and class property *keys* are identifiers even when they read as prose. */
function isPropertyKey(node) {
  const parent = node.parent;
  return Boolean(parent)
    && (parent.type === 'Property' || parent.type === 'PropertyDefinition' || parent.type === 'MethodDefinition')
    && parent.key === node
    && !parent.computed;
}

function isTypeContext(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type.startsWith('TS')) return true;
    if (current.type === 'FunctionDeclaration' || current.type === 'ArrowFunctionExpression') break;
  }
  return false;
}

function propertyName(node) {
  if (!node) return '';
  if (node.type === 'Identifier' || node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXNamespacedName') return `${node.namespace?.name}:${node.name?.name}`;
  if (node.type === 'Literal') return String(node.value ?? '');
  return '';
}

function isSkippedFile(filename) {
  const normal = filename.replace(/\\/g, '/');
  return (
    normal.includes('/src/dev/') ||
    normal.endsWith('/src/bridge-types.generated.ts') ||
    normal.endsWith('/src/localization/webui-text.generated.ts') ||
    normal.endsWith('/src/styles/theme.ts') ||
    normal.endsWith('/src/data/types.ts') ||
    // Design mock-up screen: fixture copy, never shown in a real campaign.
    normal.endsWith('/src/components/screens/system/MockGlanceScreen.tsx') ||
    // Developer console output.
    normal.endsWith('/src/perf/uiPerfProfiler.ts') ||
    // Bridge transport: operation names for logs and perf marks, no player copy.
    normal.endsWith('/src/bridge/core/runtimeEngine.ts') ||
    // React's own error text, reproduced for developer diagnostics.
    normal.endsWith('/src/utils/reactErrorDecoder.ts')
  );
}

function isLocalisedExpression(node) {
  let localised = false;

  function visit(current) {
    if (!current || localised) return;
    if (
      current.type === 'CallExpression' &&
      current.callee?.type === 'Identifier' &&
      (current.callee.name === 'webUIText' || current.callee.name === 't')
    ) {
      localised = true;
      return;
    }
    if (
      current.type === 'JSXElement' &&
      current.openingElement?.name?.type === 'JSXIdentifier' &&
      current.openingElement.name.name === 'WebUIText'
    ) {
      localised = true;
      return;
    }
    if (
      current.type === 'JSXOpeningElement' &&
      current.name?.type === 'JSXIdentifier' &&
      current.name.name === 'WebUIText'
    ) {
      localised = true;
      return;
    }

    for (const key of Object.keys(current)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const value = current[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child.type === 'string') visit(child);
        }
      } else if (value && typeof value.type === 'string') {
        visit(value);
      }
    }
  }

  visit(node);
  return localised;
}

function expressionHasHardcodedText(node) {
  if (!node || isLocalisedExpression(node)) return false;
  if (node.type === 'Literal') return hasReadableText(node.value);
  if (node.type === 'TemplateLiteral') {
    return node.quasis.some(quasi => hasReadableText(quasi.value?.cooked ?? ''));
  }
  if (node.type === 'ConditionalExpression') {
    return expressionHasHardcodedText(node.consequent) || expressionHasHardcodedText(node.alternate);
  }
  if (node.type === 'LogicalExpression') {
    return expressionHasHardcodedText(node.right);
  }
  if (node.type === 'BinaryExpression') {
    if (node.operator !== '+') return false;
    return expressionHasHardcodedText(node.left) || expressionHasHardcodedText(node.right);
  }
  return false;
}

function enclosingFunctionName(node) {
  let current = node.parent;
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      if (current.id?.name) return current.id.name;
      if (current.parent?.type === 'VariableDeclarator' && current.parent.id?.type === 'Identifier') {
        return current.parent.id.name;
      }
      if (current.parent?.type === 'Property' || current.parent?.type === 'PropertyDefinition') {
        return propertyName(current.parent.key);
      }
    }
    current = current.parent;
  }
  return '';
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded authored player-facing WebUI text.',
    },
    messages: {
      hardcoded:
        'Player-facing WebUI text must use the localisation catalog instead of a hardcoded string.',
    },
    schema: [],
  },

  create(context) {
    if (isSkippedFile(context.filename)) {
      return {};
    }

    function report(node) {
      context.report({ node, messageId: 'hardcoded' });
    }

    function isExemptProseSite(node) {
      return isComparisonOperand(node)
        || isNonDisplayCallArgument(node)
        || isNonDisplayJsxAttribute(node)
        || isPropertyKey(node)
        || isComputedMemberKey(node)
        || isIdListElement(node)
        || isIdNamedBinding(node)
        || isThrownDiagnostic(node)
        || isTypeContext(node);
    }

    return {
      // Prose reaching the player outside the allowlisted display slots below:
      // positional call arguments, `||` fallbacks, and interpolation arguments.
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (!isProse(node.value)) return;
        if (isExemptProseSite(node)) return;
        report(node);
      },

      // Prose spliced around `${}` holes, e.g. `held by ${name}`.
      TemplateLiteral(node) {
        if (isExemptProseSite(node)) return;
        for (const quasi of node.quasis) {
          const raw = quasi.value?.cooked ?? '';
          // A fragment is prose on its own, or becomes prose next to an
          // interpolated value - ` days` in `${n} days`. `xx` stands in for the
          // interpolated value so the fragment is judged as a second word.
          const adjacent = node.expressions.length > 0 ? `xx ${raw}` : raw;
          if (isProse(raw) || (/^\s/.test(raw) && isProse(adjacent))) {
            report(quasi);
            return;
          }
        }
      },

      JSXText(node) {
        if (hasReadableText(node.value)) {
          report(node);
        }
      },

      JSXAttribute(node) {
        const name = propertyName(node.name);
        if (!PLAYER_FACING_JSX_ATTRIBUTES.has(name)) return;
        if (node.value?.type === 'Literal' && hasReadableText(node.value.value)) {
          report(node.value);
        }
        if (node.value?.type === 'JSXExpressionContainer' && expressionHasHardcodedText(node.value.expression)) {
          report(node.value.expression);
        }
      },

      JSXExpressionContainer(node) {
        const parent = node.parent;
        if (
          parent?.type === 'JSXAttribute' ||
          parent?.type === 'JSXElement' && parent.openingElement?.name?.name === 'style'
        ) {
          return;
        }
        if (expressionHasHardcodedText(node.expression)) {
          report(node.expression);
        }
      },

      Property(node) {
        const name = propertyName(node.key);
        if (!PLAYER_FACING_PROPERTIES.has(name)) return;
        if (node.value?.type === 'Literal' && hasReadableText(node.value.value)) {
          report(node.value);
        }
        if (expressionHasHardcodedText(node.value)) {
          report(node.value);
        }
        if (
          node.value?.type === 'TemplateLiteral' &&
          node.value.expressions.length === 0 &&
          hasReadableText(node.value.quasis[0]?.value?.cooked ?? '')
        ) {
          report(node.value);
        }
      },

      AssignmentPattern(node) {
        if (node.left?.type !== 'Identifier') return;
        if (!PLAYER_FACING_BINDINGS.has(node.left.name)) return;
        if (expressionHasHardcodedText(node.right)) {
          report(node.right);
        }
      },

      ReturnStatement(node) {
        if (!PLAYER_FACING_RETURN_NAMES.test(enclosingFunctionName(node))) return;
        if (expressionHasHardcodedText(node.argument)) {
          report(node.argument);
        }
      },
    };
  },
};

export default rule;
