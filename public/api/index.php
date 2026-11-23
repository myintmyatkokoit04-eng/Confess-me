<?php
declare(strict_types=1);
require_once __DIR__.'/../../server/safety.php';
require_once __DIR__.'/../../server/dm.php';
require_once __DIR__.'/../../server/community.php';
require_once __DIR__.'/../../server/signup.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Unsaid-App: 1');
ini_set('session.use_strict_mode','1');
ini_set('session.use_only_cookies','1');
// Cookies are shared across ports; don't collide with other local PHP projects.
session_name('UNSAIDSESSID');
session_set_cookie_params(['httponly'=>true,'samesite'=>'Lax','secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off','path'=>'/']);
session_start();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
$_SESSION['block_key'] ??= bin2hex(random_bytes(32));
function out(mixed $data, int $code=200): never { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $message, int $code=400): never { global $db; if(isset($db) && $db->inTransaction()) $db->rollBack(); out(['error'=>$message],$code); }
function uid(): int { if (empty($_SESSION['uid'])) fail('Please sign in to continue.',401); return (int)$_SESSION['uid']; }
function query(string $sql, array $args=[]): PDOStatement { global $db; $q=$db->prepare($sql); $q->execute($args); return $q; }
function one(string $sql, array $args=[]): array|false { return query($sql,$args)->fetch(); }
function text_input(array $data,string $key,int $min,int $max): string { $v=$data[$key]??null; if (!is_string($v)) fail("Please provide $key."); $v=trim($v); if(mb_strlen($v)<$min || mb_strlen($v)>$max) fail("$key must be between $min and $max characters."); return $v; }
function limited(string $action,int $max,int $seconds=3600): void { $identity=in_array($action,['login','register','recovery','signup-verify'],true) ? ($_SERVER['REMOTE_ADDR']??'unknown') : (string)uid(); $bucket=hash('sha256',$action.':'.$identity); $window=(int)(floor(time()/$seconds)*$seconds); query('INSERT INTO rate_limits(bucket,window_start,attempts) VALUES(?,?,1) ON DUPLICATE KEY UPDATE attempts=attempts+1',[$bucket,$window]); if ((int)one('SELECT attempts FROM rate_limits WHERE bucket=? AND window_start=?',[$bucket,$window])['attempts']>$max) fail('Please take a moment before trying again.',429); if(random_int(1,100)===1) query('DELETE FROM rate_limits WHERE window_start < ?', [time()-86400]); }
function blocked(int $author): bool { return !empty($_SESSION['uid']) && (bool)one('SELECT 1 FROM blocks WHERE user_id=? AND blocked_user_id=?',[(int)$_SESSION['uid'],$author]); }
function accessible(int $id, bool $publicOnly=false): array { $p=one('SELECT p.*,c.name category FROM posts p JOIN categories c ON c.id=p.category_id WHERE p.id=?',[$id]); if(!$p) fail('Thought not found.',404); $owner=isset($_SESSION['uid']) && (int)$p['user_id']===(int)$_SESSION['uid']; $public=$p['visibility']==='public' && $p['status']==='published' && !$p['hidden'] && !blocked((int)$p['user_id']); if(($publicOnly && !$public)||(!$owner && !$public)) fail('Thought not found.',404); return $p; }
function dto(array $p): array { $id=(int)$p['id']; $user=(int)($_SESSION['uid']??0); return ['id'=>$id,'category_id'=>(int)$p['category_id'],'category'=>$p['category'],'body'=>$p['body'],'title'=>$p['title']??'','writing_kind'=>$p['writing_kind']??'short','series_id'=>(int)($p['series_id']??$id),'episode_no'=>(int)($p['episode_no']??1),'support_preference'=>$p['support_preference']??'listen','visibility'=>$p['visibility'],'status'=>$p['status'],'response'=>$p['response'],'hidden'=>(bool)$p['hidden'],'created_at'=>$p['created_at'],'is_owner'=>(int)$p['user_id']===$user,'mood'=>(int)$p['user_id']===$user?($p['mood']??''):'','safety_signals'=>$p['visibility']==='public' && $p['status']==='published' ? safety_signals(($p['title']??'').' '.$p['body']) : [],'saved'=>$user?(bool)one('SELECT 1 FROM bookmarks WHERE user_id=? AND post_id=?',[$user,$id]):false,'reactions'=>$user?query('SELECT kind FROM reactions WHERE user_id=? AND post_id=?',[$user,$id])->fetchAll(PDO::FETCH_COLUMN):[]]; }
function admin(): int { $id=uid(); if(!one('SELECT id FROM users WHERE id=? AND is_admin=1',[$id])) fail('Administrator access required.',403); return $id; }
// A custom header cannot be sent by a cross-origin form. Cross-origin fetches
// require a preflight, which this API does not allow. Also validate browser Origin.
// Logout must remain possible even when a tab holds an obsolete CSRF token.
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'
    && parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/api/logout'
    && ($_SERVER['HTTP_X_UNSAID_LOGOUT'] ?? '') === '1') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $scheme = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
    $expectedOrigin = $scheme.'://'.($_SERVER['HTTP_HOST'] ?? '');
    $allowedOrigins = [$expectedOrigin];
    // Vite proxies port 5173 to the loopback PHP server on port 8000.
    if (in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)
        && in_array($_SERVER['HTTP_HOST'] ?? '', ['127.0.0.1:8000', 'localhost:8000'], true)) {
        $allowedOrigins[] = 'http://127.0.0.1:5173';
        $allowedOrigins[] = 'http://localhost:5173';
    }
    if (($origin !== '' && !in_array($origin, $allowedOrigins, true))
        || ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
        fail('Sign out must be requested from this site.', 403);
    }
    $_SESSION = [];
    session_destroy();
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => $params['path'],
        'domain' => $params['domain'],
        'secure' => $params['secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    out(['ok' => true, 'user' => null]);
}
try {
 $configFile=__DIR__.'/../../config/local.php';
 if(!is_file($configFile)) fail('Database is not configured. Follow README.md to connect MySQL.',503);
 $cfg=require $configFile;
 $db=new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
 $db->exec("SET time_zone = '+00:00'");
 $method=$_SERVER['REQUEST_METHOD']; $path=trim(substr(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH),4),'/');
 $data=[];
 if(!in_array($method,['GET','HEAD'],true)) { if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) fail('Your session changed. Refresh and try again.',403); $raw=file_get_contents('php://input'); if(strlen($raw)>250000) fail('Request is too large.',413); if($raw!=='') { $data=json_decode($raw,true); if(!is_array($data)) fail('Invalid JSON.'); } }
 if(!empty($_SESSION['uid'])) {
  $control=one('SELECT auth_version FROM account_controls WHERE user_id=?',[(int)$_SESSION['uid']]);
  if(!one('SELECT id FROM users WHERE id=?',[(int)$_SESSION['uid']]) || (int)($control['auth_version']??0)!==(int)($_SESSION['auth_version']??0)) { $_SESSION=[]; session_regenerate_id(true); $_SESSION['csrf']=bin2hex(random_bytes(32)); out(['error'=>'Your session expired. Please sign in again.','csrf'=>$_SESSION['csrf']],401); }
 }
 signup_routes($path,$method,$data);
 community_routes($path,$method,$data);
 if($path==='session' && $method==='GET') { $u=empty($_SESSION['uid'])?false:one('SELECT email,is_admin,language FROM users WHERE id=?',[(int)$_SESSION['uid']]); out(['user'=>$u?['email'=>$u['email'],'is_admin'=>(bool)$u['is_admin'],'language'=>$u['language']]:null,'csrf'=>$_SESSION['csrf'],'categories'=>query('SELECT * FROM categories ORDER BY id')->fetchAll()]); }
 if(in_array($path,['register','login'],true) && $method==='POST') {
  limited($path,$path==='login'?15:5,900); $email=strtolower(text_input($data,'email',3,254)); if(!filter_var($email,FILTER_VALIDATE_EMAIL)) fail('Enter a valid email address.'); $password=$data['password']??null; if(!is_string($password)||mb_strlen($password)<10||mb_strlen($password)>128||str_contains($password,"\0")) fail('Password must be between 10 and 128 characters without null bytes.'); $algorithm=in_array('argon2id',password_algos(),true)?PASSWORD_ARGON2ID:PASSWORD_DEFAULT; if($algorithm===PASSWORD_DEFAULT && strlen($password)>72) fail('This server supports passwords up to 72 UTF-8 bytes.');
  if($path==='register') { if(one('SELECT id FROM users WHERE email=?',[$email])) fail('Unable to register with this email. Try signing in.',409); $language=$data['language']??'en'; if(!in_array($language,['en','my','ja'],true)) fail('Invalid language.'); signup_start($email,password_hash($password,$algorithm),$language); }
  else { $u=one('SELECT * FROM users WHERE email=?',[$email]); if(!$u || !password_verify($password,$u['password_hash'])) fail('Email or password is incorrect.',401); $id=(int)$u['id']; }
  session_regenerate_id(true); $_SESSION['uid']=$id; $_SESSION['auth_version']=(int)(one('SELECT auth_version FROM account_controls WHERE user_id=?',[$id])['auth_version']??0); $_SESSION['csrf']=bin2hex(random_bytes(32)); out(['ok'=>true,'csrf'=>$_SESSION['csrf']],$path==='register'?201:200);
 }

 if($path==='language' && $method==='PUT') { $user=uid(); $language=$data['language']??null; if(!in_array($language,['en','my','ja'],true)) fail('Invalid language.'); query('UPDATE users SET language=? WHERE id=?',[$language,$user]); out(['ok'=>true]); }
 if(preg_match('#^(posts|comments)/(\d+)/translate$#',$path,$m) && $method==='POST') {
  uid(); $target=$data['target']??null; if(!in_array($target,['en','my','ja'],true)) fail('Invalid language.');
  if($m[1]==='posts') { $p=accessible((int)$m[2],true); $body=$p['body']; }
  else { $c=one('SELECT * FROM comments WHERE id=?',[(int)$m[2]]); if(!$c || $c['hidden'] || blocked((int)$c['user_id'])) fail('Reply not found.',404); accessible((int)$c['post_id'],true); $body=$c['body']; }
  $key=$cfg['translation']['api_key']??''; if(!is_string($key)||trim($key)==='') $key=getenv('GOOGLE_TRANSLATE_API_KEY');
  if(!is_string($key)||trim($key)==='') fail('Translation is not configured yet. Ask the site operator to set up Google Cloud Translation.',503);
  limited('translation',30);
  require_once __DIR__.'/../../server/translation.php';
  try { out(google_translation($body,$target,$key)); } catch(Throwable $e) { fail('Translation is temporarily unavailable. Please try again later.',503); }
 }
 if(preg_match('#^writing-drafts/((?:new-(?:private|public)|(?:edit|episode)-[1-9][0-9]{0,19}))$#',$path,$m)) {
  $user=uid(); $key=$m[1];
  if($method==='GET') { $draft=one('SELECT payload FROM writing_drafts WHERE user_id=? AND editor_key=?',[$user,$key]); out(['draft'=>$draft?json_decode($draft['payload'],true):null]); }
  if($method==='PUT') {
   $body=text_input($data,'body',0,20000); $title=text_input($data,'title',0,120);
   $payload=$data;
   query('INSERT INTO writing_drafts(user_id,editor_key,payload) VALUES(?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)',[$user,$key,json_encode($payload,JSON_UNESCAPED_UNICODE)]);
   out(['ok'=>true]);
  }
  if($method==='DELETE') { query('DELETE FROM writing_drafts WHERE user_id=? AND editor_key=?',[$user,$key]); out(['ok'=>true]); }
 }
 if(preg_match('#^posts/(\d+)/episodes$#',$path,$m) && $method==='GET') {
  $p=accessible((int)$m[1]); $user=(int)($_SESSION['uid']??0); $series=(int)($p['series_id']??$p['id']);
  $rows=query("SELECT p.id,p.title,p.episode_no,p.status,p.visibility FROM posts p WHERE (p.series_id=? OR p.id=?) AND (p.user_id=? OR (p.visibility='public' AND p.status='published' AND p.hidden=0 AND NOT EXISTS(SELECT 1 FROM blocks b WHERE b.user_id=? AND b.blocked_user_id=p.user_id))) ORDER BY p.episode_no",[$series,$series,$user,$user])->fetchAll();
  out(['episodes'=>array_map(fn($row)=>['id'=>(int)$row['id'],'title'=>$row['title'],'episode_no'=>(int)$row['episode_no'],'status'=>$row['status'],'visibility'=>$row['visibility']],$rows)]);
 }
 dm_routes($path,$method,$data);
 if($path==='logout' && $method==='POST') { $_SESSION=[]; session_regenerate_id(true); $_SESSION['csrf']=bin2hex(random_bytes(32)); out(['ok'=>true,'csrf'=>$_SESSION['csrf']]); }
 if($path==='posts' && $method==='GET') {
  $scope=$_GET['scope']??'explore'; if(!in_array($scope,['explore','journal','mine','saved'],true)) fail('Invalid feed.'); $user=(int)($_SESSION['uid']??0); $args=[]; $where=[];
  if($scope==='journal'||$scope==='mine') { uid(); $where[]='p.user_id=?'; $args[]=$user; $where[]=$scope==='journal'?"(p.visibility='private' OR p.status='draft')":"(p.visibility='public' AND p.status='published')"; }
  else { $where[]="p.visibility='public' AND p.status='published' AND p.hidden=0"; if($scope==='saved') { uid(); $where[]='EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id=p.id AND b.user_id=?)'; $args[]=$user; } if($user) { $where[]='NOT EXISTS(SELECT 1 FROM blocks b WHERE b.user_id=? AND b.blocked_user_id=p.user_id)'; $args[]=$user; if($scope==='explore') { $where[]='EXISTS(SELECT 1 FROM reading_preferences r WHERE r.user_id=? AND r.category_id=p.category_id)'; $args[]=$user; } } }
  if(isset($_GET['category']) && $_GET['category']!=='') { $category=filter_var($_GET['category'],FILTER_VALIDATE_INT); if(!$category||$category<1||$category>5) fail('Invalid category.'); $where[]='p.category_id=?'; $args[]=$category; }
  if($scope==='journal') {
   $search=$_GET['q']??''; if(!is_string($search)||mb_strlen($search)>200) fail('Keep searches within 200 characters.');
   $search=trim($search); if($search!=='') { $where[]='(LOCATE(?,p.title)>0 OR LOCATE(?,p.body)>0)'; $args[]=$search; $args[]=$search; }
   $day=$_GET['date']??'';
   if($day!=='') {
    if(!is_string($day)||!preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/D',$day)) fail('Choose a valid date.');
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$day,new DateTimeZone('UTC'));
    if(!$date||$date->format('Y-m-d')!==$day) fail('Choose a valid date.');
    $where[]='p.created_at>=? AND p.created_at<?'; $args[]=$day.' 00:00:00'; $args[]=$date->modify('+1 day')->format('Y-m-d H:i:s');
   }
   $mood=$_GET['mood']??''; if(!is_string($mood)||!in_array($mood,['','calm','happy','sad','anxious','hopeful','overwhelmed'],true)) fail('Choose a valid mood.');
   if($mood!=='') { $where[]='p.mood=?'; $args[]=$mood; }
  }
  $offset=max(0,min(100000,(int)($_GET['offset']??0))); $sort=($_GET['sort']??'newest')==='oldest'?'ASC':'DESC';
  $rows=query('SELECT p.*,c.name category FROM posts p JOIN categories c ON c.id=p.category_id WHERE '.implode(' AND ',$where)." ORDER BY p.created_at $sort,p.id $sort LIMIT 13 OFFSET $offset",$args)->fetchAll(); $more=count($rows)>12; out(['posts'=>array_map('dto',array_slice($rows,0,12)),'has_more'=>$more]);
 }
 if($path==='posts' && $method==='POST' || preg_match('#^posts/(\d+)$#',$path,$m) && $method==='PATCH') {
  $user=uid(); $editing=$method==='PATCH'; if($editing) { $p=accessible((int)$m[1]); if((int)$p['user_id']!==$user) fail('Only the author can edit this thought.',403); } else limited('posting',30);
  $body=text_input($data,'body',1,20000); $title=text_input(['title'=>$data['title']??($editing?($p['title']??''):'')],'title',0,120); $category=filter_var($data['category_id']??null,FILTER_VALIDATE_INT); if(!$category||!one('SELECT id FROM categories WHERE id=?',[$category])) fail('Choose a category.');
  $visibility=$data['visibility']??''; $status=$data['status']??''; $response=$data['response']??''; if(!in_array($visibility,['public','private'],true)||!in_array($status,['draft','published'],true)||!in_array($response,['Just listening','Advice welcome','Comments off'],true)) fail('Choose valid publishing options.');
  $mood=$data['mood']??($editing?($p['mood']??''):''); if(!is_string($mood)||!in_array($mood,['','calm','happy','sad','anxious','hopeful','overwhelmed'],true)) fail('Choose a valid mood.');
  $kind=$data['writing_kind']??($editing?$p['writing_kind']:'short');
  if(!in_array($kind,['short','story'],true)) fail('Choose a valid writing format.');
  $support=$data['support_preference']??null;
  if($support===null) $support=['Just listening'=>'listen','Advice welcome'=>'advice','Comments off'=>'off'][$response];
  if(!in_array($support,['listen','advice','connect','off'],true)) fail('Choose a valid support preference.');
  $response=['listen'=>'Just listening','advice'=>'Advice welcome','connect'=>'Just listening','off'=>'Comments off'][$support];
  if($editing && ($p['series_id']!==null || (int)$p['episode_no']>1)) $kind='story';
  $next=$data['next_part_of']??null;
  if($next!==null && ($editing || !is_int($next) || $next<1)) fail('Choose a valid previous episode.');
  $public=$visibility==='public' && $status==='published'; $abuse=$public?abuse_guard($title.' '.$body,$data):['hold'=>false];
  $db->beginTransaction(); query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]);
  if($public) { safety_check_duplicates('posts',$user,$body,$editing?(int)$m[1]:0); }
  $series=null; $episode=1;
  if($next!==null) {
   $previous=one('SELECT * FROM posts WHERE id=? AND user_id=? FOR UPDATE',[$next,$user]);
   if(!$previous || $previous['writing_kind']!=='story') fail('Only your own story can be continued.',403);
   $series=(int)($previous['series_id']??$previous['id']); $kind='story';
   $episode=1+(int)one('SELECT MAX(episode_no) last_episode FROM posts WHERE series_id=? OR id=?',[$series,$series])['last_episode'];
  }
  if($editing) { query('UPDATE posts SET body=?,title=?,category_id=?,visibility=?,status=?,response=?,writing_kind=?,support_preference=?,mood=? WHERE id=? AND user_id=?',[$body,$title,$category,$visibility,$status,$response,$kind,$support,$mood,(int)$m[1],$user]); $id=(int)$m[1]; }
  else { query('INSERT INTO posts(user_id,body,title,category_id,visibility,status,response,writing_kind,support_preference,series_id,episode_no,mood) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',[$user,$body,$title,$category,$visibility,$status,$response,$kind,$support,$series,$episode,$mood]); $id=(int)$db->lastInsertId(); }
  if(!$editing && $kind==='story' && $series===null) query('UPDATE posts SET series_id=? WHERE id=?',[$id,$id]);
  if($public) query('UPDATE posts SET published_at=COALESCE(published_at,UTC_TIMESTAMP(6)) WHERE id=?',[$id]);
  $draftKey=$data['draft_key']??null;
  if(is_string($draftKey) && preg_match('/^(?:new-(?:private|public)|(?:edit|episode)-[1-9][0-9]{0,19})$/',$draftKey)) query('DELETE FROM writing_drafts WHERE user_id=? AND editor_key=?',[$user,$draftKey]); if($public) { abuse_hold('posts',$id,$abuse); safety_queue_review($user,'posts',$id,safety_signals($title.' '.$body)); } $db->commit(); out(['post'=>dto(accessible($id))],$editing?200:201);
 }
 if(preg_match('#^(posts|comments)/(\d+)/appeal$#',$path,$m) && $method==='POST') {
  $user=uid(); limited('appeals',5); $kind=$m[1]; $id=(int)$m[2];
  $target=one("SELECT * FROM $kind WHERE id=?",[$id]);
  if(!$target || (int)$target['user_id']!==$user || !$target['hidden']) fail('Hidden content not found.',404);
  $post=$kind==='posts'?$target:one('SELECT * FROM posts WHERE id=?',[(int)$target['post_id']]);
  if(!$post || $post['visibility']!=='public' || $post['status']!=='published') fail('Hidden content not found.',404);
  $db->beginTransaction(); query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]);
  safety_queue_review($user,$kind,$id,['author_requested_review']); $db->commit(); out(['ok'=>true]);
 }
 if(preg_match('#^posts/(\d+)$#',$path,$m)) {
  $p=accessible((int)$m[1]); if($method==='GET') out(['post'=>dto($p)]);
  if($method==='DELETE') { if((int)$p['user_id']!==uid()) fail('Only the author can delete this thought.',403); query('DELETE FROM posts WHERE id=?',[(int)$m[1]]); out(['ok'=>true]); }
 }
 if(preg_match('#^posts/(\d+)/(reactions|bookmark|comments|block|report)$#',$path,$m)) {
  $id=(int)$m[1]; $action=$m[2]; $p=accessible($id,true);
  if($action==='comments' && $method==='GET') { $user=(int)($_SESSION['uid']??0); $rows=query('SELECT c.id,c.body,c.created_at,c.user_id,c.hidden FROM comments c WHERE c.post_id=? AND (c.hidden=0 OR c.user_id=?) AND NOT EXISTS(SELECT 1 FROM blocks b WHERE b.user_id=? AND b.blocked_user_id=c.user_id) ORDER BY c.created_at,c.id',[$id,$user,$user])->fetchAll(); out(['comments'=>array_map(fn($c)=>['id'=>(int)$c['id'],'body'=>$c['body'],'created_at'=>$c['created_at'],'is_owner'=>(int)$c['user_id']===$user,'hidden'=>(bool)$c['hidden'],'safety_signals'=>safety_signals($c['body'])],$rows)]); }
  $user=uid();
  if($action==='reactions' && $method==='POST') { $kind=$data['kind']??''; if(!in_array($kind,['understand','me_too'],true)) fail('Invalid reaction.'); $db->beginTransaction(); query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]); if(one('SELECT 1 FROM reactions WHERE user_id=? AND post_id=? AND kind=?',[$user,$id,$kind])) query('DELETE FROM reactions WHERE user_id=? AND post_id=? AND kind=?',[$user,$id,$kind]); else query('INSERT INTO reactions VALUES(?,?,?)',[$user,$id,$kind]); $db->commit(); out(['post'=>dto($p)]); }
  if($action==='bookmark' && $method==='POST') { $db->beginTransaction(); query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]); if(one('SELECT 1 FROM bookmarks WHERE user_id=? AND post_id=?',[$user,$id])) query('DELETE FROM bookmarks WHERE user_id=? AND post_id=?',[$user,$id]); else query('INSERT INTO bookmarks VALUES(?,?)',[$user,$id]); $db->commit(); out(['post'=>dto($p)]); }
  if($action==='comments' && $method==='POST') { limited('comments',60); $body=text_input($data,'body',1,2000); $abuse=abuse_guard($body,$data); $db->beginTransaction(); query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]); safety_reply_burst($user); safety_check_duplicates('comments',$user,$body); $current=one('SELECT * FROM posts WHERE id=? FOR UPDATE',[$id]); if(!$current || $current['response']!=='Advice welcome' || $current['hidden'] || $current['visibility']!=='public' || $current['status']!=='published') fail('Replies are closed for this thought.',403); if(one('SELECT 1 FROM blocks WHERE user_id=? AND blocked_user_id=?',[(int)$current['user_id'],$user])) fail('Replies are closed for this thought.',403); query('INSERT INTO comments(user_id,post_id,body) VALUES(?,?,?)',[$user,$id,$body]); $commentId=(int)$db->lastInsertId(); abuse_hold('comments',$commentId,$abuse); safety_queue_review($user,'comments',$commentId,safety_signals($body)); $db->commit(); out(['ok'=>true,'held_for_review'=>$abuse['hold']],201); }
  if($action==='block' && $method==='POST') { if((int)$p['user_id']===$user) fail('You cannot block yourself.'); query('INSERT IGNORE INTO blocks(user_id,blocked_user_id) VALUES(?,?)',[$user,(int)$p['user_id']]); out(['ok'=>true]); }
  if($action==='report' && $method==='POST') { limited('reports',15); query('INSERT INTO reports(user_id,post_id,reason) VALUES(?,?,?)',[$user,$id,text_input($data,'reason',3,1000)]); out(['ok'=>true],201); }
 }
 if(preg_match('#^comments/(\d+)(?:/(report|block))?$#',$path,$m)) {
  $user=uid(); $c=one('SELECT * FROM comments WHERE id=?',[(int)$m[1]]); if(!$c) fail('Reply not found.',404); accessible((int)$c['post_id'],true);
  if($method==='DELETE' && empty($m[2])) { if((int)$c['user_id']!==$user) fail('Only the author can delete this reply.',403); query('DELETE FROM comments WHERE id=?',[(int)$m[1]]); out(['ok'=>true]); }
  if($c['hidden']||blocked((int)$c['user_id'])) fail('Reply not found.',404);
  if($method==='POST' && ($m[2]??'')==='report') { limited('reports',15); query('INSERT INTO reports(user_id,comment_id,reason) VALUES(?,?,?)',[$user,(int)$m[1],text_input($data,'reason',3,1000)]); out(['ok'=>true],201); }
  if($method==='POST' && ($m[2]??'')==='block') { if((int)$c['user_id']===$user) fail('You cannot block yourself.'); query('INSERT IGNORE INTO blocks(user_id,blocked_user_id) VALUES(?,?)',[$user,(int)$c['user_id']]); out(['ok'=>true]); }
 }
 if($path==='preferences') { $user=uid(); if($method==='GET') out(['categories'=>array_map('intval',query('SELECT category_id FROM reading_preferences WHERE user_id=?',[$user])->fetchAll(PDO::FETCH_COLUMN))]); if($method==='PUT') { $ids=$data['categories']??null; if(!is_array($ids)||count($ids)>5) fail('Invalid preferences.'); foreach($ids as $id) if(!is_int($id)||$id<1||$id>5) fail('Invalid category.'); $db->beginTransaction(); query('DELETE FROM reading_preferences WHERE user_id=?',[$user]); foreach(array_unique($ids) as $id) query('INSERT INTO reading_preferences VALUES(?,?)',[$user,$id]); $db->commit(); out(['ok'=>true]); } }
 if($path==='blocks' && $method==='GET') { $user=uid(); $rows=query('SELECT blocked_user_id,created_at FROM blocks WHERE user_id=? ORDER BY created_at',[$user])->fetchAll(); out(['blocks'=>array_map(fn($b)=>['token'=>hash_hmac('sha256',(string)$b['blocked_user_id'],$_SESSION['block_key']),'created_at'=>$b['created_at']],$rows)]); }
 if($path==='blocks' && $method==='DELETE') { $user=uid(); $token=text_input($data,'token',64,64); foreach(query('SELECT blocked_user_id FROM blocks WHERE user_id=?',[$user])->fetchAll(PDO::FETCH_COLUMN) as $id) if(hash_equals(hash_hmac('sha256',(string)$id,$_SESSION['block_key']),$token)) { query('DELETE FROM blocks WHERE user_id=? AND blocked_user_id=?',[$user,$id]); out(['ok'=>true]); } fail('Blocked account not found.',404); }
 if($path==='admin/reports' && $method==='GET') { admin(); $rows=query("SELECT r.id,r.reason,r.status,r.created_at,r.post_id,r.comment_id,p.body post_body,p.hidden post_hidden,c.body comment_body,c.hidden comment_hidden FROM reports r LEFT JOIN comments c ON c.id=r.comment_id JOIN posts p ON p.id=COALESCE(r.post_id,c.post_id) WHERE p.visibility='public' AND p.status='published' ORDER BY r.created_at DESC LIMIT 200")->fetchAll(); out(['reports'=>$rows]); }
 if(preg_match('#^admin/reports/(\d+)$#',$path,$m) && $method==='POST') { $user=admin(); $r=one("SELECT r.*,p.id target_post,p.visibility,p.status publication_status FROM reports r LEFT JOIN comments c ON c.id=r.comment_id JOIN posts p ON p.id=COALESCE(r.post_id,c.post_id) WHERE r.id=?",[(int)$m[1]]); if(!$r||$r['visibility']!=='public'||$r['publication_status']!=='published') fail('Report not found.',404); $action=$data['action']??''; if(!in_array($action,['hide','restore','dismiss'],true)) fail('Invalid action.'); $db->beginTransaction(); if($action!=='dismiss') { $table=$r['comment_id']?'comments':'posts'; $target=$r['comment_id']?:$r['post_id']; query("UPDATE $table SET hidden=? WHERE id=?",[$action==='hide'?1:0,$target]); } query("UPDATE reports SET status='resolved' WHERE id=?",[(int)$m[1]]); query('INSERT INTO moderation_actions(admin_id,report_id,action) VALUES(?,?,?)',[$user,(int)$m[1],$action]); $db->commit(); out(['ok'=>true]); }
 fail('Endpoint not found.',404);
} catch(PDOException $e) { if(isset($db)&&$db->inTransaction()) $db->rollBack(); error_log('Unsaid database error: '.$e->getCode()); fail('The service is temporarily unavailable. Please try again later.',503); }
catch(Throwable $e) { if(isset($db)&&$db->inTransaction()) $db->rollBack(); error_log('Unsaid server error: '.get_class($e)); fail('Something went wrong. Please try again.',500); }
