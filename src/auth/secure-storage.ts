interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
interface Manifest { revision: string; count: number }

// 500 UTF-16 code units use at most 1500 UTF-8 bytes, below older iOS item limits.
// Each chunk AND the manifest live in SecureStore, never in plaintext AsyncStorage.
export function createSecureSessionStorage(store: Storage): Storage {
  let sequence = 0;
  let pending: Promise<unknown> = Promise.resolve();
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation).catch(() => { throw new Error('Secure session storage is unavailable.'); });
    pending = result.catch(() => {});
    return result;
  };
  const manifestKey = (key: string) => `${key}.manifest`;
  const chunkKey = (key: string, manifest: Manifest, index: number) => `${key}.${manifest.revision}.${index}`;
  async function readManifest(key: string): Promise<Manifest | null> {
    const raw = await store.getItem(manifestKey(key));
    if (raw === null) return null;
    const value = JSON.parse(raw) as Manifest;
    if (!/^[a-z0-9-]+$/.test(value.revision) || !Number.isInteger(value.count) || value.count < 1 || value.count > 128) throw new Error();
    return value;
  }
  async function removeChunks(key: string, manifest: Manifest) {
    for (let i = 0; i < manifest.count; i++) await store.removeItem(chunkKey(key, manifest, i));
  }
  return {
    getItem: key => serial(async () => {
      const manifest = await readManifest(key);
      if (!manifest) return null;
      const chunks: string[] = [];
      for (let i = 0; i < manifest.count; i++) {
        const chunk = await store.getItem(chunkKey(key, manifest, i));
        if (chunk === null) throw new Error(); // Never return a partial session.
        chunks.push(chunk);
      }
      return chunks.join('');
    }),
    setItem: (key, value) => serial(async () => {
      const previous = await readManifest(key);
      const chunks = [''];
      for (const character of value) {
        if (chunks[chunks.length - 1].length + character.length > 500) chunks.push('');
        chunks[chunks.length - 1] += character;
      }
      const next = { revision: `${Date.now().toString(36)}-${++sequence}`, count: chunks.length };
      if (next.count > 128) throw new Error();
      try {
        for (let i = 0; i < next.count; i++) await store.setItem(chunkKey(key, next, i), chunks[i]);
        // Publish only after every chunk succeeds; failed updates preserve the previous session.
        await store.setItem(manifestKey(key), JSON.stringify(next));
      } catch {
        await removeChunks(key, next).catch(() => {});
        throw new Error();
      }
      // Old encrypted chunks are unreachable if cleanup is interrupted; never roll back the committed session.
      if (previous) await removeChunks(key, previous).catch(() => {});
    }),
    removeItem: key => serial(async () => {
      const manifest = await readManifest(key);
      await store.removeItem(manifestKey(key));
      if (manifest) await removeChunks(key, manifest);
    }),
  };
}
