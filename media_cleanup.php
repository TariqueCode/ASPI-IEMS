<?php
/**
 * One-time ASPI-IEMS media cleanup.
 * Clears image media paths in data/db.json so media can be added from the dashboard.
 * PDFs and other non-image files are preserved.
 * Delete this file after running it once.
 */
header('Content-Type: application/json; charset=utf-8');

$dbFile = __DIR__ . '/data/db.json';
if (!file_exists($dbFile)) {
    http_response_code(404);
    echo json_encode(['status'=>'error','message'=>'data/db.json পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE);
    exit;
}

$data = json_decode(file_get_contents($dbFile), true);
if (!is_array($data)) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'db.json বৈধ JSON নয়।'], JSON_UNESCAPED_UNICODE);
    exit;
}

$cleared = 0;
$extensions = ['png','jpg','jpeg','webp','gif','svg'];

$walk = function (&$value, $key = '') use (&$walk, &$cleared, $extensions) {
    if (is_array($value)) {
        foreach ($value as $k => &$child) {
            $walk($child, (string)$k);
        }
        unset($child);
        return;
    }

    if (!is_string($value) || trim($value) === '') return;
    if (!in_array($key, ['logo','image_url','principal_img','photo_url','file_url'], true)) return;

    $path = parse_url($value, PHP_URL_PATH) ?: $value;
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (in_array($ext, $extensions, true)) {
        $value = '';
        $cleared++;
    }
};

$walk($data);

$backup = $dbFile . '.backup-' . date('Ymd-His');
@copy($dbFile, $backup);

$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (@file_put_contents($dbFile, $json) === false) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'db.json সংরক্ষণ করা যায়নি।'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'status' => 'success',
    'cleared_images' => $cleared,
    'message' => 'সব image media field ফাঁকা করা হয়েছে। এখন Dashboard থেকে ছবি যোগ করুন।',
    'next_step' => 'নিরাপত্তার জন্য media_cleanup.php ফাইলটি এখনই মুছে দিন।'
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
