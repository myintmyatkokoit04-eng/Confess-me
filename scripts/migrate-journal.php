<?php
// Additive and repeatable. Existing entries are preserved.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$cfg=require __DIR__.'/../config/local.php';
if(in_array('--local-dev',$argv,true)) {
 if(!str_contains($cfg['dsn'],'host=127.0.0.1;port=33317;dbname=unsaid;')) exit(1);
 $cfg['user']='root'; $cfg['password']='';
}
try {
 $db=new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
 if(!$db->query("SHOW COLUMNS FROM posts LIKE 'mood'")->fetch()) $db->exec("ALTER TABLE posts ADD COLUMN mood VARCHAR(20) NOT NULL DEFAULT ''");
 echo "Journal mood migration complete. Existing entries preserved.\n";
} catch(Throwable $e) { fwrite(STDERR,"Journal migration failed. Check database access.\n"); exit(1); }
