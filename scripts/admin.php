<?php
// CLI only. Requires trusted local access to the application's database configuration.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$args=getopt('', ['email:','confirm']);
if(!isset($args['email'],$args['confirm']) || !filter_var($args['email'],FILTER_VALIDATE_EMAIL)) { fwrite(STDERR,"Usage: php scripts/admin.php --email=you@example.com --confirm\nRegister the account normally first. --confirm acknowledges admin privileges.\n"); exit(1); }
$file=__DIR__.'/../config/local.php';
if(!is_file($file)) { fwrite(STDERR,"Copy config/example.php to config/local.php first.\n"); exit(1); }
try { $c=require $file; $db=new PDO($c['dsn'],$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); $q=$db->prepare('UPDATE users SET is_admin=1 WHERE email=?'); $q->execute([strtolower($args['email'])]); if(!$q->rowCount()) { fwrite(STDERR,"Account not found, or already an administrator.\n"); exit(1); } echo "Administrator access granted. Sign in with that account.\n"; } catch(Throwable $e) { fwrite(STDERR,"Unable to update account. Check your database configuration.\n"); exit(1); }
