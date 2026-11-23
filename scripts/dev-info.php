<?php
// CLI-only startup diagnostics. Never print database credentials.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$file = __DIR__.'/../config/local.php';
if (!is_file($file)) { fwrite(STDERR,"Database configuration is missing. Follow README.md first.\n"); exit(1); }
try {
    $config = require $file;
    if (in_array('--check-db', $argv, true)) {
        $db = new PDO($config['dsn'], $config['user'], $config['password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        $db->query('SELECT id FROM posts LIMIT 1');
        echo "Database connection and schema are ready.\n";
    } else {
        $fields = [];
        foreach (explode(';', substr($config['dsn'], 6)) as $part) {
            $pair = explode('=', $part, 2);
            if (count($pair) === 2) $fields[$pair[0]] = $pair[1];
        }
        echo json_encode(['host'=>$fields['host']??'127.0.0.1', 'port'=>(int)($fields['port']??3306)]);
    }
} catch (Throwable $e) {
    fwrite(STDERR,"Cannot connect to the configured database or find its tables. Check config/local.php and README.md.\n");
    exit(1);
}
