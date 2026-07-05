/**
 * Custom ESLint rule: flag any numeric expression rendered as text (inside a
 * JSXExpressionContainer that's a child of an element, or inside a template
 * literal `${}`) that isn't wrapped in a formatter.
 *
 * Rationale: the UI bridge sends floats as full-precision `number` values,
 * and raw `{value}` renders give the player `540.63641357421875`. Every number
 * that ends up in text must pass through an explicit formatter so the author
 * has decided how it should look.
 *
 * Safe wrappers (any of these at any ancestor inside the expression tree
 * satisfy the rule):
 *   - `x.toFixed(n)` / `.toString()` / `.toLocaleString()` / `.toPrecision()` / `.toExponential()`
 *   - `Math.round/floor/ceil/trunc(...)`
 *   - any call whose callee name starts with `format` (e.g. `formatPercent`, `formatDays`)
 *   - `String(...)` (explicit coercion)
 *
 * Uses typescript-eslint parser services to check TS types; requires the
 * flat-config entry to supply `languageOptions.parserOptions.projectService`.
 */

import ts from 'typescript';

const FORMATTER_METHODS = new Set([
  'toFixed',
  'toString',
  'toLocaleString',
  'toPrecision',
  'toExponential',
]);

const MATH_FORMATTERS = new Set(['round', 'floor', 'ceil', 'trunc']);

/** Does the given call expression look like a format-family helper? */
function isFormatterCall(node) {
  if (!node || node.type !== 'CallExpression') return false;
  const callee = node.callee;

  // `String(x)` — explicit string coercion.
  if (callee.type === 'Identifier' && callee.name === 'String') return true;

  // `formatFoo(x)` — any call whose identifier starts with `format`.
  if (callee.type === 'Identifier' && callee.name.startsWith('format')) return true;

  if (callee.type === 'MemberExpression' && !callee.computed) {
    const propName = callee.property.name;
    // `x.toFixed(n)` etc.
    if (FORMATTER_METHODS.has(propName)) return true;
    // `Math.round(x)` etc.
    if (
      MATH_FORMATTERS.has(propName) &&
      callee.object.type === 'Identifier' &&
      callee.object.name === 'Math'
    ) {
      return true;
    }
    // `SomeModule.formatFoo(x)` — qualified format helper.
    if (propName && propName.startsWith('format')) return true;
  }

  return false;
}

/** Walk from `node` up through ancestors; return true if the node itself or
 *  any enclosing expression up to (but not including) the JSX/template
 *  boundary is a formatter call. */
function isInsideFormatter(node, boundary) {
  let cur = node;
  while (cur && cur !== boundary) {
    if (isFormatterCall(cur)) return true;
    cur = cur.parent;
  }
  return false;
}

/** A literal `0`, `1`, etc. is allowed — the author typed the number directly. */
function isSafeLiteral(node) {
  if (!node) return false;
  if (node.type === 'Literal' && typeof node.value === 'number') return true;
  // `-1`, `+2`
  if (
    node.type === 'UnaryExpression' &&
    (node.operator === '-' || node.operator === '+') &&
    isSafeLiteral(node.argument)
  ) {
    return true;
  }
  return false;
}

/** Well-known integer properties where formatting adds nothing. */
const INTEGER_PROPERTIES = new Set(['length', 'size', 'byteLength']);

/** `arr.length`, `map.size`, `buf.byteLength` etc. are always integers. */
function isIntegerProperty(node) {
  return (
    node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    INTEGER_PROPERTIES.has(node.property.name)
  );
}

function isStyleElement(node) {
  return (
    node &&
    node.type === 'JSXElement' &&
    node.openingElement?.name?.type === 'JSXIdentifier' &&
    node.openingElement.name.name === 'style'
  );
}

function typeIsNumeric(type) {
  if (!type) return false;
  if (type.flags & ts.TypeFlags.Number) return true;
  if (type.flags & ts.TypeFlags.NumberLiteral) return true;
  if (type.isUnion && type.isUnion()) {
    const parts = type.types;
    const allNumericOrNullish = parts.every(
      t =>
        t.flags & ts.TypeFlags.Number ||
        t.flags & ts.TypeFlags.NumberLiteral ||
        t.flags & ts.TypeFlags.Undefined ||
        t.flags & ts.TypeFlags.Null,
    );
    const someNumeric = parts.some(
      t => t.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral),
    );
    return allNumericOrNullish && someNumeric;
  }
  return false;
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow rendering raw number-typed expressions as JSX text or in template literals without an explicit formatter (toFixed, Math.round, formatPercent, etc.).',
    },
    messages: {
      unformatted:
        'Numeric value rendered without a formatter. Wrap with `.toFixed(n)`, `Math.round(…)`, `formatPercent(…)`, or another explicit formatter — raw float renders look broken to the player.',
    },
    schema: [],
  },

  create(context) {
    const services = context.sourceCode?.parserServices ?? context.parserServices;
    if (!services || !services.program || typeof services.esTreeNodeToTSNodeMap?.get !== 'function') {
      // Type info not available — rule is a no-op. Keeps the rule safe on
      // config files and when the TS project service isn't wired up.
      return {};
    }

    const checker = services.program.getTypeChecker();

    function isNumberType(node) {
      try {
        const tsNode = services.esTreeNodeToTSNodeMap.get(node);
        if (!tsNode) return false;
        const type = checker.getTypeAtLocation(tsNode);
        return typeIsNumeric(type);
      } catch {
        return false;
      }
    }

    /** For an Identifier, see if its declaration initializes it from a
     *  formatter call (or from another such identifier, transitively).
     *  This lets authors precompute `const unrestRounded = Math.round(x)`
     *  once and render `{unrestRounded}` without the rule firing. */
    function isIdentifierFromFormatter(node, depth = 0) {
      if (depth > 4) return false;  // guard against cycles
      if (node.type !== 'Identifier') return false;
      const scope = context.sourceCode.getScope(node);
      // Walk scopes looking for the binding.
      let variable = null;
      for (let s = scope; s && !variable; s = s.upper) {
        variable = s.variables.find(v => v.name === node.name) || null;
      }
      if (!variable) return false;
      for (const def of variable.defs) {
        if (def.type !== 'Variable') continue;
        const init = def.node.init;
        if (!init) continue;
        if (isFormatterCall(init)) return true;
        if (init.type === 'Identifier' && isIdentifierFromFormatter(init, depth + 1)) return true;
        // Conditional: both branches must be formatter-derived.
        if (init.type === 'ConditionalExpression') {
          const okConsequent =
            isFormatterCall(init.consequent) ||
            (init.consequent.type === 'Identifier' &&
              isIdentifierFromFormatter(init.consequent, depth + 1));
          const okAlternate =
            isFormatterCall(init.alternate) ||
            (init.alternate.type === 'Identifier' &&
              isIdentifierFromFormatter(init.alternate, depth + 1));
          if (okConsequent && okAlternate) return true;
        }
      }
      return false;
    }

    function checkExpression(node, boundary) {
      if (!node) return;
      if (isSafeLiteral(node)) return;
      if (isIntegerProperty(node)) return;
      if (!isNumberType(node)) return;
      if (isInsideFormatter(node, boundary)) return;
      if (node.type === 'Identifier' && isIdentifierFromFormatter(node)) return;
      context.report({ node, messageId: 'unformatted' });
    }

    return {
      // `<div>{expr}</div>` — JSX text children.
      JSXExpressionContainer(node) {
        const parent = node.parent;
        if (!parent) return;
        if (parent.type !== 'JSXElement' && parent.type !== 'JSXFragment') return;
        if (isStyleElement(parent)) return;
        if (node.expression.type === 'JSXEmptyExpression') return;
        if (node.expression.type === 'TemplateLiteral') {
          for (const expr of node.expression.expressions) {
            checkExpression(expr, node.expression);
          }
          return;
        }

        checkExpression(node.expression, node);
      },

      // `` `Total: ${value}` `` — template literal interpolations.
    };
  },
};

export default rule;
