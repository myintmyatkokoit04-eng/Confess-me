<?php
declare(strict_types=1);

function account_controls(int $user): array {
    query('INSERT IGNORE INTO account_controls(user_id) VALUES(?)',[$user]);
    return one('SELECT * FROM account_controls WHERE user_id=?',[$user]);
}
function account_password(array $data, int $user): void {
    $password=$data['current_password']??null;
    $row=one('SELECT password_hash FROM users WHERE id=?',[$user]);
    if(!is_string($password) || !$row || !password_verify($password,$row['password_hash'])) fail('Current password is incorrect.',403);
}
function new_password_hash(array $data): string {
    $password=$data['password']??null;
    if(!is_string($password)||mb_strlen($password)<10||mb_strlen($password)>128||str_contains($password,"\0")) fail('Password must be between 10 and 128 characters without null bytes.');
    $algorithm=in_array('argon2id',password_algos(),true)?PASSWORD_ARGON2ID:PASSWORD_DEFAULT;
    if($algorithm===PASSWORD_DEFAULT && strlen($password)>72) fail('This server supports passwords up to 72 UTF-8 bytes.');
    return password_hash($password,$algorithm);
}
function community_routes(string $path,string $method,array $data): void {
    global $db;
    if($path==='account/recover' && $method==='POST') {
        limited('recovery',10,900);
        $email=strtolower(text_input($data,'email',3,254));
        $code=text_input($data,'recovery_code',1,100);
        $hash=new_password_hash($data);
        $db->beginTransaction();
        $row=one('SELECT u.id,a.recovery_hash FROM users u JOIN account_controls a ON a.user_id=u.id WHERE u.email=? FOR UPDATE',[$email]);
        if(!$row || !$row['recovery_hash'] || !hash_equals($row['recovery_hash'],hash('sha256',$code))) fail('Email or recovery code is incorrect.',400);
        query('UPDATE users SET password_hash=? WHERE id=?',[$hash,$row['id']]);
        query('UPDATE account_controls SET recovery_hash=NULL,auth_version=auth_version+1 WHERE user_id=?',[$row['id']]);
        $db->commit(); out(['ok'=>true]);
    }
    if($path==='account/controls') {
        $user=uid(); $row=account_controls($user);
        if($method==='GET') out(['recovery_ready'=>$row['recovery_hash']!==null,'notify_replies'=>(bool)$row['notify_replies'],'notify_messages'=>(bool)$row['notify_messages'],'notify_stories'=>(bool)$row['notify_stories']]);
        if($method==='PUT') {
            foreach(['notify_replies','notify_messages','notify_stories'] as $key) if(!isset($data[$key])||!is_bool($data[$key])) fail('Invalid notification preferences.');
            query('UPDATE account_controls SET notify_replies=?,notify_messages=?,notify_stories=? WHERE user_id=?',[(int)$data['notify_replies'],(int)$data['notify_messages'],(int)$data['notify_stories'],$user]); out(['ok'=>true]);
        }
    }
    if($path==='account/recovery-code' && $method==='POST') {
        $user=uid(); limited('account-security',15,900);
        $db->beginTransaction(); query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]); account_password($data,$user); account_controls($user);
        $code=bin2hex(random_bytes(24));
        query('UPDATE account_controls SET recovery_hash=? WHERE user_id=?',[hash('sha256',$code),$user]);
        $db->commit();
        out(['recovery_code'=>$code]);
    }
    if($path==='account/password' && $method==='POST') {
        $user=uid(); limited('account-security',15,900); $hash=new_password_hash($data);
        $db->beginTransaction(); query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]); account_password($data,$user); account_controls($user);
        query('UPDATE users SET password_hash=? WHERE id=?',[$hash,$user]);
        query('UPDATE account_controls SET auth_version=auth_version+1 WHERE user_id=?',[$user]);
        $_SESSION['auth_version']=(int)one('SELECT auth_version FROM account_controls WHERE user_id=?',[$user])['auth_version'];
        $db->commit(); session_regenerate_id(true); $_SESSION['csrf']=bin2hex(random_bytes(32)); out(['ok'=>true,'csrf'=>$_SESSION['csrf']]);
    }
    if($path==='account/export' && $method==='GET') {
        $user=uid();
        out(['exported_at'=>gmdate('c'),'entries'=>query('SELECT title,body,visibility,status,writing_kind,episode_no,created_at,updated_at FROM posts WHERE user_id=? ORDER BY id',[$user])->fetchAll(),'drafts'=>array_map(fn($row)=>['editor_key'=>$row['editor_key'],'draft'=>json_decode($row['payload'],true),'updated_at'=>$row['updated_at']],query('SELECT editor_key,payload,updated_at FROM writing_drafts WHERE user_id=?',[$user])->fetchAll())]);
    }
    if($path==='account' && $method==='DELETE') {
        $user=uid(); limited('account-security',15,900);
        if(($data['confirmation']??'')!=='DELETE') fail('Type DELETE to confirm.');
        $db->beginTransaction(); query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]); account_password($data,$user);
        query('DELETE FROM moderation_actions WHERE admin_id=?',[$user]);
        query('DELETE FROM users WHERE id=?',[$user]); $db->commit();
        $_SESSION=[]; session_regenerate_id(true); $_SESSION['csrf']=bin2hex(random_bytes(32)); out(['ok'=>true,'csrf'=>$_SESSION['csrf']]);
    }
    if(preg_match('#^posts/(\d+)/follow$#',$path,$m)) {
        $user=uid(); $post=accessible((int)$m[1],true);
        if($post['writing_kind']!=='story') fail('Only stories can be followed.');
        $series=(int)($post['series_id']??$post['id']);
        $root=accessible($series,true);
        if((int)$root['user_id']===$user) fail('This is your own story.');
        if($method==='POST') query('INSERT IGNORE INTO story_follows(user_id,series_id) VALUES(?,?)',[$user,$series]);
        if($method==='DELETE') query('DELETE FROM story_follows WHERE user_id=? AND series_id=?',[$user,$series]);
        out(['following'=>(bool)one('SELECT 1 FROM story_follows WHERE user_id=? AND series_id=?',[$user,$series])]);
    }
    if($path==='notifications') {
        $user=uid(); $settings=account_controls($user);
        if($method==='POST') { query('UPDATE account_controls SET read_at=UTC_TIMESTAMP(6),read_reply=(SELECT COALESCE(MAX(id),0) FROM comments),read_message=(SELECT COALESCE(MAX(id),0) FROM dm_messages) WHERE user_id=?',[$user]); out(['ok'=>true]); }
        if($method==='GET') {
            $items=[];
            if($settings['notify_replies']) foreach(query("SELECT c.id,c.post_id,c.created_at FROM comments c JOIN posts p ON p.id=c.post_id WHERE p.user_id=? AND c.user_id<>? AND c.hidden=0 AND p.hidden=0 AND p.visibility='public' AND p.status='published' AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.blocked_user_id=c.user_id) OR (b.user_id=c.user_id AND b.blocked_user_id=?)) ORDER BY c.id DESC LIMIT 50",[$user,$user,$user,$user])->fetchAll() as $row) $items[]=['key'=>'reply-'.$row['id'],'kind'=>'reply','target'=>'post/'.$row['post_id'],'created_at'=>$row['created_at']];
            if($settings['notify_stories']) foreach(query("SELECT p.id,p.published_at created_at,p.episode_no FROM story_follows f JOIN posts root ON root.id=f.series_id JOIN posts p ON p.series_id=f.series_id WHERE f.user_id=? AND p.id<>f.series_id AND p.published_at>f.followed_at AND p.visibility='public' AND p.status='published' AND p.hidden=0 AND root.visibility='public' AND root.status='published' AND root.hidden=0 AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.blocked_user_id=p.user_id) OR (b.user_id=p.user_id AND b.blocked_user_id=?)) ORDER BY p.created_at DESC,p.id DESC LIMIT 50",[$user,$user,$user])->fetchAll() as $row) $items[]=['key'=>'story-'.$row['id'],'kind'=>'story','target'=>'post/'.$row['id'],'created_at'=>$row['created_at']];
            if($settings['notify_messages']) foreach(query("SELECT * FROM dm_conversations WHERE (user_low=? OR user_high=?) AND status IN ('pending','accepted') ORDER BY updated_at DESC LIMIT 50",[$user,$user])->fetchAll() as $c) {
                if(dm_blocked($user,dm_peer($c,$user))) continue;
                $column=(int)$c['user_low']===$user?'read_low':'read_high';
                $last=one('SELECT id,created_at FROM dm_messages WHERE conversation_id=? AND sender_id<>? AND id>? ORDER BY id DESC LIMIT 1',[(int)$c['id'],$user,(int)$c[$column]]);
                if($last) $items[]=['key'=>'message-'.$last['id'],'kind'=>$c['status']==='pending'?'request':'message','target'=>'messages/'.$c['token'],'created_at'=>$last['created_at']];
            }
            usort($items,fn($a,$b)=>strcmp($b['created_at'],$a['created_at'])?:strcmp($b['key'],$a['key']));
            $items=array_slice($items,0,100);
            foreach($items as &$item) {
                $id=(int)substr($item['key'],strrpos($item['key'],'-')+1);
                $item['unread']=match($item['kind']) {
                    'reply'=>$id>(int)$settings['read_reply'],
                    'message','request'=>$id>(int)$settings['read_message'],
                    default=>$settings['read_at']===null || $item['created_at']>$settings['read_at']
                };
            } unset($item);
            out(['notifications'=>$items,'unread'=>count(array_filter($items,fn($item)=>$item['unread']))]);
        }
    }
}
