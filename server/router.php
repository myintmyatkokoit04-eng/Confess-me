<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($path, '/api')) { require __DIR__.'/../public/api/index.php'; return true; }
$file = realpath(__DIR__.'/../public'.$path);
$root = realpath(__DIR__.'/../public');
if ($file && str_starts_with($file, $root.DIRECTORY_SEPARATOR) && is_file($file)) return false;
if (is_file(__DIR__.'/../public/index.html')) { readfile(__DIR__.'/../public/index.html'); return true; }
http_response_code(404); echo 'Run npm run dev or npm run build.';
