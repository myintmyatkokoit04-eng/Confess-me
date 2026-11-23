# Email-confirmed registration (Gmail SMTP)

New registrations now require email confirmation:

1. Enter an email address and a password.
2. The app sends a six-digit confirmation code.
3. Enter that code to create the account and sign in.

The initial request does **not** create a user or grant access. Only successful
verification creates the user, assigns reading preferences and establishes an
authenticated session. Existing accounts remain usable; their verification
timestamp is left null rather than claiming they verified their email.

## Gmail setup

Real delivery requires sender credentials in the private
`config/mail.local.php` file. Copy the supplied `config/mail.example.php`
template to that path and configure your own sender. Private configuration is
not included in this repository.

1. Turn on Google Account **2-Step Verification** for the sender Gmail account.
2. Create an **App Password** at https://myaccount.google.com/apppasswords.
   See [Google's instructions](https://support.google.com/accounts/answer/185833).
   Some managed or restricted accounts do not offer App Passwords.
3. In `config/mail.local.php`, replace username and from_email with that Gmail
   address and password with its App Password. Do not use the normal Google
   password. Keep the file private and outside the public document root.
4. Keep host `smtp.gmail.com`, port `465`, encryption `ssl`. Port 587 with `tls`
   is also supported. Certificate verification remains enabled.
5. Run `composer install --no-dev` on deployments. PHPMailer and its lockfile
   are included as the SMTP dependency. PHP needs OpenSSL, PDO MySQL and
   mbstring. The workspace launcher enables missing extensions at startup.
6. For existing databases, run
   `php scripts/migrate-email-verification.php` using a CREATE/ALTER-capable
   database account. The isolated workspace migration has already been applied.
7. Start the app with `npm start`, register using an inbox you control, and
   enter the received code. Check Spam if necessary.

SMTP configuration is read on each request. Filling in mail.local.php does not
require rebuilding the frontend. Never deploy config files, vendor dependencies,
test mailboxes or the project root as public web content. Keep `public/` as the
only document root. SMTP errors and credentials are not returned to users.

Missing sender configuration returns a clear service error and does not create
an account. This is not Google Sign-In: the app sends email through the sender's
Gmail account, and recipients may use Gmail or another email provider.

## Code rules

- Codes expire after 10 minutes and can only be used once.
- A code is bound to the browser session that requested it.
- Five incorrect attempts lock that code. A new code can then be requested.
- Resends require 60 seconds; the latest code replaces the old one.
- At most five confirmation emails per recipient per hour are allowed, plus
  IP-based registration/verification limits.
- Passwords and confirmation codes are hashed in the pending-signup table.
  Neither the code nor its hash is returned by the API.
- Successful verification deletes pending signups for that email, rotates the
  session ID and CSRF token, and records email_verified_at.
- Unverified pending records older than a day beyond their expiry are removed
  during subsequent signup requests.

## API

- `POST /api/register`: email, password, optional language. Returns 202 with
  verification_required, email, expires_in=600, resend_after=60.
- `POST /api/register/verify`: code as a six-digit string. Returns 201 with
  ok and a new CSRF token after account creation.
- `POST /api/register/resend`: no fields required; uses the pending session.
  Returns 202 with refreshed expiry/cooldown information.

All three require the existing same-origin session cookie and CSRF token.
Login remains email/password after signup verification. This does not replace
the existing saved-code account recovery feature with email recovery.

## Tests

`npm test` starts its own PHP test server on port 8001 and stops only that
server afterward. It refuses an occupied test port. The regular app continues
on ports 8000/5173. Tests use the existing isolated development database, with
guarded fixture cleanup before each suite.

The test server sets UNSAID_TEST_MAIL=1. Capture delivery only accepts generated
test-[ab]-NUMBER@unsaid.invalid or ui-NUMBER@unsaid.invalid addresses, a loopback
request and the isolated database on port 33317. Codes are captured under
.runtime/mail-test, outside public/, and read only through a fixture-restricted
CLI helper. There is no HTTP mailbox or verification bypass. General accounts
cannot register through this transport. Normal app requests use real SMTP.

API tests exercise wrong codes, five-attempt lockout, expiry, cooldown, resend
invalidation, cross-session isolation, replay prevention and no access before
verification. Existing integration clients complete actual code verification.
React tests exercise the email-code form. Gmail inbox delivery cannot be
verified until the sender's credentials are configured.
