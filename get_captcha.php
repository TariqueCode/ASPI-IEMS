<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/EducationBoardResult.php';

try {
    $engine = new EducationBoardResult();

    // Keep the exact bootstrap sequence used by the supplied successful
    // project. The upstream cookie jar must remain the same for all calls.
    $engine->solveChallenge();
    $engine->get($engine->getBaseUrl() . '/v2/home');
    $image = $engine->getCaptchaImage();

    $mime = 'image/jpeg';
    $prefix = substr($image, 0, 32);
    if (substr($prefix, 0, 8) === "\x89PNG\r\n\x1a\n") {
        $mime = 'image/png';
    } elseif (substr($prefix, 0, 3) === "\xFF\xD8\xFF") {
        $mime = 'image/jpeg';
    } elseif (strpos($prefix, 'GIF8') === 0) {
        $mime = 'image/gif';
    } elseif (strpos($prefix, '<svg') !== false) {
        $mime = 'image/svg+xml';
    }

    echo json_encode([
        'status' => 'success',
        'captcha_image' => 'data:' . $mime . ';base64,' . base64_encode($image),
        'message' => 'অফিসিয়াল শিক্ষা বোর্ড ক্যাপচা লোড হয়েছে।'
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(502);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage() ?: 'ক্যাপচা লোড করা যায়নি।'
    ], JSON_UNESCAPED_UNICODE);
}
