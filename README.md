# Confess Me / Unsaid

An anonymous reflection community and private journal built with **React, PHP, and MySQL**. The application is branded **Unsaid** in its interface and source code.

People can share short thoughts or longer stories, choose how others respond, and keep personal writing in a separate journal. Accounts, writing, messages, preferences, and moderation records are stored in MySQL through a plain PHP JSON API.

## Features

- Anonymous public reading, categories, sorting, pagination, reactions, and saved posts.
- Public confessions and linked story episodes with previews, drafts, editing, and author-controlled replies.
- Private journal entries with moods, search, writing export, and account-scoped recovery drafts.
- Recipient-approved direct messages, unread indicators, story follows, and in-app notifications.
- Reporting, blocking, an administrator moderation queue, and local content-safety rules.
- English, Burmese, and Japanese interface settings; optional Google Cloud Translation for public writing.
- Email-confirmed registration, session authentication, CSRF checks, password changes, saved recovery codes, and account deletion.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 7, Lucide icons, CSS |
| Backend | PHP JSON API, server-side sessions, PDO |
| Database | MySQL 8 |
| Email | PHPMailer with Gmail SMTP configuration |
| Tests | Node test runner, React Testing Library, jsdom, PHP/MySQL integration fixtures |

## Run locally

### Requirements

- Node.js 22.12+ or 24 and npm.
- PHP 8.2+ with PDO MySQL, mbstring, OpenSSL, and sessions.
- MySQL 8.0.16+ and a MySQL administration client.
- Composer for the PHP dependency.

### 1. Install dependencies

From the repository root:

```sh
npm ci
composer install
```

### 2. Set up the database

Import [database/schema.sql](database/schema.sql) into a **new local MySQL database** using your MySQL client. It creates the `unsaid` database, tables, and category records. This initial schema must not be repeatedly imported into an existing installation. No account data or private writing is included in this repository.

Create a dedicated application user with `SELECT`, `INSERT`, `UPDATE`, and `DELETE` permissions on `unsaid.*`. Copy `config/example.php` to `config/local.php` and set your MySQL host, port, database, username, and password. Private configuration files are ignored by Git.

Existing installations should use the relevant `scripts/migrate-*.php` scripts and feature setup notes rather than reimporting the initial schema. Migrations need the documented `CREATE` or `ALTER` permissions.

### 3. Configure registration email

Copy `config/mail.example.php` to `config/mail.local.php` and fill in your own SMTP sender configuration. New accounts require a confirmation email; missing sender configuration returns a service error. See [docs/EMAIL.md](docs/EMAIL.md) for Gmail setup and development-only test transport details.

Optional public-post translation needs a Google Cloud Translation API key configured as described in [docs/LANGUAGES.md](docs/LANGUAGES.md). The interface language switcher works without that provider.

### 4. Start the API and frontend

Start your configured MySQL service. In one terminal:

```sh
php -S 127.0.0.1:8000 -t public server/router.php
```

In another terminal:

```sh
npm run dev
```

Open <http://127.0.0.1:5173>. Vite proxies `/api` to PHP on port 8000 so the frontend and API use the same browser origin.

After private configuration and the database are ready, `npm start` can start/reuse PHP and Vite. It supports a configured external MySQL service and the original workspace's isolated database. It does not create a database or configure credentials. The original `.runtime` database is not included in a clone. See [docs/WORKSPACE-SETUP.md](docs/WORKSPACE-SETUP.md) for preserved launcher and local setup details.

### Optional sample content and administrator

```sh
php scripts/seed.php --confirm
php scripts/admin.php --email=you@example.com --confirm
```

The seed script inserts four editorial sample posts into your configured database. The administrator command promotes an already registered account; there is no default administrator account or password.

## Build

```sh
npm run build
php -S 127.0.0.1:8000 -t public server/router.php
```

Open <http://127.0.0.1:8000>. Vite generates `public/index.html` and `public/assets/` while retaining the PHP API. For Apache, use only `public/` as the document root and enable `mod_rewrite`. Keep configuration, server code, dependencies, tests, and database files outside that document root. PHP's built-in server is for local development.

GitHub hosts the source code. Running this app also requires PHP, MySQL, private configuration, and SMTP setup. No deployed demo is included.

## Tests and verification

```sh
npm test
npm run build
php -l public/api/index.php
php -l server/router.php
```

Integration tests write and remove generated fixtures in a dedicated local MySQL database. The test runner/reset helper are guarded for the original isolated database on port `33317`; `npm test` is not a zero-setup command for an arbitrary database. Follow [docs/WORKSPACE-SETUP.md](docs/WORKSPACE-SETUP.md) before running it. Never run these fixture tests against real user data.

[docs/VERIFICATION.md](docs/VERIFICATION.md) preserves historical development results. They do not establish that checks ran on a fresh clone or on the reader's machine. No new build, integration test, live email delivery, or deployment was performed while preparing this repository copy.

## Project structure

```text
src/                 React components, translations, API client, and styles
public/api/          PHP API entry point
public/.htaccess     Apache routing and headers
server/              Routes, messaging, signup, translation, and safety logic
database/            Initial schema and additive SQL definitions
config/              Public example configuration files
scripts/             Startup, migration, sample seed, and admin commands
tests/               API and React DOM integration tests
docs/                API contracts, feature setup, and verification notes
```

## Known limits

- Private journals use application access controls and are not end-to-end encrypted; database administrators can access stored text.
- Recovery uses saved single-use codes. Email-based password reset is not implemented.
- Local safety rules can miss harmful content or flag legitimate writing; they do not verify identities or guarantee safety.
- Live Gmail delivery, live Google translation, and browser/mobile visual checks remain unverified in the supplied development notes.
- Replace the installation operator's contact text and configure HTTPS before operating a public service. CSS currently requests fonts from Google Fonts.

## Documentation

- [API contract](docs/API.md)
- [Email registration](docs/EMAIL.md)
- [Languages and translation](docs/LANGUAGES.md)
- [Story episodes](docs/EPISODES.md)
- [Direct messages](docs/DM.md)
- [Community and account controls](docs/COMMUNITY.md)
- [Safety and moderation](docs/SAFETY.md)
- [Original workspace setup](docs/WORKSPACE-SETUP.md)
- [Historical verification record](docs/VERIFICATION.md)
