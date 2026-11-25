import { AUTH_CALLBACK_ROUTE, parseAuthCallback, type AuthCallback } from './redirects';

let snapshot: { callback: AuthCallback; revision: number } | null = null;
let revision = 0;
const listeners = new Set<() => void>();
export const callbackInbox = {
  getSnapshot: () => snapshot,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  clear: () => { snapshot = null; listeners.forEach(listener => listener()); },
};

export function receiveNativeAuthLink(path: string): string {
  // Only intercept our callback. Remove credentials before Router builds navigation state.
  if (!/^rideapp:\/\/auth\/callback(?:[?#]|$)/i.test(path)) return path;
  snapshot = { callback: parseAuthCallback(path), revision: ++revision };
  listeners.forEach(listener => listener());
  return AUTH_CALLBACK_ROUTE;
}
