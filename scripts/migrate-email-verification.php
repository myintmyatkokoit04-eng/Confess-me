<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$cfg=require __DIR__.'/../config/local.php';
if(in_array('--local-dev',$argv,true)) {
    if(!str_contains($cfg['dsn'],'host=127.0.0.1;port=33317;dbname=unsaid;')) { fwrite(STDERR,"Not the isolated local database.\n"); exit(1); }
    $cfg['user']='root'; $cfg['password']='';
}
try {
    $db=new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $db->exec(file_get_contents(__DIR__.'/../database/email-verification.sql'));
    if(!$db->query("SHOW COLUMNS FROM users LIKE 'email_verified_at'")->fetch()) $db->exec('ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL');
    echo "Email verification migration complete. Existing accounts preserved.\n";
} catch(Throwable $e) { fwrite(STDERR,"Email verification migration failed: ".$e->getMessage()."\n"); exit(1); }
