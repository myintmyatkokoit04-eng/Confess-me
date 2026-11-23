# Direct messages

DMs are persisted in MySQL, not browser storage or demo state. Sign in, open
**Messages**, and choose **New message**. Enter another account's 16-character
DM code and your first message. Accounts can share their own code from the
Messages page. A public post's options menu also offers **Send a message request**
to its author without exposing their email or internal user ID.

The **Me too / 私も同じです** reaction also opens private contact with another
post's author. It retains the reaction toggle. If a conversation already exists,
it opens that thread; otherwise it opens the request composer without sending
anything automatically. On your own post, it only toggles the reaction.

The first message is a request. Only its recipient can accept or decline it.
Neither participant can send a follow-up until it is accepted. Declined requests
cannot be recreated by the sender, and an accepted pair has one conversation.
The recipient can turn off new requests without interrupting existing chats.
Public post reply preferences apply to comments; the separate DM request setting
controls private contact. DM codes are contact identifiers, not login secrets.

Messages refresh every three seconds while the conversation page is open; the
inbox refreshes every five seconds. This is HTTP polling, not WebSocket push.
History survives refresh, sign-out and another device signing into the same
account. Unread counts are based on the last displayed message acknowledged
while the page is visible. History is paginated in 50-message pages; conversation
and reported-message lists are paginated in 30-row pages. Load older messages
without discarding the current conversation.

## Authorization and privacy

- Authentication, CSRF and participant checks apply on the server. Conversation
  URLs use random 128-bit tokens. Knowing a token does not grant access.
- Emails, internal account IDs and the other participant's private DM code are
  excluded from conversation and message responses. Conversations display an
  anonymous label and a short thread suffix. Contacting the same post author
  again reuses the thread, so DM participants can associate those posts with the
  same account. This is not an identity verification system.
- Block is account-wide and stops sending in both directions. Unblock removes
  only your own block; it cannot remove the other participant's block. Previous
  DM history remains available to its participants after blocking.
- DMs are access-controlled, not end-to-end encrypted. Database operators can
  access stored messages. Private DMs are not sent to translation services.
- Local scam checks display reminders for risky money requests, investment
  promises and off-platform invitations. They do not automatically disclose DMs
  to administrators or ban accounts.
- Reporting explicitly shares only the selected incoming message and the
  supplied reason with moderators. Admin inbox access is not granted; even an
  administrator cannot open a non-participant's conversation. The dedicated
  **Reported direct messages** queue can dismiss a report or close that thread.
  It does not show other messages or permit reopening without participant consent.
- New requests are limited to five per hour. Messages are limited to 60 per
  hour and six per rolling minute across sessions. A third normalized copy of
  the same DM within ten minutes is rejected. Lookup attempts and reports have
  separate limits. These controls reduce abuse but cannot catch every scam.

## Install or upgrade

Fresh installations create the DM tables through `database/schema.sql`. For an
existing installation, use the configured database account with CREATE permission:

```powershell
php scripts/migrate-dm.php
```

The migration adds four tables and preserves existing accounts, posts, comments
and journals. For the isolated development instance on port 33317, the guarded
command `php scripts/migrate-dm.php --local-dev` uses the local bootstrap account.
It refuses other database configurations. The runtime account still needs only
SELECT, INSERT, UPDATE and DELETE permissions.

## API

- `GET /api/dm/profile`: own DM code and new-request preference.
- `GET /api/posts/:id/dm-conversation`: the caller's existing conversation with
  that public post's author, or `null`. Authentication and public-post access are
  required; it never returns another account pair's conversation.
- `PUT /api/dm/profile`: `{ "requests_enabled": true | false }`.
- `GET /api/dm/conversations?offset=0`: participant-only inbox.
- `POST /api/dm/conversations`: `{ "body": "...", "contact_code": "..." }`
  or `{ "body": "...", "post_id": 123 }`. Creates a request, or sends to an
  already accepted pair. Other existing states return 409.
- `GET /api/dm/conversations/:token`: conversation state and unread count.
- `GET /api/dm/conversations/:token/messages`: newest 50 in chronological order;
  optional `before=:messageId` loads older messages, and `after=:messageId` polls
  new ones. Response includes `has_more`. Message IDs from other threads cannot
  expose their content.
- `POST /api/dm/conversations/:token/messages`: accepted-thread send, `{ "body": "..." }`.
- `POST /api/dm/conversations/:token/accept` or `/decline`: recipient-only.
- `POST /api/dm/conversations/:token/read`: `{ "last_id": 123 }`; the ID must
  belong to that conversation. Read boundaries only advance.
- `POST /api/dm/conversations/:token/block` or `/unblock`: own block control.
- `POST /api/dm/messages/:id/report`: `{ "reason": "..." }`; incoming messages
  only, deduplicated by reporter and message.
- `GET /api/admin/dm-reports?offset=0`: only explicitly reported messages.
- `POST /api/admin/dm-reports/:id`: `{ "action": "dismiss" | "close" }`;
  admin-only, decisions are timestamped and attributed internally.

All writes require the session CSRF token. Unauthorized participants receive
404, guests 401, disallowed thread actions 403, duplicates/pending re-requests
409, and rate limits 429. Message bodies are plain text, 1–2000 characters.

## Verification

`tests/dm.test.mjs` exercises actual PHP/MySQL account-to-account requests,
concurrent session creation, consent, participant/admin isolation, CSRF, history
cursors, read state, preferences, blocking, duplicate/burst limits, reports,
moderation and declined requests. `tests/dm-ui.test.mjs` mounts two signed-in
React sessions and sends, accepts, replies, reports, blocks and reloads persisted
history through the real API. These DOM checks do not prove rendered pixel layout.

`npm test` runs suites separately and resets generated fixtures and loopback
authentication buckets between suites through the existing guarded reset helper.
It refuses a database other than the isolated loopback instance on port 33317;
production authentication limits are unchanged.
