# Phase 4.3 — database setup and account isolation checks

Status: migration and client implementation prepared locally. **No remote SQL, hosted RLS test or physical-device test was executed.** This phase authorizes only `public.favourites`; earlier local-only/no-database plans are superseded.

## 1. Apply the migration manually in Supabase

1. Open the intended Supabase project. Confirm its project reference matches the project URL in your ignored `.env.local` (do not share credentials or screenshots of keys).
2. Open **SQL Editor → New query**. Paste this read-only preflight and run it:

   ```sql
   select to_regclass('public.favourites') as existing_table;
   ```

   The expected result for a first install is `null`. If the table exists, inspect its schema/policies first; do not drop it or paste a duplicate migration over it. This migration intentionally fails instead of silently accepting an unknown existing table or permissive policy.
3. Open **`supabase/migrations/20261125162038_create_user_favourites.sql`** in the repository and copy the **entire file**, including `begin;` and `commit;`, into a fresh SQL Editor query. Review it, then click **Run** once as the project database owner. This is the only schema change required. If the transaction fails, run `rollback;` in that editor session before investigating; do not disable RLS to work around an error.
4. In project **Data API settings**, ensure the Data API is enabled and `public` is an exposed schema. The migration explicitly grants only SELECT, INSERT and DELETE to `authenticated`, so it works whether the project grants new-table access automatically or not. Do not grant `anon`, UPDATE or TRUNCATE access, and do not add a policy allowing all users.
5. Run the verification queries below. Confirm RLS is enabled/forced, the composite primary key exists, and there are exactly three policies, all addressed to `authenticated` with ownership checks. Test with actual user JWTs in section 2; SQL Editor's privileged role normally bypasses RLS and is **not** evidence of user isolation.
6. Restart/reload RIDE, sign in and use **Retry saved stations** or open Saved. No new app key or environment variable is required. A missing migration shows a setup message while Explore and CityBikes remain usable.

```sql
select relrowsecurity, relforcerowsecurity
from pg_class where oid = 'public.favourites'::regclass;

select conname, contype, pg_get_constraintdef(oid)
from pg_constraint where conrelid = 'public.favourites'::regclass;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'favourites'
order by policyname;

select
  has_table_privilege('anon', 'public.favourites', 'SELECT') as anon_select,
  has_table_privilege('anon', 'public.favourites', 'INSERT') as anon_insert,
  has_table_privilege('anon', 'public.favourites', 'DELETE') as anon_delete,
  has_table_privilege('authenticated', 'public.favourites', 'SELECT') as user_select,
  has_table_privilege('authenticated', 'public.favourites', 'INSERT') as user_insert,
  has_table_privilege('authenticated', 'public.favourites', 'DELETE') as user_delete,
  has_table_privilege('authenticated', 'public.favourites', 'UPDATE') as user_update,
  has_table_privilege('authenticated', 'public.favourites', 'TRUNCATE') as user_truncate;
```

Expected privileges: `false, false, false, true, true, true, false, false`. The primary key `(user_id, station_id)` enforces uniqueness and non-null ownership; its leading `user_id` also indexes the RLS/list predicates. No redundant UUID row ID or duplicate index is needed. `user_id` references `auth.users(id)` with cascading deletion. Station IDs are nonblank, trimmed text up to 256 characters; no station counts or reservation data are stored. The database cannot validate membership in the external CityBikes feed, so the Saved UI handles missing IDs safely.

SELECT and DELETE use `using ((select auth.uid()) = user_id)`. INSERT uses `with check ((select auth.uid()) = user_id)`. There is no UPDATE policy or grant. Duplicate saves use INSERT followed by an ownership-checked SELECT on conflict, not an UPDATE upsert. Existing Supabase administrative/service roles may bypass RLS by design; they must never be used by the mobile app or the tests below. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API grants](https://supabase.com/docs/guides/api/securing-your-api).

**Migration tracking:** applying SQL manually does not automatically populate Supabase CLI migration history. Record this file/version as manually applied. Before adopting CLI pushes later, reconcile hosted history with the actual deployed schema; do not blindly reapply this migration. No remote project was linked and no CLI push was run here.

## 2. Prove hosted isolation with two separate accounts

Create/confirm two dedicated **email/password test accounts A and B** through the existing app flow. They must have different Supabase user UUIDs; two login methods attached to one account do not qualify. Use accounts you control, not production users' credentials. Keep both accounts for the device tests in section 3.

The supplied **`scripts/verify-favourites-rls.cjs`** uses three isolated, memory-only Supabase clients: A, B and an anonymous client. It uses only the existing publishable key and each account's JWT. It does **not** run SQL, use an admin/service key, or store passwords/tokens on disk. Password prompts are hidden. Do not pass credentials on the command line or paste tokens into SQL Editor, logs or chat.

After reviewing the script and applying the migration, run this yourself from the project root in an interactive PowerShell terminal (Node supporting `--env-file`, e.g. current Node LTS):

```powershell
node --env-file=.env.local scripts/verify-favourites-rls.cjs
```

This is deliberately **not** part of `npm test` and was **not executed** by the agent. It prints the configured-task purpose and asks you to type `RUN`, then prompts for the two account credentials. It creates only random `ride-rls-check-…` station IDs. These temporary IDs are intentionally absent from CityBikes, so no real user's favourite needs changing.

Expected results in both directions:

| Attempt | Expected result |
| --- | --- |
| A saves a row owned by A; B saves the same station ID owned by B | Both succeed; uniqueness is per account. |
| A/B SELECT without an owner filter | Only the acting user's rows. |
| B explicitly SELECTs A's rows; A explicitly SELECTs B's rows | Empty arrays. |
| B INSERTs a new row with `user_id = A`; A does the reverse | SQLSTATE `42501` / RLS denial. |
| B DELETEs A's test row; A does the reverse | Zero returned/deleted rows; the owner verifies its row still exists. A successful HTTP response alone does not mean deletion occurred. |
| Repeat an own INSERT | SQLSTATE `23505` (duplicate). |
| UPDATE own row | SQLSTATE `42501` (no privilege). |
| Anonymous SELECT, INSERT or DELETE | SQLSTATE `42501` (no privilege). |
| Each owner DELETEs its own test row | Exactly one deleted row each. |

The script prints only curated PASS/FAILED labels, not account rows, tokens or provider errors. It attempts cleanup with each owner's session and signs out those test sessions. If interrupted or offline, cleanup may not finish: reconnect as each account and remove the temporary `ride-rls-check-…` entries from Saved, or inspect only those test accounts' temporary rows in the dashboard. A failed check means isolation is **not verified**: stop using the new feature for private data and inspect table grants and policies. Do not add permissive policies to make a test pass.

## 3. Physical-device checks

No new native dependency was added. Saved works with the existing SDK 58-compatible Expo Go **email login** flow after the database setup. Phase 4.2 Google OAuth still requires a development build and its own provider configuration; see `AUTH_SETUP.md`.

```powershell
npx expo start --clear
# If LAN discovery fails:
npx expo start --tunnel --clear
```

1. Sign in as A. Open a station preview, tap **Save station**, wait for acknowledgement, open details and check **Unsave station**. Open **Saved** from Explore and verify the same station and its current `free_bikes` / `empty_slots`, including zero counts. Save several stations; confirm scroll and refresh work above safe areas.
2. Unsave from details or preview and confirm Saved updates. Unsave directly from Saved as well. Rapid taps must not create duplicates or invert an in-flight action. Check long names, larger text, VoiceOver and 44 pt controls; selected previews must remain bounded/scrollable and the map must stay usable.
3. Force-close/reopen while online: the authenticated session restores and favourites reload from Supabase. Counts still come from the existing CityBikes cache/API, never from a second station endpoint or a favourites count snapshot.
4. Sign out of A and sign into B on the **same device**. A's Saved rows, loading placeholders containing station names, and pending errors must never appear under B. Save different stations as B, then switch back to A. Repeat while a load/save is slow or pending. Repeat on a second device if available.
5. Load Saved, disconnect internet, pull to refresh. Keep only this account's last loaded IDs and cached station counts, visibly labelled stale/error. A failed Save/Unsave retains the last confirmed selection and displays retry guidance; no success is implied and nothing is queued. Reconnect and refresh before retrying. If the server committed a write but its response was lost, retry is safe (duplicate save or already-removed row).
6. Cold-launch offline: favourites are not persisted to phone storage, so show loading/error/retry rather than another account's list or a false empty state. Authentication restoration itself may require connectivity. Sign-out discards private cached IDs; public CityBikes cache may remain shared.
7. A missing/removed CityBikes station remains visible as **Saved station unavailable**, with no invented counts and a working Unsave after favourites sync. The hosted RLS test's temporary IDs can exercise this case if deliberately retained, then removed.
8. Regression-test map pan/zoom/clusters, Bike/Dock mode, search/filter, preview/details/back navigation, directions, cached station refresh, email/password login/logout, protected Saved deep links and Phase 4.2 callbacks. Repeat on Android; bundle exports are not device verification.

## 4. Automated validation and practical limits

`npm test` includes actual execution of the committed migration in **PGlite**, an isolated local Postgres engine. Fixtures supply only `auth.users`, `auth.uid()` and the authenticated/anon roles; tests switch roles and claim UUIDs, then exercise policy enforcement, grants, duplicates and cascades. These tests validate SQL behaviour; they do not verify your hosted project configuration, JWT issuance, SMTP/Google, native SecureStore or device UI. The manual two-account Data API procedure covers the hosted boundary. [PGlite Node/Postgres documentation](https://pglite.dev/docs/).

`@electric-sql/pglite` **0.6.0** is pinned as a development-only test dependency. Nothing in `src/` imports it; no database engine or native module is added to the app. Runtime dependencies are unchanged.

The app keeps a separate in-memory store per authenticated UUID, remounts that boundary during account changes, aborts outstanding work and ignores late responses. Read responses are also validated against the expected owner. Queries include an owner filter in addition to RLS; the client filter alone is not the security boundary. Failed responses are sanitized. Requests time out after 12 seconds, including time spent waiting for session restoration.

Refresh occurs on login, Saved entry, app foreground and manual refresh; there is no polling, Realtime subscription or offline mutation queue. Different-device edits appear on the next refresh. CityBikes continues to use its existing freshness window and cooldown. The favourites migration must be deployed before Saved requests can succeed; a setup error does not block the map/list.
