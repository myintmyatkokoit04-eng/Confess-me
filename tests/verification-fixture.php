<?php
// CLI-only test mailbox/control. No HTTP route and no real-address access.
if(PHP_SAPI!=='cli') exit(1);
$args=getopt('', ['email:','action:']); $email=$args['email']??''; $action=$args['action']??'read';
if(!is_string($email)||!preg_match('/^(?:test-[ab]|ui)-[0-9]+@unsaid\.invalid$/D',$email)) exit(1);
$cfg=require __DIR__.'/../config/local.php';
if(!str_contains($cfg['dsn'],'host=127.0.0.1;port=33317;dbname=unsaid;')) exit(1);
$file=__DIR__.'/../.runtime/mail-test/'.hash('sha256',$email).'.json';
if($action==='read') { if(!is_file($file)) exit(1); echo file_get_contents($file); exit; }
$db=new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
if($action==='expire'||$action==='resend-ready') {
    $column=$action==='expire'?'expires_at':'last_sent_at';
    $q=$db->prepare("UPDATE pending_signups SET $column=? WHERE email=?"); $q->execute([time()-61,$email]); exit;
}
if($action==='inspect') {
    $q=$db->prepare('SELECT email,code_hash,expires_at,attempts FROM pending_signups WHERE email=?'); $q->execute([$email]);
    $u=$db->prepare('SELECT email,email_verified_at FROM users WHERE email=?'); $u->execute([$email]);
    echo json_encode(['pending'=>$q->fetchAll(),'users'=>$u->fetchAll()]); exit;
}
exit(1);
