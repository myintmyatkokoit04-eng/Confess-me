# Account controls, notifications and story following

Existing installations must run `php scripts/migrate-community.php` with a
database account that has CREATE and ALTER permissions before serving this
version. For the isolated workspace database only, use
`php -d extension=pdo_mysql -d extension=mbstring scripts/migrate-community.php --local-dev`.
The additive, repeatable migration preserves existing accounts and writing.
Fresh databases include the new tables and publication timestamp in schema.sql.

## Account & privacy

Settings provides password changes, recovery-code generation, JSON writing
export and permanent account deletion. Password changes require the current
password and invalidate other sessions. Account deletion requires the current
password and typing `DELETE`; cascading deletes remove posts, journals, drafts,
replies, reactions, follows, conversations and related reports. Conversations
are removed for both participants. Moderation actions performed by the deleted
administrator are also removed to permit deletion without retaining an account.

Recovery uses a cryptographically random, 192-bit single-use code generated in
Settings after verifying the current password. Only its SHA-256 hash is stored;
the plaintext appears once in the interface. A new code replaces the old one.
Forgot password accepts the account email, saved code and new password. A reset
consumes the code and invalidates all existing sessions. Generate a new code
after recovery. Login, recovery and security actions are rate limited. There is
no email delivery, email verification or recovery path without a previously
saved code. Store the code outside the account, such as in a password manager.

Writing export includes only the signed-in author's posts and recovery drafts,
including private writing. It excludes passwords, recovery hashes, peer
identities and other people's writing. Downloaded JSON is an unencrypted copy.

## Notifications and follows

The Notifications navigation link displays an unread count and checks for
updates every 30 seconds while signed in. The page lists recent replies to the
reader's published public posts, unread messages/requests and new episodes of
followed stories. Each type can be disabled in Settings. Mark all as read clears
notification unread indicators; opening a message thread separately controls its
message read cursor. These are in-app notifications, without email or push.

Open a public story and choose Follow story. Following is idempotent and applies
to the series, so subsequent episodes share the same follow state. Owners
cannot follow their own stories. Followers and follow counts are not exposed.
Unfollow is available on that story. New episodes appear only after their first
public publication, including drafts published after following. Private drafts,
hidden content, non-public story roots and content involving blocked accounts
are excluded from notifications. Their source permissions are rechecked each
time the notifications list is retrieved; notification links also use normal
post/message authorization. Notification data contains generic text, content
links and timestamps, without account identifiers or content previews.

The inbox is a current view of up to 50 replies, 50 story episodes and 50 unread
conversations, combined into the latest 100 items. It is not an archival event
log. Unfollowing, blocking or withdrawing a post can remove earlier items.

## API

- `GET/PUT account/controls`: recovery setup status and three boolean notification preferences.
- `POST account/recovery-code`: current_password; returns a new recovery_code once.
- `POST account/recover`: email, recovery_code, password (new password).
- `POST account/password`: current_password and password (new password).
- `GET account/export`: the authenticated author's writing as JSON.
- `DELETE account`: current_password and confirmation equal to DELETE.
- `GET/POST/DELETE posts/:id/follow`: inspect, follow or unfollow a public story.
- `GET notifications`: notifications and unread count.
- `POST notifications`: mark current notifications as read.

All mutations require the existing CSRF token. Authenticated routes recheck
account existence and the persisted authentication version on every request.
