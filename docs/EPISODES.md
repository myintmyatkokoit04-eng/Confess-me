# Confessions, stories and episodes

Choose **A short confession** or **My story** in the composer. Both accept non-empty text up to 20,000 Unicode code points, with an optional title of up to 120 characters. There is no minimum word count. Optional prompts help people start writing and never replace their words.

Publish the first story, then use **Add next episode** on its card. This opens a blank composer. Each continuation is a separate post in the same series. Parts receive sequential numbers on the server; starting from an earlier episode still appends after the latest part. The story detail page lists readable episodes in order. Private, draft, hidden and blocked episodes are excluded for other readers. Deleting an episode does not delete the other parts or renumber them.

Support preferences are **Just listening**, **Advice welcome**, **I'd like to talk to someone who understands**, and **Comments off**. The connection preference exposes an **Offer to listen** message request action. Existing recipient consent, block and report rules still apply. Only **Advice welcome** opens public replies.

## Draft autosave

Signed-in writers' changes save to MySQL after 1.2 seconds without an edit. Autosave uses a separate account-scoped draft table; it never updates a published post or publishes new writing. The status changes to **Draft saved automatically** only after the server confirms the write. Closing the composer flushes pending edits; if saving fails it keeps the editor open with the text intact. Reopening the same editor offers **Restore writing** or **Discard saved copy**. Successful manual saving/publishing removes its recovery copy in the same database transaction.

Recovery slots are separate for a new public confession, a new private entry, each edited post, and each episode continuation. The most recent save wins when the same slot is edited in multiple tabs. Unsaved changes can be lost if the browser/process closes before the server confirms a save. No confession text is stored in browser localStorage. Explicit **Save draft** still creates a draft post in My Journal.

## Existing installations

After the earlier story/title migration, run this with a database account that has ALTER and CREATE permissions:

```powershell
php scripts/migrate-episodes.php
```

For the initialized isolated development instance on port 33317 only:

```powershell
php -d extension=pdo_mysql scripts/migrate-episodes.php --local-dev
```

The migration preserves accounts and posts, widens post bodies to MEDIUMTEXT for 20,000 four-byte Unicode characters, and preserves existing response preferences. New installations use database/schema.sql. API JSON request size is capped at 250,000 bytes so UTF-8 and JSON-escaped Unicode fit without making requests unbounded.

The episodes API tests exercise Unicode limits, sequential linking, ownership, private/draft exclusion, blocking, and draft isolation. The episodes UI test exercises autosave, Escape/restore, publishing, and linked continuation through React and the real PHP/MySQL API. These DOM tests do not establish pixel layout or every browser's behavior.
