# Original workspace setup reference

This preserves the original development notes supplied with the project. References to an existing isolated MySQL instance, private configuration, completed checks, and workspace services describe the original machine, not a fresh clone. This repository does not include that database or private configuration. Follow the repository README for a fresh installation; the verification record is historical.

---
# Unsaid

A working anonymous reflection community and private journal. The React/Vite interface follows the supplied ivory, sage, pastel, and botanical homepage reference. All content, accounts, reading preferences, reactions, replies, bookmarks, blocks, and moderation records are stored in **MySQL** through a **plain PHP JSON API**. There is no browser-storage database or mock-data fallback.

## Requirements

- Node.js 22.12+ or 24, npm
- PHP 8.2+ with `pdo_mysql`, `mbstring`, and sessions
- MySQL 8.0.16+ (schema uses enforced CHECK constraints)
- Apache with `mod_rewrite` for an XAMPP deployment, or PHP's built-in development server

## 1. Database and configuration

Import `database/schema.sql` into MySQL with phpMyAdmin's Import tab, MySQL Workbench, or the MySQL CLI. It creates the `unsaid` database and tables. Use a new database; this is an initial schema, not a migration to run repeatedly.

Create a dedicated application database user through your database administrator, then grant only `SELECT, INSERT, UPDATE, DELETE` on `unsaid.*`. Example SQL (replace the password yourself):

```sql
CREATE USER 'unsaid'@'127.0.0.1' IDENTIFIED BY 'YOUR_STRONG_LOCAL_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON unsaid.* TO 'unsaid'@'127.0.0.1';
```

Copy `config/example.php` to `config/local.php` and enter the MySQL host, port, database, username, and password. Never commit `local.php`. The configuration directory must stay **outside the web document root**. The application reports a configuration error if the file is absent and a safe service error if MySQL is unavailable.

The local development environment prepared in this workspace uses an isolated MySQL instance on `127.0.0.1:33317`, a randomly generated limited application user, and data under `.runtime/mysql-data`. This is separate from the installed MySQL service. `config/local.php` points to that development instance; replace it with your XAMPP configuration when moving the project. Do not deploy `.runtime`.

## 2. Optional sample posts

```powershell
php scripts/seed.php --confirm
```

This inserts the four example public thoughts from the screenshot into **the actual MySQL database**. They are sample editorial content, not claims about real people. It creates a non-admin sample account with a random, unknown password and does not create private journal entries. The script is idempotent. Remove the sample account's posts before launching a real community if desired.

## 3. Vite development

### One command for this workspace

```powershell
npm start
```

This starts the existing project-local MySQL database on port 33317, the PHP API on port 8000, and Vite on port 5173. Open the printed `http://127.0.0.1:5173/` link and keep that one terminal open. Press Ctrl+C to stop only services started by the launcher. Existing services are reused and left running; occupied PHP/frontend ports belonging to another app are rejected. MySQL started by the launcher is stopped gracefully using the local development instance's bootstrap account; if graceful shutdown fails it is left running rather than forcefully terminated.

`npm run start:check` checks database connectivity and whether the existing servers belong to Unsaid without starting or stopping anything. The launcher does not initialize, reset, or seed a database and does not change credentials. It requires the existing private configuration and initialized local database. For an external/XAMPP MySQL configuration, start that database service yourself; the launcher will then start/reuse PHP and Vite. `UNSAID_PHP` and `UNSAID_MYSQLD` can specify executable paths when they differ from the installed defaults.

### Manual startup

From the project directory:

```powershell
npm install
php -S 127.0.0.1:8000 -t public server/router.php
```

Keep PHP running. In a second terminal:

```powershell
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` to PHP on port 8000, so cookies and CSRF work on one browser origin. Do not open `index.html` as a local file and do not point the browser directly at an API on another origin. The Vite config loader uses `runner` to avoid parent-directory access issues in restricted Windows workspaces.

To restart the workspace's isolated development MySQL instance (if it is stopped):

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe' --no-defaults --datadir="$PWD/.runtime/mysql-data" --port=33317 --bind-address=127.0.0.1 --mysqlx=0 --console
```

This process should remain local only. The disposable instance's bootstrap root account has no password and must never be used as a deployment database. The web application uses the limited, password-protected account instead.

## 4. Production build served by PHP

```powershell
npm run build
php -S 127.0.0.1:8000 -t public server/router.php
```

Open `http://127.0.0.1:8000`. Vite generates `public/index.html` and `public/assets/` while preserving `public/api/` and `.htaccess`. PHP's development server is for local testing, not production.

For Apache/XAMPP, set a virtual host whose document root is **only** the project's `public` directory:

```apache
<VirtualHost *:80>
    ServerName unsaid.local
    DocumentRoot "C:/path/to/unsaid/public"
    <Directory "C:/path/to/unsaid/public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Add `127.0.0.1 unsaid.local` to your hosts file yourself if you want that hostname, enable `mod_rewrite`, restart Apache, and visit `http://unsaid.local`. You can instead configure Apache to serve `public` at an existing local hostname. The frontend uses root-relative API and asset URLs; serve it at the origin root. XAMPP installations may ship MariaDB instead of MySQL: use a MySQL 8 instance for the specified stack and CHECK behavior. Set PHP `display_errors=Off`, `log_errors=On`, and use HTTPS for an internet deployment. HTTPS enables Secure session cookies automatically; terminate TLS at PHP/Apache or configure the upstream HTTPS indicator correctly when using a trusted reverse proxy.

Only deploy `public/`, `config/local.php` outside the document root, and any private operational scripts you need. Never expose the project root, tests, `.runtime`, schema, or configuration as public files. Host Google Fonts yourself if external font requests are undesirable; the current design loads DM Sans and Libre Caslon Display from Google Fonts and falls back to system fonts when offline.

## 5. First administrator

1. Register a normal account through the website.
2. From a trusted local terminal in this project, run:

```powershell
php scripts/admin.php --email=you@example.com --confirm
```

3. Sign out and back in (or refresh), then open **Account menu → Moderation**.

The CLI command requires access to the private DB configuration and an existing account; there is no HTTP admin bootstrap, default admin password, or public privilege-granting endpoint. All admin API requests recheck `users.is_admin` in MySQL. Administrators can hide, restore, or dismiss reports on public, published posts/replies. Private journals and drafts are excluded even if a previously reported thought later becomes private.

## Features and behavior

- Register, log in, log out, and anonymous public reading.
- Write, preview, publish, save drafts, edit, and permanently delete your own thoughts.
- Separate `visibility` and publication `status`: a public draft is still private to its author.
- Journal shows private entries and all drafts; My Posts shows your published public thoughts.
- Two independent toggle reactions per account, saved thoughts, newest/oldest sort, category filters, and 12-item pagination.
- Reading preferences are persisted for signed-in accounts and applied by the API. Selecting no categories produces an empty Explore feed; Journal, My Posts, and Saved remain available.
- Anonymous replies and author-only reply deletion. Only Advice welcome permits new replies; Just listening and Comments off close replies on both the interface and server. Existing replies remain readable and can still be deleted by their author.
- Reporting posts/replies with a reason, anonymous author blocking, anonymous blocked-account tokens, and unblocking in Settings. Blocking hides that author's public posts and replies for the blocker; it does not revoke the blocked person's access to everyone else's public content.
- Public post/reply JSON contains no account email, name, or internal author ID. It includes only `is_owner` to enable your own management controls.
- Hash routes support Explore, Journal, My Posts, Saved, Settings, post details, moderation, and informational footer pages.
- Loading, empty, validation, API failure, confirmation, and notification states; responsive grids; visible focus; keyboard-trapped modal dialogs; reduced-motion support; plain-text user content.

The Contact page identifies the installation operator as the contact. Replace it with your real support address before a public launch. Settings includes password changes, single-use recovery codes, writing export and account deletion. Recovery requires a code saved beforehand. New accounts require an emailed confirmation code; email-based password reset is not implemented. Private journals have application-level access controls, not end-to-end encryption; database administrators can access stored text.

## Verification

Account-to-account direct messaging is available from **Messages** and public
post options. It includes recipient-approved requests, persistent chat history,
unread counts, account-wide blocks and explicit message reporting. Existing
installations must run `php scripts/migrate-dm.php` using a database account with
CREATE permission. See [docs/DM.md](DM.md) for setup and privacy details.

Public posts and replies now include local safety reminders for financial
solicitation and off-platform contact invitations, an administrator review queue,
duplicate/burst reply limits, and author review requests for hidden content.
See [docs/SAFETY.md](SAFETY.md) for the rules, privacy boundaries, and limitations.

Tests send real HTTP requests to PHP and persist fixtures in MySQL. **Run only on an isolated development database**, never with real user data. Start the isolated MySQL instance, seed the four sample posts, then run the commands below. The test runner starts its own PHP API on port 8001 and captures fixture emails privately without sending real mail:

```powershell
npm test
npm run build
php -l public/api/index.php
php -l server/router.php
```

The API suite exercises email/password validation, login/session rotation, CSRF, public anonymity, cross-account edits/deletes, private/draft isolation, comment permissions and deletion, reaction toggles, bookmarks, preferences, blocking/unblocking, post/comment reporting, admin permission checks and hide/restore operations, conversion of reported content to private, and pagination. It also invokes the trusted admin CLI for its test account. The React DOM suite clicks the actual interface while using the real API for registration, filtering, preview/publishing, reactions, replies, bookmarks, journal writing/editing, drafts, preferences, and sign-out isolation. It does **not** prove rendered pixel layout, mobile overflow, or browser-specific behavior.

Tests remove their generated fixture accounts and dependent content through registered cleanup hooks, including on assertion failure. Forcefully terminating a test process can leave fixtures behind. Registration allows 5 attempts per IP per 15 minutes, so repeated runs may need a pause. For the isolated local instance on port 33317 only, `php tests/reset-local.php --confirm` removes generated test fixtures and resets loopback login/registration rate buckets; it refuses other database configurations. The UI suite expects exactly the four seed posts before running. Do not use test account credentials or privileges on a live installation.

See `docs/API.md` for endpoint contracts and `docs/VERIFICATION.md` for the checks actually run in this workspace and remaining manual visual checks.

## Source map

```text
src/                 React components, API client, and responsive styles
public/api/index.php Plain PHP API and authorization checks
public/.htaccess     Apache API routing and headers
server/router.php    PHP development-server routing
database/schema.sql MySQL tables, foreign keys, indexes, constraints
config/example.php  Configuration example with no secrets
scripts/admin.php   Trusted CLI administrator promotion
scripts/seed.php    Optional public sample content
scripts/test-bootstrap.php  Isolated local database bootstrap helper
tests/              Real API and React DOM integration tests
docs/               API and verification documentation
```
## Language settings

English, မြန်မာ and 日本語 are available in the header and Settings. Accounts retain the selected language. Public posts/replies support Google Cloud Translation with See original; setup and the additive migration for existing databases are described in [docs/LANGUAGES.md](LANGUAGES.md).


## Flexible confession writing

Short confessions and longer stories share one composer with no minimum beyond non-empty text. Posts allow up to 20,000 Unicode code points, with an optional 120-character title. Writing prompts are optional and never replace existing text. My story posts support separate linked episodes through Add next episode. Account-scoped recovery drafts autosave separately from published posts. See [docs/EPISODES.md](EPISODES.md) for the migration and workflow. Existing reactions remain available.

Before using this version on an existing installation, run `php scripts/migrate-stories.php` with an ALTER-capable database account. The additive migration preserves existing posts. The guarded `--local-dev` option is for the isolated workspace database only.

## Account controls and community updates

Settings now includes password changes, single-use recovery codes, JSON writing export, account deletion and notification preferences. Follow public stories to receive new-episode notifications alongside replies and message requests. Existing databases must run `php scripts/migrate-community.php` with CREATE/ALTER permission before using this version; see [docs/COMMUNITY.md](COMMUNITY.md). Notifications are in-app and refresh every 30 seconds.

## Email-confirmed signup

New registrations require a six-digit email confirmation code before account creation. Gmail SMTP support is implemented with PHPMailer. Fill the private `config/mail.local.php` with your sender Gmail address and Google App Password to enable real delivery. No real Gmail delivery has been tested yet. Existing databases require `scripts/migrate-email-verification.php` (already applied locally). See [docs/EMAIL.md](EMAIL.md) for setup, security rules and test isolation.

