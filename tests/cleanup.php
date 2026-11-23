<?php
// Removes only an explicitly named, generated test fixture account.
if(PHP_SAPI!=='cli')exit;
$args=getopt('', ['email:']);$email=$args['email']??'';
if(!is_string($email)||!preg_match('/^(?:test-[ab]|ui)-[0-9]+@unsaid\.invalid$/D',$email)){fwrite(STDERR,"An exact generated test fixture email is required.\n");exit(1);}
$c=require __DIR__.'/../config/local.php';$db=new PDO($c['dsn'],$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$db->beginTransaction();
$q=$db->prepare('DELETE FROM moderation_actions WHERE admin_id IN (SELECT id FROM users WHERE email=?)');$q->execute([$email]);
$q=$db->prepare('DELETE FROM users WHERE email=?');$q->execute([$email]);
$q=$db->prepare('DELETE FROM pending_signups WHERE email=?');$q->execute([$email]);$db->commit();
$mail=__DIR__.'/../.runtime/mail-test/'.hash('sha256',$email).'.json'; if(is_file($mail)) unlink($mail);
