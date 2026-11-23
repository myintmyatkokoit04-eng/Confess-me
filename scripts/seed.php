<?php
if(PHP_SAPI!=='cli') { http_response_code(404); exit; }
if(!in_array('--confirm',$argv,true)) { fwrite(STDERR,"Usage: php scripts/seed.php --confirm\nCreates four clearly documented sample public thoughts.\n"); exit(1); }
$cfg=require __DIR__.'/../config/local.php';
$db=new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$db->exec("SET time_zone = '+00:00'");
$email='sample-content@unsaid.invalid';
$q=$db->prepare('SELECT id FROM users WHERE email=?');$q->execute([$email]);
if($q->fetchColumn()){echo "Sample account already exists. No changes made.\n";exit;}
$db->beginTransaction();
$q=$db->prepare('INSERT INTO users(email,password_hash) VALUES(?,?)');$q->execute([$email,password_hash(bin2hex(random_bytes(64)),PASSWORD_DEFAULT)]);$id=$db->lastInsertId();
$posts=[[1,'I wish I had called my parents more often. Today, I finally picked up the phone.','Just listening',2],[5,'I kept waiting until I felt ready. This week, I took one small step.','Advice welcome',3],[3,'To my old friend: I still remember the kindness you showed me.','Just listening',5],[4,'I am learning that changing my mind does not mean I failed.','Advice welcome',27]];
$q=$db->prepare("INSERT INTO posts(user_id,category_id,body,visibility,status,response,created_at) VALUES(?,?,?,'public','published',?,DATE_SUB(UTC_TIMESTAMP(),INTERVAL ? HOUR))");
foreach($posts as [$cat,$body,$response,$hours])$q->execute([$id,$cat,$body,$response,$hours]);
$db->commit();echo "Four sample public thoughts saved in MySQL. The sample account cannot be signed into with a known password.\n";
