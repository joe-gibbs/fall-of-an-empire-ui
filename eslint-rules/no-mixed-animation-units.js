const LENGTH_UNITS = new Set([
  '%',
  'px',
  'pt',
  'vh',
  'vw',
  'vmin',
  'vmax',
  'in',
  'em',
  'rem',
]);

const LENGTH_UNIT_PATTERN = /(^|[^\w.-])-?(?:\d+\.?\d*|\.\d+)([a-z%]+)/gi;
const TRANSFORM_DECLARATION_PATTERN = /\btransform\s*:\s*([^;{}]+)/gi;
const TRANSFORM_FUNCTION_PATTERN = /\b([a-zA-Z][\w-]*)\s*\(([^()]*)\)/g;
const DECLARATION_PATTERN = /([-\w]+)\s*:\s*([^;{}]+);/g;
const KEYFRAMES_PATTERN = /@keyframes\s+([-\w]+)\s*\{/g;

const LENGTH_TRANSFORM_FUNCTIONS = new Set([
  'perspective',
  'translate',
  'translate3d',
  'translatex',
  'translatey',
  'translatez',
]);

function collectUnits(text) {
  const units = new Set();
  LENGTH_UNIT_PATTERN.lastIndex = 0;

  let match;
  while ((match = LENGTH_UNIT_PATTERN.exec(text)) !== null) {
    const unit = match[2].toLowerCase();
    if (LENGTH_UNITS.has(unit)) {
      units.add(unit);
    }
  }

  return units;
}

function splitTransformArguments(text) {
  if (text.includes(',')) {
    return text.split(',').map((part) => part.trim());
  }

  return text.trim().split(/\s+/).filter(Boolean);
}

function findLineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function findMatchingBrace(text, openBraceIndex) {
  let depth = 0;

  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function formatUnits(units) {
  return [...units].sort().join(', ');
}

function reportAtLine(context, node, line, text, messageId, data, lineOffset) {
  context.report({
    node,
    messageId,
    data,
    loc: {
      start: {
        line: line + lineOffset,
        column: 0,
      },
      end: {
        line: line + lineOffset,
        column: text.length,
      },
    },
  });
}

function inspectTransformValue(
  context,
  node,
  value,
  line,
  lineText,
  lineOffset,
  reports,
  components,
  options = {},
) {
  TRANSFORM_FUNCTION_PATTERN.lastIndex = 0;

  let match;
  while ((match = TRANSFORM_FUNCTION_PATTERN.exec(value)) !== null) {
    const displayFunctionName = match[1];
    const functionName = displayFunctionName.toLowerCase();
    if (!LENGTH_TRANSFORM_FUNCTIONS.has(functionName)) {
      continue;
    }

    const args = splitTransformArguments(match[2]);
    const functionUnits = new Set();

    args.forEach((arg, argIndex) => {
      const units = collectUnits(arg);
      for (const unit of units) {
        functionUnits.add(unit);
        components.push({
          key: `${functionName}:${argIndex}`,
          functionName: displayFunctionName,
          unit,
          line,
          lineText,
        });
      }
    });

    if (options.reportMixedFunctionUnits !== false && functionUnits.size > 1) {
      const reportKey = `${line}:${functionName}:${formatUnits(functionUnits)}`;
      if (!reports.has(reportKey)) {
        reportAtLine(
          context,
          node,
          line,
          lineText,
          'mixedTransformUnits',
          {
            functionName: displayFunctionName,
            units: formatUnits(functionUnits),
          },
          lineOffset,
        );
        reports.add(reportKey);
      }
    }
  }
}

function checkTransformDeclarations(context, node, text, lineOffset) {
  const lines = text.split(/\r?\n/);
  const reports = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const line = index + 1;
    const lineText = lines[index];
    TRANSFORM_DECLARATION_PATTERN.lastIndex = 0;

    let match;
    while ((match = TRANSFORM_DECLARATION_PATTERN.exec(lineText)) !== null) {
      inspectTransformValue(context, node, match[1], line, lineText, lineOffset, reports, []);
    }
  }
}

function checkKeyframeUnitConsistency(context, node, text, lineOffset) {
  KEYFRAMES_PATTERN.lastIndex = 0;

  let blockMatch;
  while ((blockMatch = KEYFRAMES_PATTERN.exec(text)) !== null) {
    const name = blockMatch[1];
    const openBraceIndex = text.indexOf('{', blockMatch.index);
    const closeBraceIndex = findMatchingBrace(text, openBraceIndex);
    if (closeBraceIndex === -1) {
      continue;
    }

    const body = text.slice(openBraceIndex + 1, closeBraceIndex);
    const bodyOffset = openBraceIndex + 1;
    const propertyUnits = new Map();
    const transformUnits = new Map();
    const reported = new Set();

    DECLARATION_PATTERN.lastIndex = 0;
    let declarationMatch;
    while ((declarationMatch = DECLARATION_PATTERN.exec(body)) !== null) {
      const property = declarationMatch[1].toLowerCase();
      const value = declarationMatch[2];
      const declarationIndex = bodyOffset + declarationMatch.index;
      const line = findLineNumber(text, declarationIndex);
      const lineText = text.split(/\r?\n/)[line - 1] ?? '';

      if (property === 'transform') {
        const components = [];
        inspectTransformValue(
          context,
          node,
          value,
          line,
          lineText,
          lineOffset,
          reported,
          components,
          { reportMixedFunctionUnits: false },
        );

        for (const component of components) {
          const previousUnits = transformUnits.get(component.key) ?? new Set();
          if (previousUnits.size > 0 && !previousUnits.has(component.unit)) {
            const reportKey = `transform:${component.key}`;
            if (!reported.has(reportKey)) {
              const units = new Set(previousUnits);
              units.add(component.unit);
              reportAtLine(
                context,
                node,
                line,
                lineText,
                'mixedKeyframeUnits',
                {
                  name,
                  property: `${component.functionName}()`,
                  units: formatUnits(units),
                },
                lineOffset,
              );
              reported.add(reportKey);
            }
          }

          previousUnits.add(component.unit);
          transformUnits.set(component.key, previousUnits);
        }

        continue;
      }

      const units = collectUnits(value);
      if (units.size === 0) {
        continue;
      }

      if (units.size > 1) {
        const reportKey = `${property}:declaration`;
        if (!reported.has(reportKey)) {
          reportAtLine(
            context,
            node,
            line,
            lineText,
            'mixedKeyframeUnits',
            {
              name,
              property,
              units: formatUnits(units),
            },
            lineOffset,
          );
          reported.add(reportKey);
        }
      }

      const previousUnits = propertyUnits.get(property) ?? new Set();
      for (const unit of units) {
        if (previousUnits.size > 0 && !previousUnits.has(unit)) {
          const reportKey = `${property}:across-keyframes`;
          if (!reported.has(reportKey)) {
            const allUnits = new Set(previousUnits);
            allUnits.add(unit);
            reportAtLine(
              context,
              node,
              line,
              lineText,
              'mixedKeyframeUnits',
              {
                name,
                property,
                units: formatUnits(allUnits),
              },
              lineOffset,
            );
            reported.add(reportKey);
          }
        }

        previousUnits.add(unit);
      }
      propertyUnits.set(property, previousUnits);
    }

    KEYFRAMES_PATTERN.lastIndex = closeBraceIndex;
  }
}

function checkCssText(context, node, text, lineOffset = 0) {
  if (!text) {
    return;
  }

  checkTransformDeclarations(context, node, text, lineOffset);
  checkKeyframeUnitConsistency(context, node, text, lineOffset);
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
      description: 'disallow mixed CSS units in Webkiln animations and transform functions',
    },
    schema: [],
    messages: {
      mixedTransformUnits: 'Webkiln can warn when interpolating {{functionName}}() with mixed CSS units ({{units}}). Split axes into separate transform functions or use one unit type.',
      mixedKeyframeUnits: 'Webkiln cannot reliably interpolate {{property}} in @keyframes {{name}} between mixed CSS units ({{units}}). Use one unit type across the animation.',
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
