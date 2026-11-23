<?php
if(PHP_SAPI!=='cli'||!in_array('--confirm',$argv,true))exit(1);
$c=require __DIR__.'/../config/local.php';
if(!str_contains($c['dsn'],'host=127.0.0.1;port=33317;')){fwrite(STDERR,"This helper only supports the isolated loopback test instance on port 33317.\n");exit(1);}
$db=new PDO($c['dsn'],$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
foreach($db->query('SELECT email FROM users')->fetchAll(PDO::FETCH_COLUMN) as $email){
 if(!preg_match('/^(?:test-[ab]|ui)-[0-9]+@unsaid\.invalid$/D',$email))continue;
 $q=$db->prepare('DELETE FROM moderation_actions WHERE admin_id IN (SELECT id FROM users WHERE email=?)');$q->execute([$email]);
 $q=$db->prepare('DELETE FROM users WHERE email=?');$q->execute([$email]);
}
$q=$db->prepare('DELETE FROM rate_limits WHERE bucket IN (?,?,?)');$q->execute([hash('sha256','register:127.0.0.1'),hash('sha256','login:127.0.0.1'),hash('sha256','recovery:127.0.0.1')]);
echo "Generated fixtures and loopback authentication limits reset in the isolated test instance.\n";
foreach($db->query('SELECT DISTINCT email FROM pending_signups')->fetchAll(PDO::FETCH_COLUMN) as $email) {
 if(!preg_match('/^(?:test-[ab]|ui)-[0-9]+@unsaid\.invalid$/D',$email)) continue;
 $q=$db->prepare('DELETE FROM pending_signups WHERE email=?'); $q->execute([$email]);
 $mail=__DIR__.'/../.runtime/mail-test/'.hash('sha256',$email).'.json'; if(is_file($mail)) unlink($mail);
}
$q=$db->prepare('DELETE FROM rate_limits WHERE bucket=?');$q->execute([hash('sha256','signup-verify:127.0.0.1')]);
