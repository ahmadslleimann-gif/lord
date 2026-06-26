<?php
/* ============================================================
   LORD — publish endpoint for the admin dashboard
   Writes assets/js/products-data.js when the dashboard
   publishes (keeps a backup of the previous version first).

   غيّر كلمة المرور من هون — ولازم تطابق يلي بملف assets/js/admin.js
   ============================================================ */
define('LORD_ADMIN_PASSWORD', 'lord26');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// the dashboard pings with GET to discover that server publishing is available
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(array('ok' => true, 'ping' => true));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'error' => 'method not allowed'));
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data) || !isset($data['password']) || !isset($data['content'])) {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'error' => 'bad request'));
    exit;
}

// hash_equals exists since PHP 5.6 — tiny fallback for very old hosts
if (!function_exists('hash_equals')) {
    function hash_equals($a, $b) {
        if (strlen($a) !== strlen($b)) { return false; }
        $r = 0;
        for ($i = 0; $i < strlen($a); $i++) { $r |= ord($a[$i]) ^ ord($b[$i]); }
        return $r === 0;
    }
}

if (!hash_equals(LORD_ADMIN_PASSWORD, (string) $data['password'])) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'error' => 'wrong password'));
    exit;
}

$content = (string) $data['content'];

// sanity checks: must look like our catalog file, sane size
if (strlen($content) < 100 || strlen($content) > 64 * 1024 * 1024
    || strpos($content, 'window.LORD_PRODUCTS') === false
    || strpos($content, 'window.LORD_BRANDS') === false) {
    http_response_code(422);
    echo json_encode(array('ok' => false, 'error' => 'invalid content'));
    exit;
}

$target = __DIR__ . '/../assets/js/products-data.js';

// keep one rolling backup of the previous version
if (file_exists($target)) {
    @copy($target, __DIR__ . '/../assets/js/products-data.backup.js');
}

if (file_put_contents($target, $content, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'error' => 'write failed — check file permissions on assets/js/'));
    exit;
}

echo json_encode(array('ok' => true, 'bytes' => strlen($content)));
