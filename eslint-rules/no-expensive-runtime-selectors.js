const ROOT_SELECTOR_PATTERN = /(?:^|[\s>+~])(?:html|body|:root|#root|\.game-container)(?:[#.:[\]\w="'|~^$*-]+)*\s+\*(?=$|[\s.#:[>+~])/i;
const GLOBAL_UNIVERSAL_PATTERN = /^\*(?=$|[\s.#:[>+~])/;

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, ' '));
}

function findPreludeStart(text, openBraceIndex) {
  for (let index = openBraceIndex - 1; index >= 0; index -= 1) {
    const char = text[index];
    if (char === '{' || char === '}' || char === ';') {
      return index + 1;
    }
  }

  return 0;
}

function normaliseSelector(selector) {
  return selector
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, ' $1 ')
    .trim();
}

function isKeyframeSelector(selector) {
  return /^(?:from|to|\d+(?:\.\d+)?%)$/i.test(selector.trim());
}

function isExpensiveSelector(selector) {
  const normalised = normaliseSelector(selector);
  if (!normalised || normalised.startsWith('@') || isKeyframeSelector(normalised)) {
    return false;
  }

  return GLOBAL_UNIVERSAL_PATTERN.test(normalised)
    || ROOT_SELECTOR_PATTERN.test(normalised);
}

function splitSelectorList(prelude) {
  const selectors = [];
  let start = 0;
  let quote = null;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let index = 0; index < prelude.length; index += 1) {
    const char = prelude[index];
    const previous = prelude[index - 1];

    if (quote) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '[') {
      bracketDepth += 1;
      continue;
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
      continue;
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (char !== ',' || bracketDepth > 0 || parenDepth > 0) {
      continue;
    }

    selectors.push({
      text: prelude.slice(start, index),
      offset: start,
    });
    start = index + 1;
  }

  selectors.push({
    text: prelude.slice(start),
    offset: start,
  });

  return selectors;
}

function lineForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function columnForIndex(text, index) {
  const lastNewline = Math.max(text.lastIndexOf('\n', index - 1), text.lastIndexOf('\r', index - 1));
  return index - lastNewline - 1;
}

function reportSelector(context, node, text, selector, selectorIndex, lineOffset) {
  const line = lineForIndex(text, selectorIndex);
  const column = columnForIndex(text, selectorIndex);
  const displaySelector = normaliseSelector(selector);

  context.report({
    node,
    messageId: 'expensiveSelector',
    data: {
      selector: displaySelector,
    },
    loc: {
      start: {
        line: line + lineOffset,
        column,
      },
      end: {
        line: line + lineOffset,
        column: column + selector.trimEnd().length,
      },
    },
  });
}

function checkCssText(context, node, rawText, lineOffset = 0) {
  if (!rawText) {
    return;
  }

  const text = stripCssComments(rawText);

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '{') {
      continue;
    }

    const preludeStart = findPreludeStart(text, index);
    const prelude = text.slice(preludeStart, index);
    if (!prelude.trim() || prelude.trimStart().startsWith('@')) {
      continue;
    }

    for (const selector of splitSelectorList(prelude)) {
      const trimmedStart = selector.text.search(/\S/);
      if (trimmedStart === -1) {
        continue;
      }

      const selectorText = selector.text.slice(trimmedStart);
      if (!isExpensiveSelector(selectorText)) {
        continue;
      }

      reportSelector(
        context,
        node,
        text,
        selectorText,
        preludeStart + selector.offset + trimmedStart,
        lineOffset,
      );
    }
  }
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

function getVirtualCssLines(program) {
  for (const statement of program.body) {
    if (statement.type !== 'VariableDeclaration') {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (
        declaration.id.type !== 'Identifier'
        || declaration.id.name !== '__RuntimeCss'
        || declaration.init?.type !== 'ArrayExpression'
      ) {
        continue;
      }

      const lines = [];
      for (const element of declaration.init.elements) {
        if (element?.type === 'Literal' && typeof element.value === 'string') {
          lines.push(element.value);
        }
      }
      return lines;
    }
  }

  return null;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow broad universal selectors that make Webkiln invalidate large style subtrees',
    },
    schema: [],
    messages: {
      expensiveSelector: 'Avoid broad universal selector `{{selector}}`; use explicit element selectors or a scoped direct-child selector so Webkiln does not perform full-subtree style invalidation.',
    },
  },

  create(context) {
    let hasVirtualCss = false;

    return {
      Program(node) {
        const lines = getVirtualCssLines(node);
        if (lines) {
          hasVirtualCss = true;
          checkCssText(context, node, lines.join('\n'), 1);
        }
      },

      Literal(node) {
        if (!hasVirtualCss && typeof node.value === 'string') {
          checkCssText(context, node, node.value, node.loc ? node.loc.start.line - 1 : 0);
        }
      },

      TemplateLiteral(node) {
        if (!hasVirtualCss) {
          checkCssText(context, node, getStaticString(node), node.loc ? node.loc.start.line - 1 : 0);
        }
      },
    };
  },
};
