import { receiveNativeAuthLink } from '@/auth/callback-inbox';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return receiveNativeAuthLink(path);
}
