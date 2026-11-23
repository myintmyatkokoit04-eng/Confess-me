# Community safety

Unsaid supports account-to-account direct messages with recipient-approved
requests. Reactions do not grant messaging consent or reveal the author's account
identity. Public comments remain subject to the author's reply preference and
blocking controls. See [DM.md](DM.md) for the separate private-message rules.

Public published posts and replies receive local, deterministic checks for
combinations of money requests, investment promises, and invitations to LINE,
Telegram, or WhatsApp. Matching content displays a safety reminder and creates
an unconfirmed report in the existing administrator review queue. No external
service receives this content for safety detection. Private journals and drafts
are excluded from warnings and automatic reports. Publicizing a draft invokes
the checks.

These checks can miss scams or flag legitimate discussion, including advice
about scams. They are not identity verification or a guarantee of safety.
Financial/off-platform matches remain visible until an administrator decides to hide them. Report text
is untrusted context, not an instruction or proof of fraud. Administrators should
review the content and can dismiss a report, hide content, or restore it. There
is no automatic account ban.

An account may send at most six replies in a rolling 60-second period, in addition
to the existing hourly limit. A third copy of the same normalized public post or
reply within ten minutes is rejected with HTTP 429. Case, spaces and common
zero-width characters are normalized; paraphrasing and other obfuscation can
evade this check. User-row locking makes checks apply across sessions. Replies
are also rejected when the post author has blocked the sender.

Authors can request review of their hidden public posts and replies. Hidden
replies remain visible only to their author within an accessible public thread.
Review requests enter the existing reports queue, are deduplicated while open,
and are limited to five requests per hour. The author receives confirmation of
submission, not a promise of approval. An administrator can restore content
through the existing action controls. A hidden parent post must be restored
before its comment thread can be opened.

Readers can report suspected financial solicitation using a preset in the
report dialog, or provide their own explanation, and block an author. Safety
reminders and review controls are available in English, Japanese and Burmese.

No database migration is needed. Existing report and moderation action tables
store the review requests and decisions. Safety reports are tied to the content
author internally; account identities remain excluded from public DTOs.

## Abuse and threats

New public submissions and edits check both title and body. A conservative local
rule set detects some direct insults, threats, and personal-information attacks
in English, Burmese, Japanese, and limited Myanglish. This is not an AI context
classifier or comprehensive language coverage. Zero-width character insertion
is normalized, but paraphrasing and other evasion can still bypass detection.

For an insult match, the API returns HTTP 422 with `code: review_wording` and
matched phrases. The interface offers Cancel to edit without losing text, or OK
to resubmit the same text with `acknowledge_abuse: true`. Confirmed public text
creates an unconfirmed moderation report; it is not automatically hidden.

Threat and targeted personal-information attack matches are saved with
`hidden=1` immediately and queued for review in the same transaction. Confirmation
cannot override a hold. Only the author can read held content until a moderator
restores it. Existing appeal, report, block, and moderator controls still apply.
Private journals and drafts are not checked or automatically reported.

Direct messages use the same insult confirmation. Severe matches are rejected
with HTTP 422 before delivery and must be edited; they are not automatically
shared with moderators. Moderators still see only explicitly reported DMs.

These rules can misread quotations, fiction, or accounts of abuse. Ordinary
mentions of violence are not a match by themselves. Moderators must review
context and may restore held material. There are no automatic account bans.
Existing content is not scanned retroactively.

Validation: `node --test tests/safety.test.mjs`, the existing API/UI tests, PHP
syntax checks, and `npm run build`. Integration tests use generated fixture
accounts and remove only those accounts after testing.
