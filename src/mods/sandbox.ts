import { isGameLocalResourceUrl, resourceUrlText } from '../utils/localResourceUrl';

type XMLHttpRequestOpen = typeof XMLHttpRequest.prototype.open;

function assertLocalResourceUrl(input: unknown): void {
  if (!isGameLocalResourceUrl(input)) {
    throw new Error(`Blocked external mod resource: ${resourceUrlText(input)}`);
  }
}

function installFetchGuard(): void {
  const nativeFetch = globalThis.fetch;
  if (typeof nativeFetch !== 'function') return;

  globalThis.fetch = function guardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    assertLocalResourceUrl(input);
    return nativeFetch(input, init);
  } as typeof fetch;
}

function installXhrGuard(): void {
  if (typeof XMLHttpRequest === 'undefined') return;

  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function guardedOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    assertLocalResourceUrl(url);
    return nativeOpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
  } as XMLHttpRequestOpen;
}

function installWebSocketGuard(): void {
  const NativeWebSocket = globalThis.WebSocket;
  if (typeof NativeWebSocket !== 'function') return;

  const GuardedWebSocket = function guardedWebSocket(url: string | URL, protocols?: string | string[]): WebSocket {
    assertLocalResourceUrl(url);
    return new NativeWebSocket(url, protocols);
  } as unknown as typeof WebSocket;

  GuardedWebSocket.prototype = NativeWebSocket.prototype;
  globalThis.WebSocket = GuardedWebSocket;
}

function installBeaconGuard(): void {
  const navigatorWithBeacon = navigator as Navigator & {
    sendBeacon?: (url: string | URL, data?: BodyInit | null) => boolean;
  };
  const nativeSendBeacon = navigatorWithBeacon.sendBeacon;
  if (typeof nativeSendBeacon !== 'function') return;

  navigatorWithBeacon.sendBeacon = function guardedSendBeacon(url: string | URL, data?: BodyInit | null): boolean {
    assertLocalResourceUrl(url);
    return nativeSendBeacon.call(this, url, data);
  };
}

function installWindowOpenGuard(): void {
  const nativeOpen = window.open;
  if (typeof nativeOpen !== 'function') return;

  window.open = function guardedOpen(url?: string | URL, target?: string, features?: string): Window | null {
    assertLocalResourceUrl(url ?? '');
    return nativeOpen.call(this, url, target, features);
  };
}

function guardUrlProperty<T extends Element>(prototype: T | undefined, property: string): void {
  if (!prototype) return;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
  if (!descriptor?.set) return;

  Object.defineProperty(prototype, property, {
    ...descriptor,
    set(value: string) {
      assertLocalResourceUrl(value);
      descriptor.set?.call(this, value);
    },
  });
}

function installElementAttributeGuard(): void {
  const nativeSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function guardedSetAttribute(name: string, value: string): void {
    const lowerName = name.toLowerCase();
    if (lowerName === 'src' || lowerName === 'href' || lowerName === 'action' || lowerName === 'formaction') {
      assertLocalResourceUrl(value);
    }
    return nativeSetAttribute.call(this, name, value);
  };

  guardUrlProperty(typeof HTMLScriptElement !== 'undefined' ? HTMLScriptElement.prototype : undefined, 'src');
  guardUrlProperty(typeof HTMLLinkElement !== 'undefined' ? HTMLLinkElement.prototype : undefined, 'href');
  guardUrlProperty(typeof HTMLImageElement !== 'undefined' ? HTMLImageElement.prototype : undefined, 'src');
  guardUrlProperty(typeof HTMLAnchorElement !== 'undefined' ? HTMLAnchorElement.prototype : undefined, 'href');
}

installFetchGuard();
installXhrGuard();
installWebSocketGuard();
installBeaconGuard();
installWindowOpenGuard();
installElementAttributeGuard();
