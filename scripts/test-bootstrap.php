<?php
if(PHP_SAPI!=='cli')exit;
// Disposable, loopback-only test instance; never target a production MySQL server.
$db=new PDO('mysql:host=127.0.0.1;port=33317;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$db->exec(file_get_contents(__DIR__.'/../database/schema.sql'));
$password=bin2hex(random_bytes(24));
$q=$db->prepare("CREATE USER 'unsaid_dev'@'127.0.0.1' IDENTIFIED BY ?");$q->execute([$password]);
$db->exec("GRANT SELECT,INSERT,UPDATE,DELETE ON unsaid.* TO 'unsaid_dev'@'127.0.0.1'");
$cfg=['dsn'=>'mysql:host=127.0.0.1;port=33317;dbname=unsaid;charset=utf8mb4','user'=>'unsaid_dev','password'=>$password];
$target=__DIR__.'/../config/local.php';
if(is_file($target))throw new RuntimeException('Refusing to overwrite local configuration.');
file_put_contents($target,"<?php\nreturn ".var_export($cfg,true).";\n");echo "Disposable development database configured on port 33317.\n";
