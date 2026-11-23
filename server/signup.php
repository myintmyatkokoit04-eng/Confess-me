<?php
declare(strict_types=1);

function signup_mail_config(): array {
    if(getenv('UNSAID_TEST_MAIL')==='1') return ['transport'=>'test'];
    $file=__DIR__.'/../config/mail.local.php';
    if(!is_file($file)) fail('Confirmation email is not configured yet. Please contact the site operator.',503);
    $config=require $file;
    if(!is_array($config)) fail('Confirmation email is not configured yet. Please contact the site operator.',503);
    if(($config['transport']??'smtp')==='smtp' && (!filter_var($config['username']??'',FILTER_VALIDATE_EMAIL) || str_contains($config['username'],'YOUR_') || !is_string($config['password']??null) || trim($config['password'])==='' || $config['password']==='YOUR_GOOGLE_APP_PASSWORD')) fail('Confirmation email is not configured yet. Please contact the site operator.',503);
    return $config;
}
function signup_mail(string $email,string $code,array $config): void {
    global $cfg;
    $subject='Your Unsaid confirmation code';
    $body="Your Unsaid confirmation code is: $code\n\nThis code expires in 10 minutes and can only be used once.\nIf you did not request an Unsaid account, ignore this email.\nUnsaid will never ask you to send this code to another person.";
    // A private capture transport is permitted ONLY on the disposable local DB,
    // ONLY for loopback requests and ONLY for generated .invalid test fixtures.
    if(($config['transport']??'smtp')==='test') {
        if(!str_contains($cfg['dsn'],'host=127.0.0.1;port=33317;dbname=unsaid;') || !in_array($_SERVER['REMOTE_ADDR']??'',['127.0.0.1','::1'],true) || !preg_match('/^(?:test-[ab]|ui)-[0-9]+@unsaid\.invalid$/D',$email)) throw new RuntimeException('Test transport is unavailable.');
        $dir=__DIR__.'/../.runtime/mail-test';
        if(!is_dir($dir)&&!mkdir($dir,0700,true)) throw new RuntimeException('Capture unavailable.');
        if(file_put_contents($dir.'/'.hash('sha256',$email).'.json',json_encode(['email'=>$email,'code'=>$code,'subject'=>$subject,'body'=>$body]),LOCK_EX)===false) throw new RuntimeException('Capture unavailable.');
        return;
    }
    if(($config['transport']??'smtp')!=='smtp' || !extension_loaded('openssl')) throw new RuntimeException('Secure mail is unavailable.');
    $autoload=__DIR__.'/../vendor/autoload.php';
    if(!is_file($autoload)) throw new RuntimeException('Mailer unavailable.');
    require_once $autoload;
    $mail=new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host=$config['host']??'smtp.gmail.com';
    $mail->Port=(int)($config['port']??465);
    $encryption=$config['encryption']??'ssl';
    if(!in_array($encryption,['ssl','tls'],true)) throw new RuntimeException('TLS is required.');
    $mail->SMTPSecure=$encryption;
    $mail->SMTPAuth=true;
    $mail->Username=$config['username']??'';
    $mail->Password=$config['password']??'';
    $mail->Timeout=15;
    $mail->getSMTPInstance()->Timelimit=20;
    $mail->SMTPDebug=0;
    $mail->CharSet='UTF-8';
    $mail->setFrom($config['from_email']??$mail->Username,$config['from_name']??'Unsaid');
    $mail->addAddress($email);
    $mail->Subject=$subject;
    $mail->Body=$body;
    $mail->send();
}
function signup_email_limit(string $email): void {
    $bucket=hash('sha256','signup-email:'.$email);
    $window=(int)(floor(time()/3600)*3600);
    query('INSERT INTO rate_limits(bucket,window_start,attempts) VALUES(?,?,1) ON DUPLICATE KEY UPDATE attempts=attempts+1',[$bucket,$window]);
    if((int)one('SELECT attempts FROM rate_limits WHERE bucket=? AND window_start=?',[$bucket,$window])['attempts']>5) fail('Too many confirmation emails. Please try again later.',429);
}
function signup_send(array $pending,array $mail): array {
    global $db;
    do { $code=(string)random_int(100000,999999); } while(isset($pending['code_hash']) && password_verify($code,$pending['code_hash']));
    $algorithm=in_array('argon2id',password_algos(),true)?PASSWORD_ARGON2ID:PASSWORD_DEFAULT;
    $expires=time()+600;
    query('INSERT INTO pending_signups(token,email,password_hash,language,code_hash,expires_at,last_sent_at) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE code_hash=VALUES(code_hash),expires_at=VALUES(expires_at),last_sent_at=VALUES(last_sent_at),attempts=0',[$pending['token'],$pending['email'],$pending['password_hash'],$pending['language'],password_hash($code,$algorithm),$expires,time()]);
    try { signup_mail($pending['email'],$code,$mail); }
    catch(Throwable $e) { fail('Could not send your confirmation email. Please try again later.',503); }
    return ['verification_required'=>true,'email'=>$pending['email'],'expires_in'=>600,'resend_after'=>60];
}
function signup_start(string $email,string $passwordHash,string $language): never {
    global $db;
    $mail=signup_mail_config(); signup_email_limit($email);
    $previous=isset($_SESSION['signup_token'])?one('SELECT last_sent_at FROM pending_signups WHERE token=?',[$_SESSION['signup_token']]):false;
    if($previous && time()-(int)$previous['last_sent_at']<60) fail('Please wait 60 seconds before requesting another code.',429);
    $token=bin2hex(random_bytes(32));
    $db->beginTransaction();
    if(isset($_SESSION['signup_token'])) query('DELETE FROM pending_signups WHERE token=?',[$_SESSION['signup_token']]);
    $result=signup_send(['token'=>$token,'email'=>$email,'password_hash'=>$passwordHash,'language'=>$language],$mail);
    query('DELETE FROM pending_signups WHERE expires_at<?',[time()-86400]);
    $db->commit(); $_SESSION['signup_token']=$token;
    out($result,202);
}
function signup_routes(string $path,string $method,array $data): void {
    global $db;
    if(!in_array($path,['register/verify','register/resend'],true)||$method!=='POST') return;
    limited('signup-verify',30,900);
    $token=$_SESSION['signup_token']??'';
    if(!is_string($token)||$token==='') fail('Start creating your account again to request a code.',400);
    $mail=$path==='register/resend'?signup_mail_config():null;
    $db->beginTransaction();
    $pending=one('SELECT * FROM pending_signups WHERE token=? FOR UPDATE',[$token]);
    if(!$pending) fail('Start creating your account again to request a code.',400);
    if($path==='register/resend') {
        if(time()-(int)$pending['last_sent_at']<60) fail('Please wait 60 seconds before requesting another code.',429);
        // Count sends outside the transaction so failed sends cannot evade limits.
        $db->commit(); signup_email_limit($pending['email']); $db->beginTransaction();
        $pending=one('SELECT * FROM pending_signups WHERE token=? FOR UPDATE',[$token]);
        if(!$pending) fail('Start creating your account again to request a code.',400);
        if(time()-(int)$pending['last_sent_at']<60) fail('Please wait 60 seconds before requesting another code.',429);
        $result=signup_send($pending,$mail); $db->commit(); out($result,202);
    }
    if((int)$pending['expires_at']<=time()) fail('Your confirmation code expired. Request a new code.',400);
    if((int)$pending['attempts']>=5) fail('Too many incorrect codes. Request a new code.',429);
    $code=$data['code']??'';
    if(!is_string($code)||!preg_match('/^[0-9]{6}$/D',$code)||!password_verify($code,$pending['code_hash'])) {
        query('UPDATE pending_signups SET attempts=attempts+1 WHERE token=?',[$token]); $db->commit();
        fail('The confirmation code is incorrect.',400);
    }
    if(one('SELECT id FROM users WHERE email=?',[$pending['email']])) fail('Unable to register with this email. Try signing in.',409);
    query('INSERT INTO users(email,password_hash,language,email_verified_at) VALUES(?,?,?,UTC_TIMESTAMP())',[$pending['email'],$pending['password_hash'],$pending['language']]);
    $id=(int)$db->lastInsertId();
    query('INSERT INTO reading_preferences(user_id,category_id) SELECT ?,id FROM categories',[$id]);
    query('DELETE FROM pending_signups WHERE email=?',[$pending['email']]);
    $db->commit();
    session_regenerate_id(true); unset($_SESSION['signup_token']);
    $_SESSION['uid']=$id; $_SESSION['auth_version']=0; $_SESSION['csrf']=bin2hex(random_bytes(32));
    out(['ok'=>true,'csrf'=>$_SESSION['csrf']],201);
}
