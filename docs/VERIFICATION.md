# Verification record

## Language update — 8 October 2026

- `npm test`: 6 tests passed, 0 failed (40.4 seconds). Includes real PHP/MySQL account language persistence through logout/login, invalid-language rejection, guest denial, owner/non-owner private/draft translation rejection, existing community/moderation flows, and the real API React integration suite.
- Added a React/jsdom test with a simulated translation response: English/Myanmar switch, unchanged originals, explicit consent before requesting translation, target-only request payload, See original/See translation without repeat requests, stale-response rejection after a language change, readable provider-setup errors, and absence of private-journal translation controls.
- Production build and PHP syntax checks passed. The additive language migration ran successfully on the isolated local database and preserves existing data. Startup readiness check passed with existing services reused.
- No Google API key has been supplied. Live Google translation was not tested. Actual browser layout/visual QA remains unverified; tests cover DOM interactions rather than rendered geometry.

Executed on 6 October 2026 in the supplied Windows workspace, with Node.js 24.14.1, PHP 8.4.12, and an isolated MySQL 8.4.2 instance bound to 127.0.0.1:33317. PHP ran on 127.0.0.1:8000; the application connected using a limited database account, not root.

## Automated checks actually run

- `npm test`: **2 integration suites passed, 0 failed**. Total reported runtime: approximately 30.5 seconds.
- API suite: real HTTP sessions and MySQL writes. Verified registration validation; authentication; login session rotation; required CSRF; owner-only editing/deletion; private-entry and public-draft isolation; anonymous public JSON; comment settings and owner-only deletion; independent reaction toggling; bookmarks; saved category preferences; post/reply reporting; blocking and anonymous unblock tokens; pagination and sorting; normal-user/guest admin denial; admin hide/restore; private content excluded from reports after visibility changes; and denial of an administrator attempting to read/delete another user's journal.
- React DOM suite: built actual React source, rendered it in jsdom, dispatched interface events, and used the real PHP API and MySQL. Verified category filtering, registration, mandatory preview, publishing, reaction state, replying, saving and reading Saved, private journal creation, drafts, private-entry editing, settings toggles, and removal of private content after sign-out.
- `npm run build`: production bundle generated successfully. Latest output is in `public/index.html` and `public/assets/`; API files are retained.
- HTTP smoke checks returned 200 for the PHP-served production homepage and its compiled JavaScript, the Vite homepage and transformed entry module, and public posts through Vite's API proxy.
- PHP syntax validation for API and development router passed. Operational scripts were also executed for sample seeding, local DB bootstrap, first-admin promotion, and fixture cleanup.
- Local Vite development server started at `http://127.0.0.1:5173/` with the same-origin API proxy. The environment's restricted filesystem prevented esbuild dependency discovery under default sandbox access; starting Vite with normal local filesystem access resolved that environment issue. Production compilation succeeded under restricted access with the config runner.

These are integration suites containing many assertions, not a claim of a separate named test for every possible security scenario. The automated tests do not establish that the application is free of security defects.

## Remaining manual checks

### One-command startup update (8 October 2026)

Added `npm start` to start/reuse the configured local MySQL, PHP, and Vite services from one terminal. The port detection test passed, `scripts/dev-info.php` passed PHP syntax checking, and `npm run start:check` verified real database connectivity and both existing Unsaid servers. Running `npm start` reported all three existing services ready; after terminating that launcher, a second readiness check confirmed the pre-existing services remained available. The branch that creates a new MySQL process and gracefully shuts it down was not exercised in that check because the database was already running.

No browser surfaces were available through the supplied browser tool (`apps: []`, `browsers: []`; in-app browser unavailable). Therefore **visual browser QA was not performed**. Responsive CSS is implemented, but desktop screenshot fidelity, tablet layout, mobile horizontal overflow, actual rendered contrast, font loading, browser-specific behavior, and full keyboard navigation should still be reviewed in a real browser. jsdom tests verify DOM interactions, not pixel rendering or browser geometry.

Apache/XAMPP virtual-host setup and HTTPS Secure-cookie behavior are documented but were not exercised here; verification used PHP's local development server. Public deployment was not performed. Replace the operator contact text with a real support address before launching.

## Manual browser checklist

1. Open Explore at 1536×1024: review ivory background, sage buttons, botanical illustration, two-column feed, sidebar, and footer against the screenshot.
2. Check 1024, 768, 390, and 320 pixel widths: cards and filters should wrap without horizontal overflow; sidebar should move below the feed; navigation and dialogs should remain usable.
3. Tab through navigation, filters, card actions, menus, switches, and dialogs. Check visible focus, Escape to dismiss a dialog, and focus returning to its trigger.
4. Use two separate browser sessions to manually confirm private journals/drafts are inaccessible across accounts, including guessed post URLs.
5. Review report/block flows with a normal account and moderation hide/restore with an administrator. Confirm no private entries appear in moderation.
6. Stop MySQL temporarily in a disposable environment and check that a service error appears instead of fake connected content. Restore MySQL and retry.


## Account controls and notifications (29 October 2026)

The additive community migration was applied to the isolated local MySQL
instance and rerun successfully. The full npm test command passed all 17 tests
with zero failures, including the new real-API and React DOM community suites.
Coverage includes draft-to-public story notifications, follow/unfollow,
notification preferences, reply and message read cursors, message requests,
blocked-account exclusion, private content isolation, export ownership,
single-use recovery codes, password changes, session revocation and confirmed
account deletion. React interaction checks exercise story following,
notifications, notification settings, recovery-code generation, password change,
writing download, sign-out, password recovery, sign-in and account deletion.

The production build passed. PHP syntax checks passed for the API, community
routes, migration and local reset helper. npm run start:check confirmed MySQL,
PHP and Vite were ready at http://127.0.0.1:5173/.

Fixed npm test failing when the machine's default PHP configuration omits
pdo_mysql/mbstring: the runner temporarily enables missing modules for child
processes without changing the machine configuration. Notification read state
uses separate reply/message ID cursors to avoid losing new notifications that
arrive in the same second as marking earlier notifications read.

The browser access host was unavailable, so screenshot inspection and mobile
pixel/overflow verification remain unperformed. DOM tests do not verify rendered
layout. Recovery is code-based; email recovery and email verification remain
unimplemented. See COMMUNITY.md for setup and behavior.


## Email-confirmed signup (29 October 2026)

The full npm test suite passed all 19 tests with zero failures after updating
existing API clients and the React signup test to complete real OTP verification.
The new signup tests cover no account/access before verification, private code
capture, hashed code storage, CSRF, browser-session binding, five-attempt lockout,
60-second resend cooldown, invalidation of old codes, expiry, single use,
verified timestamps, preference creation, and session/CSRF rotation. The SMTP
library loads successfully and insecure/unguarded test transports are rejected.

Tests run on an independently owned PHP server on port 8001, with private capture
restricted to generated fixture recipients and the isolated local database.
The full suite exited successfully and stopped its test API server. Normal app
services remained ready on ports 8000/5173. Production build and PHP syntax
checks passed. The additive email-verification migration was applied and rerun
successfully without replacing accounts or content.

An earlier community UI run exposed a timing issue in its sign-out assertion;
the test now waits for the completed sign-out notification before opening the
account menu. Focused community/signup tests and the subsequent full suite pass.

Gmail sender credentials have intentionally not been entered yet, at the user's
request. The prepared config/mail.local.php still requires the sender address
and Google App Password; real Gmail inbox delivery has not been tested. No
verification bypass was added. Browser screenshot/mobile layout QA was not
performed. Setup and limits are documented in EMAIL.md.
