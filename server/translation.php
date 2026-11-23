<?php
declare(strict_types=1);
// Plain text only. Credentials and upstream errors never reach clients/logs.
function google_translation(string $text, string $target, string $key): array {
    if (!function_exists('curl_init')) throw new RuntimeException('translation unavailable');
    $curl = curl_init('https://translation.googleapis.com/language/translate/v2');
    curl_setopt_array($curl, [CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>5, CURLOPT_TIMEOUT=>20, CURLOPT_HTTPHEADER=>['Content-Type: application/json', 'X-Goog-Api-Key: '.$key], CURLOPT_POSTFIELDS=>json_encode(['q'=>$text, 'target'=>$target, 'format'=>'text'], JSON_UNESCAPED_UNICODE), CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS]);
    $response = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    $data = is_string($response) ? json_decode($response, true) : null;
    $item = $data['data']['translations'][0] ?? null;
    if ($status !== 200 || !is_array($item) || !is_string($item['translatedText']??null)) throw new RuntimeException('translation unavailable');
    return ['translated_text'=>$item['translatedText'], 'detected_language'=>$item['detectedSourceLanguage']??null, 'target'=>$target];
}
