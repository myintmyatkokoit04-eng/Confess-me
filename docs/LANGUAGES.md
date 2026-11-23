# Languages and public-text translation

The header and Settings contain an English / မြန်မာ / 日本語 selector. Interface text changes immediately. Guests retain their choice on this browser; signed-in accounts save it in MySQL and restore it when signing in. Original posts/replies are always preserved. Each public published post and visible reply has a Translate button, a consent prompt, and See original / See translation controls. Private journals and drafts have no translation control and the API rejects them, including requests made by their owners.

## Existing installations

Back up your database, then run the additive migration with a database user that has ALTER permission:

```powershell
php scripts/migrate-language.php
```

Alternatively, a database administrator can run:

```sql
ALTER TABLE users ADD COLUMN language VARCHAR(8) NOT NULL DEFAULT 'en';
```

The script checks whether the column exists and can be run again. It never resets, seeds, or deletes data. This workspace's isolated development database has already been migrated. The `--local-dev` flag uses its local root account only when the configured DSN exactly matches loopback port 33317 and the unsaid database. New installations already include the column in `database/schema.sql`.

## Google Cloud setup

1. In your Google Cloud project, enable Cloud Translation API, enable billing, and create a server-side API key. Restrict the key to the Cloud Translation API and your server's IP address where available. Set appropriate project quotas/budget alerts.
2. Add the key inside the existing private `config/local.php` array (preserve your database settings):

   ```php
   'translation' => ['api_key' => 'YOUR_SERVER_KEY'],
   ```

   Or leave this config entry absent/empty and set `GOOGLE_TRANSLATE_API_KEY` in the PHP process environment. For the local launcher:

   ```powershell
   $env:GOOGLE_TRANSLATE_API_KEY = 'YOUR_SERVER_KEY'
   npm start
   ```

   If the launcher reuses an already-running PHP server, restart that PHP server so it receives the environment variable. The config-file method takes effect on the next API request.
3. PHP needs cURL, HTTPS connectivity, and a working CA certificate store. TLS verification remains enabled.
4. Sign in, choose the target app language, open a public post, click Translate, and confirm. Check the result and See original. Text written in the selected language may remain unchanged.

The key is never included in browser assets or client responses. The server uses Google's Basic v2 endpoint, automatic source-language detection, and explicit `format: text`; it renders results as React text, never HTML. Translation is limited to 30 requests per account per hour. There is no automatic bulk translation or translation cache; every confirmed fresh request may incur Google usage charges. Changes to the target language or original content discard the displayed translation.

Only the selected public body is transmitted after confirmation. Identity, email, journal entries and drafts are not sent. Blocking, hidden-content rules, authentication and CSRF checks apply before calling Google. With no key configured, Translate reports that setup is required. Upstream failures return a generic error without exposing the key or provider response.

Official references: [Google Cloud Translation Basic v2](https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate) and [API-key headers](https://docs.cloud.google.com/docs/authentication/api-keys-use). Live provider translation has not been tested in this workspace because no API key has been supplied. The interface/translation controls and access checks are covered by automated tests, including a simulated provider response.
