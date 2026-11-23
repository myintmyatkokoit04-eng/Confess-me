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
