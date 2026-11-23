# Unsaid JSON API

Base: `/api`. Send JSON with `Content-Type: application/json`; use same-origin cookies. No CORS access is enabled. Error shape: `{"error":"Safe human-readable message"}`. Status codes: `400` validation, `401` sign-in required/bad login, `403` CSRF/ownership/admin/comment restrictions, `404` nonexistent or inaccessible content, `409` registration conflict, `413` excessive request size, `429` rate limit, `503` configuration/database availability.

## Session and CSRF

`GET /session` returns `{user:null|{email,is_admin},csrf,categories:[{id,name}]}`. Obtain a token before the first mutation, including register/login. Every non-GET request requires `X-CSRF-Token` matching the session. Completed email verification, login, and logout return a new token. Use the new token afterward. Login and completed email verification regenerate the session ID. Cookies are HttpOnly, SameSite=Lax, and Secure on HTTPS.

| Method | Path        | JSON / result                                                              |
| ------ | ----------- | -------------------------------------------------------------------------- |
| POST | `/register` | `{email,password,language?}`; sends email code, returns 202 without creating an account |
| POST | `/register/verify` | `{code}`; verifies the emailed code, creates account and signs in; 201 + new CSRF token |
| POST | `/register/resend` | `{}`; sends replacement code after cooldown; 202 |
| POST   | `/login`    | `{email,password}`; signs in; 200                                          |
| POST   | `/logout`   | `{}`; clears identity, rotates session/token                               |

Passwords are hashed with Argon2id when PHP supports it, using `password_hash()` and `password_verify()`. A bcrypt fallback rejects passwords exceeding 72 UTF-8 bytes rather than truncating them. Password whitespace is preserved.

## Thoughts

| Method | Path                                                   | Contract                                                                                            |
| ------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| GET    | `/posts?scope=explore&category=1&sort=newest&offset=0` | `{posts,has_more}`; at most 12 entries; stable created_at/id ordering                               |
| GET    | `/posts/{id}`                                          | `{post}`; public/published/unhidden/unblocked or owner                                              |
| POST   | `/posts`                                               | Auth required; creates thought; `{post}` and 201                                                    |
| PATCH  | `/posts/{id}`                                          | Auth + ownership; replaces editable fields; `{post}`                                                |
| DELETE | `/posts/{id}`                                          | Auth + ownership; permanent removal plus dependent replies/reactions/bookmarks/reports; `{ok:true}` |

POST/PATCH fields: `{body,category_id,visibility,status,response}`. Body 1–5000 trimmed characters; category 1–5; visibility `public` or `private`; status `draft` or `published`; response `Just listening`, `Advice welcome`, or `Comments off`. All fields are required for PATCH. Publication options are validated independently. Updating does not clear an administrator's hidden flag.

Feed scopes: `explore` anonymous public feed (saved preferences apply if signed in), `journal` owner's private entries and all drafts, `mine` owner's published public posts, `saved` signed-in user's bookmarks on currently accessible public posts. Journal/mine/saved require authentication. Optional category applies to all scopes; sort `oldest` uses ascending order, otherwise newest. Offset is bounded to 0–100000. Blocked authors and hidden posts are omitted from Explore and Saved. Owners can still manage their own hidden posts in My Posts.

Post DTO: `{id,category_id,category,body,visibility,status,response,hidden,created_at,is_owner,saved,reactions}`. Reactions is the current reader's array of `understand` and/or `me_too`, never a popularity score. Timestamps are UTC. No internal author identifiers or email are included.

## Community

These endpoints require an accessible public, published, unhidden post, including for its owner. Mutations also require authentication and CSRF.

| Method | Path                    | JSON / result                                                                             |
| ------ | ----------------------- | ----------------------------------------------------------------------------------------- |
| POST   | `/posts/{id}/reactions` | `{kind:"understand"                                                                       | "me_too"}`; atomic toggle, unique composite primary key; `{post}` |
| POST   | `/posts/{id}/bookmark`  | `{}`; atomic toggle; `{post}`                                                             |
| GET    | `/posts/{id}/comments`  | `{comments:[{id,body,created_at,is_owner}]}`; hides moderated replies and blocked authors |
| POST   | `/posts/{id}/comments`  | `{body}` 1–2000 characters; Comments off enforced under row lock; 201                     |
| DELETE | `/comments/{id}`        | Only reply author; parent post must remain accessible; `{ok:true}`                        |
| POST   | `/posts/{id}/report`    | `{reason}` 3–1000 characters; public content only; 201                                    |
| POST   | `/comments/{id}/report` | Same; hidden/blocked replies are inaccessible; 201                                        |
| POST   | `/posts/{id}/block`     | `{}`; internally blocks its author, never returns author ID                               |
| POST   | `/comments/{id}/block`  | `{}`; same for reply author                                                               |

Users cannot block themselves. Public post reactions and bookmarks are not exposed with counts. Changing a post to private or draft immediately prevents all public community endpoints from accessing it.

## Preferences and blocks

New replies are permitted only when the post's response preference is `Advice welcome`. Both `Just listening` and `Comments off` return 403 for attempts to add a reply. Existing replies remain readable and author-deletable; reactions remain available.

| Method | Path           | JSON / result                                                                                            |
| ------ | -------------- | -------------------------------------------------------------------------------------------------------- |
| GET    | `/preferences` | Auth; `{categories:[1,2,3,4,5]}`                                                                         |
| PUT    | `/preferences` | Auth; `{categories:[integer category IDs]}` replaces selection transactionally; empty selection is valid |
| GET    | `/blocks`      | Auth; `{blocks:[{token,created_at}]}`; token is a session-bound HMAC, not an account ID                  |
| DELETE | `/blocks`      | Auth; `{token}` from current session's block list; unblock                                               |

## Moderation

Every endpoint rechecks admin privileges from MySQL. No private journals or drafts are returned or moderated, including reports of formerly public content.

| Method | Path                  | Contract                                                                                                                                                                              |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/reports`      | `{reports}` latest 200, open and resolved; reported public/published content only; reasons, content text, visibility flag, timestamp, and target post/comment IDs; no author email/ID |
| POST   | `/admin/reports/{id}` | `{action:"hide"                                                                                                                                                                       | "restore" | "dismiss"}`; changes target hidden flag if applicable, resolves report, and writes audit action transactionally |

Only public post and comment bodies are available to the moderation dashboard. Hide/restore does not change author ownership, visibility, or publication status.

## Rate limits and bounds

MySQL stores hashed rate buckets with atomic increments and fixed windows. Login: 15 requests/IP/15 minutes; registration: 5/IP/15 minutes; new posts: 30/account/hour; replies: 60/account/hour; reports: 15/account/hour. Invalid attempts count toward limits. CSRF is checked before mutation handlers. JSON body maximum is 20 KB; post/reply lengths are Unicode-aware. Queries use prepared statements and integer-bounded pagination. The server's direct REMOTE_ADDR is used for authentication limits; a reverse proxy needs an appropriate trusted configuration rather than arbitrary forwarded headers.
## Language and translations

`GET /api/session` includes `user.language` (`en`, `my` or `ja`). Registration accepts an optional `language`, defaulting to `en`. `PUT /api/language` accepts `{ "language": "my" }`, requires authentication/CSRF and saves the account preference.

`POST /api/posts/{id}/translate` and `POST /api/comments/{id}/translate` accept `{ "target": "en" }` `{ "target": "my" }` or `{ "target": "ja" }`. Both require authentication and CSRF. Only accessible, visible public published content can be translated; private posts and drafts return 404 even for their owner. Hidden or blocked replies are rejected. The provider receives only the authorized body, not arbitrary client text. Returns `translated_text`, `target`, and optional `detected_language`; original content is never updated. Missing configuration/provider failure returns 503. Successful provider attempts are limited to 30 per account per hour (failures after a provider attempt also count).

See [LANGUAGES.md](LANGUAGES.md) for migration and server-side API-key setup.
# Safety extensions

Public post and reply DTOs include `safety_signals` (an array of
`money_request`, `investment_pitch`, or `off_platform`). Reply DTOs also include
`hidden`; hidden replies are returned only to their author. Private posts and
drafts always have an empty `safety_signals` array.

`POST /api/posts/:id/appeal` and `POST /api/comments/:id/appeal` require
authentication and CSRF. Only the author of hidden content under a public,
published post can request review. Success returns `{ "ok": true }`; inaccessible
targets return 404. Repeated requests are deduplicated while a review is open,
and the per-account limit is five requests per hour.

Public submission checks can return 429 for duplicate content, and reply burst
limits persist even if replies are deleted. A blocked sender cannot reply to the
blocking author's post (403). See `SAFETY.md` for thresholds and limitations.

# Abuse checks

Public post title/body, replies, and new DMs use local abuse checks. A possible
insult returns HTTP 422 with `code: "review_wording"`, `error`, and `matches`
(plain-text snippets). After the user explicitly confirms, repeat the same
request with `acknowledge_abuse: true`; otherwise retain their text for editing.

Severe public matches are saved but hidden pending moderation. Read the returned
`post.hidden` or reply response `held_for_review` to show the correct status.
This flag cannot bypass a severe hold. Severe DMs return HTTP 422 without
delivering the message or automatically reporting private text. Private journal
entries and drafts are excluded. Existing review/restore/appeal endpoints apply.
See [SAFETY.md](SAFETY.md) for limitations and privacy behavior.



Story posts additionally accept `writing_kind` (`short` or `story`), `support_preference` (`listen`, `advice`, `connect`, `off`), and optional `next_part_of` (an owned story post ID, for POST only). GET `/posts/{id}/episodes` lists only readable parts. GET/PUT/DELETE `/writing-drafts/{key}` reads, saves or discards the signed-in writer's recovery draft. Valid keys are `new-public`, `new-private`, `edit-{id}`, `episode-{id}`. A successful post save with `draft_key` removes that account's recovery copy atomically. See EPISODES.md.
