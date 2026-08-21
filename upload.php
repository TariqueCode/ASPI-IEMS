<?php
/**
 * ==============================================================================
 * Ashab Siraj Polytechnic Institute (ASPI) - File Upload Handler
 * ==============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uploadDir = __DIR__ . '/assets/uploads';
if (is_file(__DIR__ . '/upload_gc.php')) { if (is_file(__DIR__ . '/upload_gc.php')) { if (is_file(__DIR__ . '/upload_gc.php')) { require_once __DIR__ . '/upload_gc.php'; } } }
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0777, true);
}

function aspiReadableUploadName(string $desired, string $fallback): string
{
    $base = trim($desired !== '' ? pathinfo($desired, PATHINFO_FILENAME) : pathinfo($fallback, PATHINFO_FILENAME));
    $base = preg_replace('/[\\x00-\\x1F\\x7F\\\\\\/:*?\"<>|]+/u', ' ', (string)$base);
    $base = trim(preg_replace('/\\s+/u', ' ', $base), ' .');
    return $base !== '' ? $base : 'ASPI-File';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Remove files that are already orphaned before accepting a replacement upload.
    if (function_exists('aspiCleanupUnreferencedUploads')) { if (function_exists('aspiCleanupUnreferencedUploads')) { if (function_exists('aspiCleanupUnreferencedUploads')) { aspiCleanupUnreferencedUploads(); } } }

    $file = $_FILES['file'] ?? $_FILES['image'] ?? $_FILES['upload'] ?? null;

    if ($file && isset($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'ফাইল আপলোড ব্যর্থ হয়েছে। এরর কোড: ' . $file['error']], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'pdf', 'doc', 'docx', 'ttf', 'woff', 'woff2', 'csv', 'zip'];

        if (!in_array($ext, $allowed, true)) {
            http_response_code(400);
            echo json_encode(['error' => 'অননুমোদিত ফাইল ফরম্যাট (.' . $ext . ')। শুধুমাত্র ছবি ও ডকুমেন্ট ফাইল আপলোড করা যাবে।'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $baseName = aspiReadableUploadName((string)($_POST['desired_filename'] ?? ''), (string)$file['name']);
        $uniqueName = $baseName . '.' . $ext;
        $targetPath = $uploadDir . '/' . $uniqueName;
        $relativePath = 'assets/uploads/' . $uniqueName;

        if (move_uploaded_file($file['tmp_name'], $targetPath) || @copy($file['tmp_name'], $targetPath)) {
            @chmod($targetPath, 0644);
            echo json_encode([
                'status' => 'success',
                'file_url' => $relativePath,
                'url' => $relativePath,
                'filename' => $uniqueName,
                'message' => 'ফাইল সফলভাবে আপলোড হয়েছে।'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        http_response_code(500);
        echo json_encode(['error' => 'ফাইল সার্ভারে সেভ করা যায়নি। ফোল্ডার পারমিশন (assets/uploads) 755 বা 777 চেক করুন।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Optional base64 input.
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    $base64 = $json['base64'] ?? $json['image_base64'] ?? '';
    if (!empty($base64) && preg_match('/^data:([a-zA-Z0-9]+\\/[a-zA-Z0-9\\-\\+\\.]+);base64,(.+)$/', $base64, $bMatches)) {
        $mime = $bMatches[1];
        $binary = base64_decode($bMatches[2]);
        $mimeMap = [
            'image/jpeg' => 'jpg', 'image/jpg' => 'jpg', 'image/png' => 'png',
            'image/webp' => 'webp', 'image/gif' => 'gif', 'image/svg+xml' => 'svg',
            'application/pdf' => 'pdf'
        ];
        $ext = $mimeMap[$mime] ?? 'png';
        $baseName = aspiReadableUploadName((string)($json['desired_filename'] ?? ''), 'ASPI-File');
        $uniqueName = $baseName . '.' . $ext;
        $targetPath = $uploadDir . '/' . $uniqueName;
        $relativePath = 'assets/uploads/' . $uniqueName;

        if (@file_put_contents($targetPath, $binary) !== false) {
            @chmod($targetPath, 0644);
            echo json_encode([
                'status' => 'success',
                'file_url' => $relativePath,
                'url' => $relativePath,
                'filename' => $uniqueName
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    http_response_code(400);
    echo json_encode(['error' => 'কোনো ফাইল পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'অবৈধ রিকুয়েস্ট'], JSON_UNESCAPED_UNICODE);
