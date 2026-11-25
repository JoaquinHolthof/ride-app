# RIDE Phase 4.2 setup and phone verification

No website has been deployed, provider changed, account created, email sent or native build executed by this phase. The user confirmed Phase 4.1 email signup/login, confirmation, persistence, protected routes and map/details on a physical iPhone. Phase 4.2 callbacks and Google still need device verification.

## Redirect destinations (do not interchange them)

| Where | Exact value to configure |
| --- | --- |
| Google Cloud → Web OAuth client → Authorized redirect URIs | Copy the **HTTPS callback URL displayed in Supabase's Google provider panel**; for a standard hosted project it is `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`. Replace the placeholder with the real project reference. |
| Supabase → Authentication → URL Configuration → Redirect URLs | `rideapp://auth/callback` for both native development and production builds. Add the exact owned HTTPS landing URL separately for Expo Go. No wildcard is required. |
| Supabase → Site URL | The real reachable HTTPS confirmation landing URL described below; replace the inaccessible localhost value. |
| App email signup in development/production builds | Automatically supplies `emailRedirectTo: 'rideapp://auth/callback'`. |
| App email signup in Expo Go/web preview | Uses Supabase Site URL by default. Optional `EXPO_PUBLIC_AUTH_EMAIL_REDIRECT_URL` overrides it with an actual hosted HTTPS landing URL matching the Supabase allowlist. |
| App Google OAuth | Automatically supplies `redirectTo: 'rideapp://auth/callback'`; Google itself returns to Supabase first. |

The stable `rideapp` scheme already exists in `app.json` and was preserved. Registering it requires compiling/installing a native RIDE binary. Expo Go cannot register this scheme. Keep it stable across releases. Only install one RIDE build owning this scheme during testing. Custom schemes are not domain-verified; PKCE reduces intercepted-code risk, but universal/app links would require an owned domain and separate native configuration in a later phase. [Supabase mobile links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## Supabase email and HTTPS landing page

1. Keep Email/Password and **Confirm email** enabled. Keep the confirmation email template's `{{ .ConfirmationURL }}` anchor: Supabase must verify the email **before** redirecting. Do not replace it with a direct app URL or `{{ .SiteURL }}`. Inspect any customized template for a hardcoded localhost link. Do not disable confirmation.
2. Publish the provided **`docs/auth-confirmation/index.html`** as one static HTML page on a HTTPS host/domain you control. Choose the final path yourself and use that exact URL in every setting above. This is a deployment artifact, **not an existing website**. Do not deploy the Expo web server just to serve this file.
3. Serve it as `text/html; charset=utf-8`, with `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`. Configure the host/CDN to omit or redact query strings from access logs; disable analytics, request capture, third-party scripts, session replay and automatic URL forwarding. The initial PKCE code reaches the web server before browser history can be cleaned.
4. The page removes query/fragment data immediately, shows generic guidance or a curated failure message, makes no auth/API requests, contains no credentials and never forwards codes to Expo Go. It discards old implicit-flow fragments as well. It deliberately does not claim the account is verified based merely on visiting the page. An expired/used link should offer login for already-confirmed users and a fresh signup/link for others.
5. Set the real HTTPS URL as Supabase Site URL and add it to Redirect URLs. Optionally put the same URL in ignored `.env.local` as `EXPO_PUBLIC_AUTH_EMAIL_REDIRECT_URL` and restart Metro with `npx expo start --clear`. With no override, Expo Go/web signup retains the existing Supabase Site URL behaviour; this preserves working signup but **localhost redirects will persist until the dashboard Site URL is corrected**. An invalid explicit override shows a configuration error. Existing email/password login is independent of redirect configuration. Mobile builds use the scheme regardless of this variable.
6. Verify the hosted page directly and from a **newly sent** confirmation email. Previously issued emails may retain the old destination. Opening email on another device can confirm the account but cannot use the original app's PKCE verifier; manually log in afterward. Starting another signup or Google flow replaces the current fixed verifier, so use the latest email. Existing pre-Phase-4.2 token-fragment links are not imported into the app; confirm and use password login.
7. Verify SMTP sender/delivery settings and project email rate limits in the dashboard. If delivery fails, check Supabase Auth logs without copying confirmation links or credentials into issues. Keep SMTP credentials in the dashboard. Resend/password-reset UI is outside this slice.

## Google Cloud and Supabase provider

1. Open your intended Google Cloud project → **Google Auth Platform**. Complete **Branding** (RIDE app name, support/developer contact and any required owned-domain information), **Audience** and **Data Access**. For an external app still in Testing, add the Google accounts that will test it as test users. Request only `openid`, `https://www.googleapis.com/auth/userinfo.email` and `https://www.googleapis.com/auth/userinfo.profile` for sign-in.
2. In **Clients**, create an OAuth client with application type **Web application**. This implementation uses the system browser and Supabase's server-side Google exchange, so it does not need an iOS native Google client or the native Google Sign-In package.
3. Add the exact Supabase HTTPS callback from the table to **Authorized redirect URIs**. Do **not** put `rideapp://auth/callback`, an Expo `exp://` URL, a LAN IP, the landing page, or your Metro address in Google's redirect URI field. Use the dashboard-provided callback if the project uses a custom auth domain.
4. This mobile browser flow does not execute Google's JavaScript SDK on a website, so no Authorized JavaScript origin is needed for it. If adding a separate web Google integration later, configure only its real owned origin then; this phase does not support web OAuth.
5. Supabase Dashboard → **Authentication → Sign In / Providers → Google** (the panel may be labelled Providers): enable Google, paste this Web client's **Client ID** and **Client Secret**, and save. Leave nonce/email validation defaults enabled. The secret belongs **only in Google/Supabase dashboards**, never `.env.local`, `EXPO_PUBLIC_*`, source, EAS public variables, screenshots or Git. No Google ID or secret is needed in RIDE's bundle.
6. Add `rideapp://auth/callback` to Supabase Redirect URLs and retain the owned HTTPS Site URL/landing allowlist entry. Keep email/password enabled. Google routes through `signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true, redirectTo } })` → system auth browser → Supabase → PKCE `exchangeCodeForSession` → the existing session listener/storage.
7. Test consent with a permitted test account. If blocked, review Google's audience/test-user settings, callback spelling, Supabase provider settings and Auth logs. Never paste a live callback URL or auth code into a bug report.

Official references: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [PKCE code exchange and same-installation requirement](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## iOS development build: prerequisites and commands (not executed)

For an iPhone build from this Windows machine, use EAS cloud builds: Expo account, Apple Developer Program membership/team signing access, your iPhone registered for development distribution, Developer Mode enabled, and an owner-chosen unique `expo.ios.bundleIdentifier`. No identifier, EAS project or distribution profile was invented or modified here. Local iOS compilation requires macOS + Xcode; it cannot run on this Windows host.

When ready to set up a development build, run these commands yourself in this project:

```powershell
npx expo install expo-dev-client
npx expo install --check
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest device:create
```

Review the generated app/EAS configuration and choose your real bundle identifier. Ensure `eas.json` has a physical-device development profile (no `ios.simulator: true`):

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development"
    }
  }
}
```

In the Expo project's **development environment**, set the real public `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` values for bundling. Ignored `.env.local` is not a reliable source for cloud builds. Only use the publishable Supabase key; never add the Google secret. The optional HTTPS email redirect variable affects only Expo Go/web, not native scheme callbacks.

Then explicitly start your build and install it from the resulting EAS device link:

```powershell
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client --clear
```

Open the installed **RIDE development app**, not Expo Go, and connect it to Metro. Rebuild if native libraries/scheme/configuration change. On macOS, the alternative after installing `expo-dev-client` and configuring signing/bundle ID is `npx expo run:ios --device`, followed by `npx expo start --dev-client`. No production/store build is necessary for this test. [Expo development build instructions](https://docs.expo.dev/develop/development-builds/introduction/).

## Phone acceptance checks

| Runtime | What to test |
| --- | --- |
| SDK 58-compatible Expo Go | Existing email login/logout, persistence, guards and all map/list flows; email signup/confirmation after hosting/configuring the landing page; readable disabled Google explanation. |
| iOS development build | `rideapp` routing, cold/warm email callback, secure PKCE storage/exchange, Google success/cancel/failure, and native regressions. |
| Production native app | Same callback implementation; must have the scheme compiled into its binary and real provider configuration. Production signing/distribution was not configured or validated. |
| Web preview | Email/password with memory-only session; hosted confirmation followed by manual login. Google OAuth intentionally unavailable. |

1. Confirm the clean scheme route opens RIDE (a credential-free `rideapp://auth/callback` test should show recovery, not a crash). Never use a real confirmation code in a shell command. Sign out before each sign-in test.
2. Native signup: use your own new test email, open its newest link on the same iPhone/installation. Test with RIDE foregrounded, backgrounded, and force-closed after signup. Expect a finishing/complete screen and **Continue to RIDE**, or Explore directly when the browser result alone receives the redirect. Verify Account and persisted login after restart.
3. Tap the same email link again; Supabase may reject a consumed link, while duplicate delivery of one callback during the app run must not exchange twice. Try an expired link and a confirmation opened on another device. Errors must give password-login/fresh-link recovery, never display code/token/raw provider text. An existing signed-in account must not be replaced by a stray link.
4. From Log In and Sign Up, tap **Continue with Google**. Finish with an allowed Google test account, check Account and restart persistence. Sign out and test browser Cancel, denied consent, offline/provider failure, then retry or use password login. Double-tapping must not open two auth browsers.
5. Repeat email/password login, wrong-password/unconfirmed errors, sign-out and protected back/deep-link tests. Validate map clusters, Bike/Dock modes, search/filter, station details, directions and offline cached/error states. Check keyboard, large text, VoiceOver and safe areas. Repeat on Android when available.

Expo explicitly excludes Expo Go from OAuth testing because it cannot register the application's scheme. The installed SDK 58 WebBrowser and Crypto modules are Expo Go-compatible, but that does not make this OAuth redirect flow supported in Expo Go. [Expo authentication guidance](https://docs.expo.dev/guides/authentication/), [SDK 58 WebBrowser](https://docs.expo.dev/versions/v58.0.0/sdk/webbrowser/), [SDK 58 Crypto](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/).

## Implementation and security limits

- `detectSessionInUrl` remains disabled. Only the canonical callback's PKCE query code is exchanged. No implicit access/refresh tokens or recovery/token-hash links are accepted. The SDK validates the locally held verifier with Supabase; route parsing alone never grants access.
- Native intent processing strips callback credentials before Router navigation state. Raw URLs/codes/provider messages are not logged, put into app state persistence or reflected in UI. A bounded in-memory map deduplicates up to 16 recent exchanges across browser/Router/remount delivery; after restart Supabase enforces single-use codes. Codes can still be visible to OS/browser development diagnostics; do not capture/share auth traffic.
- The existing encrypted, chunked SecureStore adapter stores both the session and SDK PKCE verifiers; no plaintext storage was added. SDK 2.119.2 also keeps bounded indexed verifier slots; the normal fixed-verifier exchange removes the fixed entry and sign-out clears the indexed slots. Experimental overlapping-flow redirects are not enabled.
- Expo Crypto supplies native secure randomness and SHA-256 for the Web Crypto primitives used by this SDK's PKCE flow. Its adapter preserves available runtime implementations and rejects unsupported digest algorithms; it is not a complete Web Crypto polyfill. Password login and session refresh retain their existing paths.
- The callback never replaces an already active session. Protected screens continue to require session restoration. There are no application tables, private-data authorization policies, favourite storage changes or custom backend in this phase.
- Client navigation protection is not backend authorization. Google/SMTP delivery, actual OS redirect behaviour, Keychain interaction and physical-device success remain manual verification items. Google OAuth is implemented but not yet verified end to end.
