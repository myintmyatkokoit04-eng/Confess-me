CREATE TABLE IF NOT EXISTS pending_signups (
 token CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 email VARCHAR(254) NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 language VARCHAR(8) NOT NULL,
 code_hash VARCHAR(255) NOT NULL,
 expires_at BIGINT NOT NULL,
 last_sent_at BIGINT NOT NULL,
 attempts INT UNSIGNED NOT NULL DEFAULT 0,
 INDEX signup_email(email), INDEX signup_expiry(expires_at)
);
