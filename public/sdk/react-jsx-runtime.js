/**
 * Import-map shim for `react/jsx-runtime`.
 *
 * Modern bundlers compile JSX to `_jsx(...)` / `_jsxs(...)` calls imported
 * from 'react/jsx-runtime'. When a mod's built bundle does this, the
 * browser's import map resolves the specifier to this file, which hands
 * back the host's JSX runtime.
 *
 * Do NOT bundle or transform. Served as-is from /sdk/react-jsx-runtime.js.
 */
const rt = globalThis.FOAE.jsxRuntime;

export const jsx = rt.jsx;
export const jsxs = rt.jsxs;
export const Fragment = rt.Fragment;
export const jsxDEV = rt.jsxDEV;
