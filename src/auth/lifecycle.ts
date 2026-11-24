import type { Session, SupabaseClient } from '@supabase/supabase-js';

export type AuthState =
  | { status: 'loading'; session: null; error: null }
  | { status: 'ready'; session: Session | null; error: null }
  | { status: 'error'; session: null; error: string };
export const initialAuthState: AuthState = { status: 'loading', session: null, error: null };
export const authAccess = (state: AuthState) => ({
  protected: state.status === 'ready' && state.session !== null,
  public: state.status === 'ready' && state.session === null,
});
type Auth = Pick<SupabaseClient['auth'], 'getSession' | 'onAuthStateChange' | 'startAutoRefresh' | 'stopAutoRefresh'>;
interface Visibility {
  currentState: string | null | undefined;
  addEventListener(event: 'change', callback: (state: string) => void): { remove(): void };
}

export function observeAuth(auth: Auth, publish: (state: AuthState) => void, visibility?: Visibility) {
  let active = true;
  let revision = 0;
  const failed = () => { if (active) publish({ status: 'error', session: null,
    error: 'Could not restore your session. Check your connection, unlock your device and try again.' }); };
  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    // getSession owns initial resolution/errors; SDK INITIAL_SESSION can mask a storage failure.
    if (!active || event === 'INITIAL_SESSION') return;
    revision++;
    publish({ status: 'ready', session, error: null });
  });
  const restoreRevision = revision;
  void auth.getSession().then(({ data, error }) => {
    if (!active || revision !== restoreRevision) return;
    if (error) failed(); else publish({ status: 'ready', session: data.session, error: null });
  }).catch(() => { if (revision === restoreRevision) failed(); });
  // Serialize transitions so rapid foreground/background events cannot leave refresh running.
  let refreshWork = Promise.resolve();
  const refresh = (state: string | null | undefined) => {
    refreshWork = refreshWork.then(() => active && state === 'active'
      ? auth.startAutoRefresh() : auth.stopAutoRefresh()).catch(() => {});
  };
  const listener = visibility?.addEventListener('change', refresh);
  if (visibility) refresh(visibility.currentState);
  return () => {
    active = false;
    subscription.unsubscribe();
    listener?.remove();
    if (visibility) refresh(null);
  };
}
