// Web preview deliberately keeps credentials out of localStorage. Native resolves .native.ts.
const values = new Map<string, string>();
export const sessionStorage = {
  getItem: async (key: string) => values.get(key) ?? null,
  setItem: async (key: string, value: string) => { values.set(key, value); },
  removeItem: async (key: string) => { values.delete(key); },
};
