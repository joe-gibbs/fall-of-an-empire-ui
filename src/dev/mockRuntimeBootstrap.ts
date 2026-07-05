import { installMockruntimeEngine } from './mockRuntimeEngine';

try {
  installMockruntimeEngine();
  window.dispatchEvent(new Event('foae:mock-runtime-ready'));
} catch (error) {
  console.error('[MockBridge] Failed to install mock runtime bridge', error);
  window.dispatchEvent(new Event('foae:mock-runtime-error'));
}
