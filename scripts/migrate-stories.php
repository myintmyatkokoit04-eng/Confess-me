<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$cfg = require __DIR__.'/../config/local.php';
// This flag applies only to the isolated development database, never port 3306.
if (in_array('--local-dev', $argv, true)) {
    if (!str_contains($cfg['dsn'], 'host=127.0.0.1;port=33317;dbname=unsaid;')) { fwrite(STDERR,"Not the isolated local development database.\n"); exit(1); }
    $cfg['user']='root'; $cfg['password']='';
}
try {
    $db = new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    if (!$db->query("SHOW COLUMNS FROM posts LIKE 'title'")->fetch()) $db->exec("ALTER TABLE posts ADD COLUMN title VARCHAR(120) NOT NULL DEFAULT ''");
    echo "Story migration complete. Existing accounts and posts are preserved.\n";
} catch (Throwable $e) { fwrite(STDERR,"Migration failed. Use a database account with ALTER permission; see README.md.\n"); exit(1); }
