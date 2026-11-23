CREATE DATABASE IF NOT EXISTS unsaid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unsaid;
CREATE TABLE users (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, language VARCHAR(8) NOT NULL DEFAULT 'en', is_admin BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE categories (id INT UNSIGNED PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE);
INSERT INTO categories VALUES (1,'Family'),(2,'Relationships'),(3,'Friendship'),(4,'Career'),(5,'Moving forward');
CREATE TABLE posts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, category_id INT UNSIGNED NOT NULL, body MEDIUMTEXT NOT NULL, mood VARCHAR(20) NOT NULL DEFAULT '', writing_kind ENUM('short','story') NOT NULL DEFAULT 'short', series_id BIGINT UNSIGNED NULL, episode_no INT UNSIGNED NOT NULL DEFAULT 1, support_preference ENUM('listen','advice','connect','off') NOT NULL DEFAULT 'listen', UNIQUE KEY series_episode(series_id,episode_no), title VARCHAR(120) NOT NULL DEFAULT '', visibility ENUM('public','private') NOT NULL, status ENUM('draft','published') NOT NULL, response ENUM('Just listening','Advice welcome','Comments off') NOT NULL, hidden BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(category_id) REFERENCES categories(id), INDEX feed_idx(visibility,status,hidden,created_at), INDEX owner_idx(user_id,status));
CREATE TABLE reactions (user_id BIGINT UNSIGNED NOT NULL, post_id BIGINT UNSIGNED NOT NULL, kind ENUM('understand','me_too') NOT NULL, PRIMARY KEY(user_id,post_id,kind), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE);
CREATE TABLE comments (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, post_id BIGINT UNSIGNED NOT NULL, body TEXT NOT NULL, hidden BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE, INDEX(post_id,hidden,created_at));
CREATE TABLE bookmarks (user_id BIGINT UNSIGNED NOT NULL, post_id BIGINT UNSIGNED NOT NULL, PRIMARY KEY(user_id,post_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE);
CREATE TABLE reading_preferences (user_id BIGINT UNSIGNED NOT NULL, category_id INT UNSIGNED NOT NULL, PRIMARY KEY(user_id,category_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(category_id) REFERENCES categories(id));
CREATE TABLE blocks (user_id BIGINT UNSIGNED NOT NULL, blocked_user_id BIGINT UNSIGNED NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,blocked_user_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(blocked_user_id) REFERENCES users(id) ON DELETE CASCADE, CHECK(user_id <> blocked_user_id));
CREATE TABLE reports (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, post_id BIGINT UNSIGNED NULL, comment_id BIGINT UNSIGNED NULL, reason VARCHAR(1000) NOT NULL, status ENUM('open','resolved') DEFAULT 'open', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE, FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE, CHECK((post_id IS NULL) <> (comment_id IS NULL)), INDEX(status,created_at));
CREATE TABLE moderation_actions (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, admin_id BIGINT UNSIGNED NOT NULL, report_id BIGINT UNSIGNED NOT NULL, action ENUM('hide','restore','dismiss') NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(admin_id) REFERENCES users(id), FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE);
CREATE TABLE rate_limits (bucket CHAR(64) NOT NULL, window_start BIGINT NOT NULL, attempts INT UNSIGNED NOT NULL DEFAULT 1, PRIMARY KEY(bucket,window_start));

CREATE TABLE IF NOT EXISTS dm_profiles (
 user_id BIGINT UNSIGNED PRIMARY KEY,
 contact_code CHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 requests_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS dm_conversations (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 token CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 user_low BIGINT UNSIGNED NOT NULL,
 user_high BIGINT UNSIGNED NOT NULL,
 initiator_id BIGINT UNSIGNED NOT NULL,
 status ENUM('pending','accepted','declined','closed') NOT NULL DEFAULT 'pending',
 read_low BIGINT UNSIGNED NOT NULL DEFAULT 0,
 read_high BIGINT UNSIGNED NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY dm_pair(user_low,user_high),
 INDEX dm_low(user_low,updated_at), INDEX dm_high(user_high,updated_at),
 FOREIGN KEY(user_low) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(user_high) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(initiator_id) REFERENCES users(id) ON DELETE CASCADE,
 CHECK(user_low < user_high),
 CHECK(initiator_id=user_low OR initiator_id=user_high)
);
CREATE TABLE IF NOT EXISTS dm_messages (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 conversation_id BIGINT UNSIGNED NOT NULL,
 sender_id BIGINT UNSIGNED NOT NULL,
 body TEXT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(conversation_id) REFERENCES dm_conversations(id) ON DELETE CASCADE,
 FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX dm_history(conversation_id,id), INDEX dm_sender(sender_id,created_at)
);
CREATE TABLE IF NOT EXISTS dm_reports (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 message_id BIGINT UNSIGNED NOT NULL,
 reason VARCHAR(1000) NOT NULL,
 status ENUM('open','resolved') NOT NULL DEFAULT 'open',
 action ENUM('dismiss','close') NULL,
 reviewed_by BIGINT UNSIGNED NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TIMESTAMP NULL,
 UNIQUE KEY dm_report_once(user_id,message_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(message_id) REFERENCES dm_messages(id) ON DELETE CASCADE,
 FOREIGN KEY(reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
 INDEX dm_report_queue(status,created_at)
);

CREATE TABLE IF NOT EXISTS writing_drafts (user_id BIGINT UNSIGNED NOT NULL, editor_key VARCHAR(80) NOT NULL, payload MEDIUMTEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(user_id,editor_key), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS account_controls (
 user_id BIGINT UNSIGNED PRIMARY KEY,
 auth_version INT UNSIGNED NOT NULL DEFAULT 0,
 recovery_hash CHAR(64) NULL,
 notify_replies BOOLEAN NOT NULL DEFAULT TRUE,
 notify_messages BOOLEAN NOT NULL DEFAULT TRUE,
 notify_stories BOOLEAN NOT NULL DEFAULT TRUE,
 read_at DATETIME(6) NULL,
 read_reply BIGINT UNSIGNED NOT NULL DEFAULT 0,
 read_message BIGINT UNSIGNED NOT NULL DEFAULT 0,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS story_follows (
 user_id BIGINT UNSIGNED NOT NULL,
 series_id BIGINT UNSIGNED NOT NULL,
 followed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(user_id,series_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(series_id) REFERENCES posts(id) ON DELETE CASCADE
);

ALTER TABLE posts ADD COLUMN published_at DATETIME(6) NULL;

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

ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL;
