<?php
if(PHP_SAPI!=='cli') exit(1);
$a=getopt('', ['stamp:','action:']); $stamp=$a['stamp']??'';
if(!preg_match('/^[0-9]{10,20}$/D',$stamp)) exit(1);
$c=require __DIR__.'/../config/local.php';
if(!str_contains($c['dsn'],'host=127.0.0.1;port=33317;dbname=unsaid;')) exit(1);
$db=new PDO($c['dsn'],$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$emails=['test-a-'.$stamp.'@unsaid.invalid','test-b-'.$stamp.'@unsaid.invalid'];
$db->beginTransaction();
if(($a['action']??'')==='cleanup') {
 foreach($emails as $email) { $q=$db->prepare('DELETE FROM users WHERE email=?');$q->execute([$email]); }
} elseif(($a['action']??'')==='create') {
 $ids=[];
 foreach($emails as $email) {
  $q=$db->prepare('INSERT INTO users(email,password_hash,language,email_verified_at) VALUES(?,?,?,UTC_TIMESTAMP())');
  $q->execute([$email,password_hash('Journal-fixture-password-42',PASSWORD_DEFAULT),'en']);$ids[]=$db->lastInsertId();
  $q=$db->prepare('INSERT INTO reading_preferences(user_id,category_id) SELECT ?,id FROM categories');$q->execute([end($ids)]);
 }
 $q=$db->prepare('INSERT INTO posts(user_id,category_id,body,title,visibility,status,response,mood,created_at) VALUES(?,?,?,?,?,?,?,?,?)');
 for($i=0;$i<15;$i++) $q->execute([$ids[0],1,$i===0?'Literal 100%_ journal needle မြန်မာ':'Journal fixture '.$stamp.' '.$i,'Entry '.$i,'private','published','Just listening',$i%2?'calm':'sad',$i<12?'2026-10-10 10:00:00':'2026-10-11 10:00:00']);
 $q->execute([$ids[0],2,'Draft '.$stamp,'Unfinished reflection','public','draft','Just listening','hopeful','2026-10-11 12:00:00']);
 $q->execute([$ids[0],1,'Public fixture '.$stamp,'Public reflection','public','published','Just listening','anxious','2026-10-11 12:00:00']);
 $q->execute([$ids[1],1,'Literal 100%_ journal needle secret','Other account private entry','private','published','Just listening','sad','2026-10-10 10:00:00']);
} else { $db->rollBack(); exit(1); }
$db->commit(); echo "Journal fixtures ".($a['action']??'')." complete.\n";
