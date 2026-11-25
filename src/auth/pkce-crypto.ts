// Web uses the browser's Web Crypto. Native resolves pkce-crypto.native.ts.
export function ensurePkceCrypto() {
  if (typeof globalThis.crypto?.getRandomValues !== 'function' || typeof globalThis.crypto?.subtle?.digest !== 'function'
    || typeof TextEncoder === 'undefined' || typeof btoa !== 'function') {
    throw new Error('Secure authentication is unavailable.');
  }
}
