import noUnformattedNumberRender from './no-unformatted-number-render.js';
import noMissingAsset from './no-missing-asset.js';
import noUnsupportedFoaeCefUIFeatures from './no-unsupported-runtime-features.js';
import noHardcodedPlayerText from './no-hardcoded-player-text.js';
import noMixedAnimationUnits from './no-mixed-animation-units.js';
import noExpensiveFoaeCefUISelectors from './no-expensive-runtime-selectors.js';

function makeLineVirtualSource(text, variableName) {
  const lines = text.split(/\r?\n/);
  if (/(?:^|})\s*\.tooltip-wrapper-inline\s*\{[\s\S]*?\bposition\s*:\s*relative\b/i.test(text)) {
    lines.push('.tooltip-wrapper-inline { position: relative; }');
  }
  return `const ${variableName} = [\n${lines.map((line) => `  ${JSON.stringify(line)},`).join('\n')}\n];\n`;
}

function mapLineMessages(messageLists) {
  return messageLists.flat().map((message) => ({
    ...message,
    line: message.line ? Math.max(1, message.line - 1) : message.line,
    endLine: message.endLine ? Math.max(1, message.endLine - 1) : message.endLine,
  }));
}

export default {
  rules: {
    'no-unformatted-number-render': noUnformattedNumberRender,
    'no-missing-asset': noMissingAsset,
    'no-unsupported-runtime-features': noUnsupportedFoaeCefUIFeatures,
    'no-hardcoded-player-text': noHardcodedPlayerText,
    'no-mixed-animation-units': noMixedAnimationUnits,
    'no-expensive-runtime-selectors': noExpensiveFoaeCefUISelectors,
  },
  processors: {
    css: {
      meta: {
        name: 'local/css',
        version: '1.0.0',
      },
      preprocess(text) {
        return [makeLineVirtualSource(text, '__RuntimeCss')];
      },
      postprocess: mapLineMessages,
      supportsAutofix: false,
    },
  },
};
