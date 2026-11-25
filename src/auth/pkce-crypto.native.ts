import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';

// Supabase auth-js reads Web Crypto globals. Supply only its missing PKCE primitives;
// preserve an existing implementation. Expo's getRandomValues fails closed on native
// (unlike getRandomBytes, which has a development-only Math.random fallback).
export function ensurePkceCrypto() {
  const target = globalThis as unknown as { crypto?: {
    getRandomValues?: typeof getRandomValues;
    subtle?: { digest?: (algorithm: string | { name: string }, data: BufferSource) => Promise<ArrayBuffer> };
  } };
  target.crypto ??= {};
  target.crypto.getRandomValues ??= getRandomValues;
  target.crypto.subtle ??= {};
  target.crypto.subtle.digest ??= (algorithm, data) => {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name.toUpperCase() !== 'SHA-256') return Promise.reject(new Error('Unsupported digest.'));
    return digest(CryptoDigestAlgorithm.SHA256, data);
  };
  if (typeof TextEncoder === 'undefined' || typeof btoa !== 'function') throw new Error('Secure authentication is unavailable.');
}
