<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/EducationBoardResult.php';

try {
    $engine = new EducationBoardResult();
    $result = $engine->getCaptcha();
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'ক্যাপচা লোড করার সময় ত্রুটি: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
