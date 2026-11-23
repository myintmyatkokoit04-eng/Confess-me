<?php
declare(strict_types=1);

// Local, explainable signals: warnings request review, never establish guilt.
function safety_signals(string $body): array {
    $text = mb_strtolower($body, 'UTF-8');
    $has = fn(string $pattern): bool => preg_match($pattern, $text) === 1;
    $money = $has('/\b(money|payment|cash|gift cards?|bitcoin|crypto|bank account)\b|お金|送金|振込|口座|ギフトカード|ငွေ|ဘဏ်|လက်ဆောင်ကတ်/u');
    $request = $has('/\b(send|transfer|pay|deposit|wire)\b|送って|送金して|振り込|支払って|入金して|ငွေလွှဲ|ငွေပို့|ပေးပါ/u');
    $investment = $has('/\b(invest(?:ment|ing)?|trading|crypto|bitcoin)\b|投資|暗号資産|仮想通貨|ရင်းနှီးမြှုပ်နှံ/u');
    $promise = $has('/guaranteed|risk[- ]free|double your|easy profit|\bjoin\b|絶対|必ず儲|元本保証|参加して|အမြတ်သေချာ|အရှုံးမရှိ/u');
    $contact = $has('/(?<![a-z0-9])(?:line|telegram|whatsapp)(?![a-z0-9])|line\.me|t\.me|wa\.me/u');
    $invite = $has('/\b(add|contact|message|chat|dm|join)\b|追加して|連絡して|話そう|メッセージ|ဆက်သွယ်|လာပြော|အက်/u');
    $signals = [];
    if ($money && $request) $signals[] = 'money_request';
    if ($investment && $promise) $signals[] = 'investment_pitch';
    if ($contact && $invite) $signals[] = 'off_platform';
    return array_values(array_unique(array_merge($signals, abuse_check($body)['signals'])));
}

// Conservative local rules, not a contextual AI classifier. Reports/quotations
// receive review rather than being treated as proven misconduct.
function abuse_check(string $body): array {
    $text = mb_strtolower(preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $body), 'UTF-8');
    $rules = [
        'targeted_abuse' => '/\b(?:you(?:\x{27}re| are)?|u r)\s+(?:an?\s+)?(?:fucking\s+)?(?:idiot|moron|worthless|stupid|loser)\b|\b(?:shut the fuck up|kill yourself|go die)\b|お前.{0,8}(?:バカ|馬鹿|クズ)|死ね|နင်.{0,15}(?:အသုံးမကျ|အရူး)|မင်း.{0,15}(?:အသုံးမကျ|အရူး)|\b(?:nin|min)\s+(?:a yuu|a yoo|thone ma kya)\b/u',
        'violence_threat' => '/\b(?:i(?:\x{27}ll| will)|we(?:\x{27}ll| will))\s+(?:kill|stab|shoot|murder)\s+(?:you|him|her|them)\b|\b(?:let\x{27}s|go)\s+(?:kill|stab|shoot)\s+(?:him|her|them)\b|(?:お前|あなた|あいつ).{0,8}(?:殺す|刺す)|(?:မင်း|နင်).{0,12}သတ်ပစ်မယ်|\b(?:nin|min)\s+ko\s+that\s+(?:pit|pyit)\s+mal\b/u',
        'personal_info_attack' => '/(?:\b(?:his|her|their)\s+(?:address|phone number)\b|住所|ဖုန်းနံပါတ်).{0,100}(?:\b(?:attack|hurt|harass|go after)\b|襲|嫌がらせ|သွားရိုက်)/us',
    ];
    $signals = []; $matches = [];
    foreach ($rules as $kind => $pattern) {
        if (preg_match($pattern, $text, $match) === 1) { $signals[] = $kind; $matches[] = mb_substr($match[0], 0, 120); }
    }
    return ['signals'=>$signals,'matches'=>$matches,'hold'=>(bool)array_intersect($signals,['violence_threat','personal_info_attack'])];
}

function abuse_guard(string $body, array $data, bool $privateMessage = false): array {
    $result = abuse_check($body);
    // Never deliver a severe match privately or send private text to moderators
    // automatically. The sender can edit; explicit recipient reports still work.
    if ($privateMessage && $result['hold']) fail('This message may contain a threat or targeted personal information. Please edit it before sending.',422);
    if ($result['signals'] && !$result['hold'] && ($data['acknowledge_abuse']??false)!==true) {
        global $db;
        if (isset($db) && $db->inTransaction()) $db->rollBack();
        out(['error'=>'This wording may hurt someone. Please review it before sharing.','code'=>'review_wording','matches'=>$result['matches']],422);
    }
    return $result;
}

function abuse_hold(string $kind, int $id, array $result): void {
    if ($result['hold']) {
        if (!in_array($kind,['posts','comments'],true)) throw new InvalidArgumentException('Invalid target');
        query("UPDATE $kind SET hidden=1 WHERE id=?",[$id]);
    }
}

function safety_normalize(string $body): string {
    return mb_strtolower(preg_replace('/[\s\p{Z}\x{200B}\x{200C}\x{200D}\x{FEFF}]+/u', '', trim($body)), 'UTF-8');
}

function safety_reply_burst(int $user): void {
    $bucket = hash('sha256', 'safety-comments:'.$user);
    $now = time();
    $count = (int)one('SELECT COALESCE(SUM(attempts),0) total FROM rate_limits WHERE bucket=? AND window_start>?', [$bucket, $now - 60])['total'];
    if ($count >= 6) fail('Please take a moment before trying again.', 429);
    query('INSERT INTO rate_limits(bucket,window_start,attempts) VALUES(?,?,1) ON DUPLICATE KEY UPDATE attempts=attempts+1', [$bucket, $now]);
}

// Call inside a transaction after locking the author's user row. This also
// serializes submissions from different sessions belonging to the same author.
function safety_check_duplicates(string $table, int $user, string $body, int $exclude = 0): void {
    if (!in_array($table, ['posts', 'comments'], true)) throw new InvalidArgumentException('Invalid safety target');
    $public = $table === 'posts' ? " AND visibility='public' AND status='published'" : '';
    $rows = query("SELECT body FROM $table WHERE user_id=? AND id<>? AND created_at >= UTC_TIMESTAMP() - INTERVAL 10 MINUTE$public ORDER BY id DESC LIMIT 100", [$user, $exclude])->fetchAll();
    $normalized = safety_normalize($body);
    $matches = 0;
    foreach ($rows as $row) if (safety_normalize($row['body']) === $normalized) $matches++;
    if ($matches >= 2) fail('Please wait before sending the same message again.', 429);
}

function safety_queue_review(int $user, string $kind, int $id, array $signals): void {
    if (!$signals) return;
    $column = $kind === 'posts' ? 'post_id' : 'comment_id';
    if (one("SELECT id FROM reports WHERE $column=? AND user_id=? AND status='open'", [$id, $user])) return;
    $reason = 'Automated safety check (unconfirmed): '.implode(', ', $signals).'. Review the context before taking action.';
    query("INSERT INTO reports(user_id,$column,reason) VALUES(?,?,?)", [$user, $id, $reason]);
}
