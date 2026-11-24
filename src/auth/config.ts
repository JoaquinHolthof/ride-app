export function authConfig(url: string | undefined, key: string | undefined) {
  if (!url?.trim() || !key?.trim()) {
    return { error: 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY, then restart Expo.' } as const;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash
      || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error();
    return { url: parsed.origin, key } as const;
  } catch {
    return { error: 'Authentication needs a valid HTTPS project URL and a Supabase publishable key.' } as const;
  }
}
