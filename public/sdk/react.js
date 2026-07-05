/**
 * Import-map shim for `react`.
 *
 * When a runtime-loaded mod's bundle says `import React from 'react'`, the
 * browser follows the import map in index.html and resolves 'react' to
 * this file. This file re-exports the host's single React instance, so
 * the mod and the host share hook identity (as they must).
 *
 * Do NOT bundle or transform this file. It must stay as a static ES module
 * served as-is from /sdk/react.js.
 */
const React = globalThis.FOAE.React;

export default React;

// Re-export everything the mod might consume. Import *from* react:
//   import { useState, useEffect } from 'react';
export const {
  Children,
  Component,
  Fragment,
  PureComponent,
  StrictMode,
  Suspense,
  cloneElement,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  version,
} = React;
