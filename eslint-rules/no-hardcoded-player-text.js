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

function propertyName(node) {
  if (!node) return '';
  if (node.type === 'Identifier') return node.name;
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
    normal.endsWith('/src/data/types.ts')
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

    return {
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
