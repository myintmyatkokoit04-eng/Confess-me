<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$cfg = require __DIR__.'/../config/local.php';
if (in_array('--local-dev', $argv, true)) {
    if (!str_contains($cfg['dsn'], 'host=127.0.0.1;port=33317;dbname=unsaid;')) {
        fwrite(STDERR, "Not the isolated local development database.\n"); exit(1);
    }
    $cfg['user'] = 'root'; $cfg['password'] = '';
}
try {
    $db = new PDO($cfg['dsn'], $cfg['user'], $cfg['password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $db->exec(file_get_contents(__DIR__.'/../database/dm.sql'));
    echo "DM tables are ready. Existing accounts and content are preserved.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "DM migration failed. Use a database account with CREATE permission.\n"); exit(1);
}
