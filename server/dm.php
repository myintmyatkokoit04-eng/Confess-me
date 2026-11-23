<?php
declare(strict_types=1);

function dm_profile(int $user): array {
    $profile = one('SELECT contact_code,requests_enabled FROM dm_profiles WHERE user_id=?', [$user]);
    if (!$profile) {
        query('INSERT IGNORE INTO dm_profiles(user_id,contact_code) VALUES(?,?)', [$user, strtoupper(bin2hex(random_bytes(8)))]);
        $profile = one('SELECT contact_code,requests_enabled FROM dm_profiles WHERE user_id=?', [$user]);
    }
    if (!$profile) fail('Messaging is temporarily unavailable.', 503);
    return ['contact_code'=>$profile['contact_code'], 'requests_enabled'=>(bool)$profile['requests_enabled']];
}
function dm_peer(array $conversation, int $user): int {
    return (int)$conversation['user_low'] === $user ? (int)$conversation['user_high'] : (int)$conversation['user_low'];
}
function dm_blocked(int $a, int $b): bool {
    return (bool)one('SELECT 1 FROM blocks WHERE (user_id=? AND blocked_user_id=?) OR (user_id=? AND blocked_user_id=?)', [$a,$b,$b,$a]);
}
function dm_lock_users(int $a, int $b): void {
    query('SELECT id FROM users WHERE id IN (?,?) ORDER BY id FOR UPDATE', [min($a,$b),max($a,$b)])->fetchAll();
}
function dm_conversation(string $token, int $user, bool $lock=false): array {
    if (!preg_match('/^[a-f0-9]{32}$/D', $token)) fail('Conversation not found.', 404);
    $c = one('SELECT * FROM dm_conversations WHERE token=? AND (user_low=? OR user_high=?)'.($lock?' FOR UPDATE':''), [$token,$user,$user]);
    if (!$c) fail('Conversation not found.', 404);
    return $c;
}
function dm_dto(array $c, int $user): array {
    $readColumn = (int)$c['user_low']===$user ? 'read_low' : 'read_high';
    $last = one('SELECT id,body,created_at FROM dm_messages WHERE conversation_id=? ORDER BY id DESC LIMIT 1', [(int)$c['id']]);
    return [
        'token'=>$c['token'], 'status'=>$c['status'],
        'incoming'=>(int)$c['initiator_id']!==$user,
        'blocked'=>dm_blocked($user,dm_peer($c,$user)),
        'blocked_by_me'=>blocked(dm_peer($c,$user)),
        'unread'=>(int)one('SELECT COUNT(*) total FROM dm_messages WHERE conversation_id=? AND sender_id<>? AND id>?', [(int)$c['id'],$user,(int)$c[$readColumn]])['total'],
        'preview'=>$last ? mb_substr($last['body'],0,100) : '',
        'updated_at'=>$c['updated_at'],
    ];
}
function dm_message_dto(array $message, int $user): array {
    return ['id'=>(int)$message['id'], 'body'=>$message['body'], 'is_mine'=>(int)$message['sender_id']===$user, 'created_at'=>$message['created_at'], 'safety_signals'=>safety_signals($message['body'])];
}
function dm_insert_message(array $c, int $user, string $body, array $data): array {
    abuse_guard($body,$data,true);
    limited('dm_messages',60);
    $bucket = hash('sha256','dm-burst:'.$user); $now=time();
    if ((int)one('SELECT COALESCE(SUM(attempts),0) total FROM rate_limits WHERE bucket=? AND window_start>?',[$bucket,$now-60])['total']>=6) fail('Please take a moment before trying again.',429);
    $rows = query('SELECT body FROM dm_messages WHERE sender_id=? AND created_at >= UTC_TIMESTAMP() - INTERVAL 10 MINUTE ORDER BY id DESC LIMIT 100',[$user])->fetchAll();
    $same=0; foreach($rows as $row) if(safety_normalize($row['body'])===safety_normalize($body)) $same++;
    if($same>=2) fail('Please wait before sending the same message again.',429);
    query('INSERT INTO rate_limits(bucket,window_start,attempts) VALUES(?,?,1) ON DUPLICATE KEY UPDATE attempts=attempts+1',[$bucket,$now]);
    query('INSERT INTO dm_messages(conversation_id,sender_id,body) VALUES(?,?,?)',[(int)$c['id'],$user,$body]);
    global $db; $id=(int)$db->lastInsertId();
    query('UPDATE dm_conversations SET updated_at=UTC_TIMESTAMP() WHERE id=?',[(int)$c['id']]);
    return dm_message_dto(one('SELECT * FROM dm_messages WHERE id=?',[$id]),$user);
}

function dm_routes(string $path, string $method, array $data): void {
    if(preg_match('#^posts/(\d+)/dm-conversation$#',$path,$m) && $method==='GET') {
        $user=uid(); $post=accessible((int)$m[1],true); $peer=(int)$post['user_id'];
        if($peer===$user) fail('You cannot message yourself.');
        $conversation=one('SELECT token FROM dm_conversations WHERE user_low=? AND user_high=?',[min($user,$peer),max($user,$peer)]);
        out(['conversation'=>$conversation?['token'=>$conversation['token']]:null]);
    }
    if ($path==='dm/profile') {
        $user=uid();
        if($method==='GET') out(['profile'=>dm_profile($user)]);
        if($method==='PUT') {
            if(!is_bool($data['requests_enabled']??null)) fail('Choose valid messaging options.');
            global $db; $db->beginTransaction();
            query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]);
            dm_profile($user);
            query('UPDATE dm_profiles SET requests_enabled=? WHERE user_id=?',[$data['requests_enabled']?1:0,$user]);
            $db->commit();
            out(['profile'=>dm_profile($user)]);
        }
    }
    if($path==='dm/conversations' && $method==='GET') {
        $user=uid(); $offset=max(0,min(100000,(int)($_GET['offset']??0)));
        $rows=query("SELECT * FROM dm_conversations WHERE user_low=? OR user_high=? ORDER BY updated_at DESC,id DESC LIMIT 31 OFFSET $offset",[$user,$user])->fetchAll();
        out(['conversations'=>array_map(fn($c)=>dm_dto($c,$user),array_slice($rows,0,30)), 'has_more'=>count($rows)>30]);
    }
    if($path==='dm/conversations' && $method==='POST') {
        $user=uid(); $body=text_input($data,'body',1,2000); $peer=0;
        if(isset($data['post_id'])) {
            $id=filter_var($data['post_id'],FILTER_VALIDATE_INT);
            if(!$id) fail('Thought not found.',404);
            $post=accessible($id,true); $peer=(int)$post['user_id'];
        } elseif(isset($data['contact_code'])) {
            $rawCode=$data['contact_code']??null;
            if(!is_string($rawCode) || !preg_match('/^[a-fA-F0-9]{16}$/D',trim($rawCode))) fail('Enter a valid DM code.');
            $code=strtoupper(trim($rawCode));
            limited('dm_code_lookup',30);
            $profile=one('SELECT user_id FROM dm_profiles WHERE contact_code=?',[$code]);
            if(!$profile) fail('This account is not accepting message requests.',404);
            $peer=(int)$profile['user_id'];
        } else fail('Provide a DM code or a public post.');
        if($peer===$user) fail('You cannot message yourself.');
        global $db; $db->beginTransaction(); dm_lock_users($user,$peer);
        if(dm_blocked($user,$peer)) fail('This conversation is unavailable.',403);
        $c=one('SELECT * FROM dm_conversations WHERE user_low=? AND user_high=? FOR UPDATE',[min($user,$peer),max($user,$peer)]);
        if($c && $c['status']!=='accepted') fail('A message request already exists. Open it from Messages.',409);
        if(!$c) {
            if(!dm_profile($peer)['requests_enabled']) fail('This account is not accepting message requests.',403);
            limited('dm_requests',5);
            $token=bin2hex(random_bytes(16));
            query('INSERT INTO dm_conversations(token,user_low,user_high,initiator_id) VALUES(?,?,?,?)',[$token,min($user,$peer),max($user,$peer),$user]);
            $c=dm_conversation($token,$user,true);
        }
        $message=dm_insert_message($c,$user,$body,$data); $db->commit();
        out(['conversation'=>dm_dto($c,$user),'message'=>$message],201);
    }
    if(preg_match('#^dm/conversations/([a-f0-9]{32})(?:/(messages|accept|decline|read|block|unblock))?$#',$path,$m)) {
        $user=uid(); $c=dm_conversation($m[1],$user); $action=$m[2]??'';
        if($method==='GET' && $action==='') out(['conversation'=>dm_dto($c,$user)]);
        if($method==='GET' && $action==='messages') {
            $before=max(0,(int)($_GET['before']??0)); $after=max(0,(int)($_GET['after']??0));
            if($before && $after) fail('Choose one message cursor.');
            $where='conversation_id=?'; $args=[(int)$c['id']]; $order=$after?'ASC':'DESC';
            if($before) {$where.=' AND id<?';$args[]=$before;}
            if($after) {$where.=' AND id>?';$args[]=$after;}
            $rows=query("SELECT * FROM dm_messages WHERE $where ORDER BY id $order LIMIT 51",$args)->fetchAll();
            $more=count($rows)>50; $rows=array_slice($rows,0,50); if(!$after) $rows=array_reverse($rows);
            out(['conversation'=>dm_dto($c,$user),'messages'=>array_map(fn($r)=>dm_message_dto($r,$user),$rows),'has_more'=>$more]);
        }
        if($method==='POST') {
            global $db; $db->beginTransaction(); $peer=dm_peer($c,$user); dm_lock_users($user,$peer); $c=dm_conversation($m[1],$user,true);
            if($action==='block'||$action==='unblock') {
                if($action==='block') query('INSERT IGNORE INTO blocks(user_id,blocked_user_id) VALUES(?,?)',[$user,$peer]);
                else query('DELETE FROM blocks WHERE user_id=? AND blocked_user_id=?',[$user,$peer]);
                $db->commit(); out(['conversation'=>dm_dto($c,$user)]);
            }
            if($action==='read') {
                $last=filter_var($data['last_id']??null,FILTER_VALIDATE_INT);
                if(!$last || !one('SELECT id FROM dm_messages WHERE id=? AND conversation_id=?',[$last,(int)$c['id']])) fail('Message not found.',404);
                $column=(int)$c['user_low']===$user?'read_low':'read_high';
                query("UPDATE dm_conversations SET $column=GREATEST($column,?) WHERE id=?",[$last,(int)$c['id']]);
                $db->commit(); out(['ok'=>true]);
            }
            if(dm_blocked($user,$peer)) fail('This conversation is unavailable.',403);
            if($action==='accept'||$action==='decline') {
                if((int)$c['initiator_id']===$user || $c['status']!=='pending') fail('Only the recipient can respond to a pending request.',403);
                query('UPDATE dm_conversations SET status=?,updated_at=UTC_TIMESTAMP() WHERE id=?',[$action==='accept'?'accepted':'declined',(int)$c['id']]);
                $db->commit(); out(['conversation'=>dm_dto(dm_conversation($m[1],$user),$user)]);
            }
            if($action==='messages') {
                if($c['status']!=='accepted') fail('Wait until the message request is accepted.',403);
                $message=dm_insert_message($c,$user,text_input($data,'body',1,2000),$data);
                $db->commit(); out(['message'=>$message],201);
            }
            $db->rollBack();
        }
    }
    if(preg_match('#^dm/messages/(\d+)/report$#',$path,$m) && $method==='POST') {
        $user=uid(); $message=one('SELECT m.*,c.token FROM dm_messages m JOIN dm_conversations c ON c.id=m.conversation_id WHERE m.id=? AND (c.user_low=? OR c.user_high=?)',[(int)$m[1],$user,$user]);
        if(!$message) fail('Message not found.',404);
        if((int)$message['sender_id']===$user) fail('You cannot report your own message.');
        limited('dm_reports',15); $reason=text_input($data,'reason',3,1000);
        query('INSERT IGNORE INTO dm_reports(user_id,message_id,reason) VALUES(?,?,?)',[$user,(int)$message['id'],$reason]);
        out(['ok'=>true],201);
    }
    if($path==='admin/dm-reports' && $method==='GET') {
        admin(); $offset=max(0,min(100000,(int)($_GET['offset']??0)));
        // Only explicitly reported messages, never the rest of the private thread.
        $rows=query("SELECT r.id,r.reason,r.status,r.action,r.created_at,m.body FROM dm_reports r JOIN dm_messages m ON m.id=r.message_id ORDER BY r.created_at DESC,r.id DESC LIMIT 31 OFFSET $offset")->fetchAll();
        out(['reports'=>array_slice($rows,0,30),'has_more'=>count($rows)>30]);
    }
    if(preg_match('#^admin/dm-reports/(\d+)$#',$path,$m) && $method==='POST') {
        $user=admin(); $action=$data['action']??'';
        if(!in_array($action,['dismiss','close'],true)) fail('Invalid action.');
        global $db; $db->beginTransaction();
        $report=one('SELECT r.*,m.conversation_id FROM dm_reports r JOIN dm_messages m ON m.id=r.message_id WHERE r.id=? FOR UPDATE',[(int)$m[1]]);
        if(!$report) fail('Report not found.',404);
        if($report['status']!=='open') fail('This report has already been reviewed.',409);
        if($action==='close') query("UPDATE dm_conversations SET status='closed',updated_at=UTC_TIMESTAMP() WHERE id=?",[(int)$report['conversation_id']]);
        query("UPDATE dm_reports SET status='resolved',action=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP() WHERE id=?",[$action,$user,(int)$report['id']]);
        $db->commit(); out(['ok'=>true]);
    }
}
