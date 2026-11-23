<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$cfg = require __DIR__.'/../config/local.php';
if (in_array('--local-dev', $argv, true)) {
    if (!str_contains($cfg['dsn'], 'host=127.0.0.1;port=33317;dbname=unsaid;')) { fwrite(STDERR,"Not the isolated local database.\n"); exit(1); }
    $cfg['user']='root'; $cfg['password']='';
}
try {
    $db=new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $columns = [
        'writing_kind'=>"ENUM('short','story') NOT NULL DEFAULT 'short'",
        'series_id'=>'BIGINT UNSIGNED NULL',
        'episode_no'=>'INT UNSIGNED NOT NULL DEFAULT 1',
        'support_preference'=>"ENUM('listen','advice','connect','off') NOT NULL DEFAULT 'listen'",
    ];
    foreach ($columns as $name=>$definition) {
        if (!$db->query("SHOW COLUMNS FROM posts LIKE '$name'")->fetch()) {
            $db->exec("ALTER TABLE posts ADD COLUMN $name $definition");
            if ($name==='support_preference') $db->exec("UPDATE posts SET support_preference=CASE response WHEN 'Advice welcome' THEN 'advice' WHEN 'Comments off' THEN 'off' ELSE 'listen' END");
        }
    }
    $db->exec('ALTER TABLE posts MODIFY body MEDIUMTEXT NOT NULL');
    if (!$db->query("SHOW INDEX FROM posts WHERE Key_name='series_episode'")->fetch()) $db->exec('ALTER TABLE posts ADD UNIQUE KEY series_episode(series_id,episode_no)');
    $db->exec("CREATE TABLE IF NOT EXISTS writing_drafts (user_id BIGINT UNSIGNED NOT NULL, editor_key VARCHAR(80) NOT NULL, payload MEDIUMTEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(user_id,editor_key), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)");
    echo "Episode and autosave migration complete. Existing posts preserved.\n";
} catch (Throwable $e) { fwrite(STDERR,"Migration failed. Use an ALTER/CREATE-capable database account.\n"); exit(1); }
