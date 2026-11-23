<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$cfg = require __DIR__.'/../config/local.php';
if (in_array('--local-dev', $argv, true)) {
    if (!str_contains($cfg['dsn'], 'host=127.0.0.1;port=33317;dbname=unsaid;')) { fwrite(STDERR,"Not the isolated local development database.\n"); exit(1); }
    $cfg['user']='root'; $cfg['password']='';
}
try {
    $db=new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $db->exec(file_get_contents(__DIR__.'/../database/community.sql'));
    foreach (['read_reply','read_message'] as $column) {
        if (!$db->query("SHOW COLUMNS FROM account_controls LIKE '$column'")->fetch()) $db->exec("ALTER TABLE account_controls ADD COLUMN $column BIGINT UNSIGNED NOT NULL DEFAULT 0");
    }
    if (!$db->query("SHOW COLUMNS FROM posts LIKE 'published_at'")->fetch()) {
        $db->exec('ALTER TABLE posts ADD COLUMN published_at DATETIME(6) NULL');
        $db->exec("UPDATE posts SET published_at=created_at WHERE visibility='public' AND status='published'");
    }
    echo "Community migration complete. Existing content preserved.\n";
} catch (Throwable $e) { fwrite(STDERR,"Migration failed: ".$e->getMessage()."\n"); exit(1); }
