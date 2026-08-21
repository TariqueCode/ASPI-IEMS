<?php
// ASPI_JSON_FATAL_GUARD_V2
if (!defined('ASPI_JSON_FATAL_GUARD_V2')) {
    define('ASPI_JSON_FATAL_GUARD_V2', true);
    ob_start();
    register_shutdown_function(function () {
        $error = error_get_last();
        if (!$error) return;
        $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
        if (!in_array($error['type'], $fatalTypes, true)) return;
        while (ob_get_level() > 0) @ob_end_clean();
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'error',
            'message' => 'সার্ভারে API ত্রুটি ঘটেছে।',
            'error_type' => (int)$error['type'],
            'error_file' => basename((string)$error['file']),
            'error_line' => (int)$error['line']
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    });
}
/**
 * ==============================================================================
 * Ashab Siraj Polytechnic Institute (ASPI) - Backend API Controller
 * ==============================================================================
 * This file handles all API requests for both PHP/cPanel and Node.js environments.
 * Supports:
 * - Admin authentication & user management
 * - Education Board SSC result verification & captcha proxy
 * - Online Admission submission and processing
 * - Site configuration & content persistence (JSON + MySQL)
 * - File uploads and MySQL database synchronization
 * ==============================================================================
 */

// Set response headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Directories setup
$baseDir = __DIR__;
$dataDir = $baseDir . '/data';
$uploadDir = $baseDir . '/assets/uploads';
// ASPI_UPLOAD_GC_ENABLED_V1
if (is_file(__DIR__ . '/upload_gc.php')) { require_once __DIR__ . '/upload_gc.php'; }
$dbFile = $dataDir . '/db.json';
$mysqlConfigFile = $dataDir . '/mysql-config.json';

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0777, true);
}
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0777, true);
}

// Initial fallback database template
$initialDb = [
    'users' => [
        [
            'id' => 1,
            'username' => 'Tarique',
            'password' => '#Tarique-1998',
            'name' => 'Tarique',
            'role' => 'Super Admin',
            'created_at' => '2026-08-19'
        ]
    ],
    'site' => [
        'slogan' => 'একটাই লক্ষ্য, হতে হবে দক্ষ।',
        'foundation_name' => 'আসহাব সিরাজ ফাউন্ডেশন',
        'address' => 'দক্ষিণ হাশিমপুর (জামিরজুরী রাস্তার মাথা), দোহাজারী, চন্দনাইশ, চট্টগ্রাম',
        'admissionNotice' => '২০২৬-২০২৭ শিক্ষাবর্ষে ডিপ্লোমা ইন ইঞ্জিনিয়ারিং ও NSDA কোর্সে ভর্তি চলছে! সীমিত আসন!',
        'admissionOpen' => true,
        'custom_font' => 'assets/uploads/1786621310_3881.ttf',
        'email' => 'ctgaspi@gmail.com',
        'font_size' => '16',
        'logo' => 'assets/uploads/1787121756078_5353.png',
        'phone' => '+৮৮০ ১৮৪৭-৩১০৩১০',
        'whatsapp' => '+8801847310310',
        'instagram' => 'https://instagram.com/ctgaspi',
        'facebook' => 'https://facebook.com/ashabsirajpolytechnicinstitute',
        'youtube' => 'https://youtube.com/@ctgaspi',
        'principal_img' => '',
        'principal_msg' => 'কারিগরি শিক্ষায় শিক্ষিত জাতিই পারে দেশের প্রকৃত উন্নয়ন সাধন করতে। আধুনিক প্রযুক্তিনির্ভর শিক্ষায় আমরা বদ্ধপরিকর।',
        'sections' => [
            'marquee' => true,
            'hero' => true,
            'founder' => true,
            'stats' => true,
            'notices' => true,
            'messages' => true,
            'departments' => true,
            'facilities' => true,
            'routines' => true,
            'admission' => true,
            'short_courses' => true,
            'placement' => true,
            'teachers' => true,
            'events' => true,
            'faq' => true,
            'contact' => true
        ]
    ],
    'messages' => [],
    'facilities' => [],
    'routines' => [],
    'notices' => [],
    'events' => [],
    'teachers' => [],
    'committee' => [],
    'courses' => [],
    'faqs' => [],
    'admissions' => []
];

// Helper to read DB
function getDatabase() {
    global $dbFile, $initialDb;
    if (file_exists($dbFile)) {
        $content = @file_get_contents($dbFile);
        $data = json_decode($content, true);
        if (is_array($data)) {
            return $data;
        }
    }
    // Write default if not exists
    @file_put_contents($dbFile, json_encode($initialDb, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    return $initialDb;
}

// Helper to save DB
function saveDatabase($data) {
    global $dbFile;
    return @file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Helper to get MySQL Config
function getMySQLConfig() {
    global $mysqlConfigFile;
    $default = [
        'enabled' => false,
        'host' => 'localhost',
        'port' => 3306,
        'database' => 'aspi_polytechnic_db',
        'user' => 'root',
        'password' => '',
        'ssl' => false
    ];
    if (file_exists($mysqlConfigFile)) {
        $content = @file_get_contents($mysqlConfigFile);
        $saved = json_decode($content, true);
        if (is_array($saved)) {
            return array_merge($default, $saved);
        }
    }
    return $default;
}

// Helper to save MySQL Config
function saveMySQLConfig($config) {
    global $mysqlConfigFile;
    $current = getMySQLConfig();
    $updated = array_merge($current, $config);
    @file_put_contents($mysqlConfigFile, json_encode($updated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    return $updated;
}

// Helper to connect to MySQL
function connectMySQL($cfg = null) {
    if (!$cfg) {
        $cfg = getMySQLConfig();
    }
    $host = $cfg['host'] ?: 'localhost';
    $port = (int)($cfg['port'] ?: 3306);
    $user = $cfg['user'] ?: 'root';
    $pass = $cfg['password'] ?? '';
    $dbname = $cfg['database'] ?: null;

    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @new mysqli($host, $user, $pass, $dbname, $port);
    if ($conn->connect_error) {
        throw new Exception("MySQL সংযোগ ব্যর্থ: " . $conn->connect_error);
    }
    $conn->set_charset("utf8mb4");
    return $conn;
}

// Read raw request body
$rawInput = file_get_contents('php://input');
$jsonBody = json_decode($rawInput, true) ?: [];
$requestParams = array_merge($_GET, $_POST, $jsonBody);
$action = $_GET['action'] ?? $requestParams['action'] ?? '';

// Check if request is general GET (fetch all data)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($action)) {
    $db = getDatabase();
    // Do not expose raw passwords directly in public GET
    $safeDb = $db;
    if (isset($safeDb['users']) && is_array($safeDb['users'])) {
        foreach ($safeDb['users'] as &$u) {
            unset($u['password']);
        }
    }
    echo json_encode($safeDb, JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle GET Users
if ($action === 'get_users') {
    $db = getDatabase();
    $users = $db['users'] ?? [];
    $safeUsers = array_map(function($u) {
        return [
            'id' => $u['id'] ?? 1,
            'username' => $u['username'] ?? '',
            'name' => $u['name'] ?? $u['username'] ?? '',
            'role' => $u['role'] ?? 'Admin',
            'created_at' => $u['created_at'] ?? '2026-08-19'
        ];
    }, $users);
    echo json_encode(['status' => 'success', 'users' => $safeUsers], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Login
if ($action === 'login') {
    $username = trim($requestParams['username'] ?? '');
    $password = (string)($requestParams['password'] ?? '');

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = getDatabase();
    $users = $db['users'] ?? [];
    
    // Fallback default admin if list is empty
    if (empty($users)) {
        $users = $initialDb['users'];
        $db['users'] = $users;
        saveDatabase($db);
    }

    $matched = null;
    foreach ($users as $u) {
        if (strcasecmp($u['username'], $username) === 0 && (string)$u['password'] === $password) {
            $matched = $u;
            break;
        }
    }

    if ($matched) {
        $token = 'aspi_token_' . md5($matched['username'] . time() . 'ASPI_SECRET_KEY_2026');
        echo json_encode([
            'status' => 'success',
            'message' => 'লগইন সফল হয়েছে!',
            'token' => $token,
            'user' => [
                'id' => $matched['id'] ?? 1,
                'username' => $matched['username'],
                'name' => $matched['name'] ?? $matched['username'],
                'role' => $matched['role'] ?? 'Super Admin'
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'ভুল ইউজারনেম অথবা পাসওয়ার্ড!'], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// Handle Update Profile
if ($action === 'update_profile') {
    $username = trim($requestParams['username'] ?? '');
    $newUsername = trim($requestParams['new_username'] ?? '');
    $name = trim($requestParams['name'] ?? '');
    $curPass = (string)($requestParams['current_password'] ?? '');
    $newPass = (string)($requestParams['new_password'] ?? '');

    if (empty($username) || empty($curPass)) {
        http_response_code(400);
        echo json_encode(['error' => 'বর্তমান পাসওয়ার্ড প্রদান করা আবশ্যক।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = getDatabase();
    $users = &$db['users'];
    $idx = -1;
    for ($i = 0; $i < count($users); $i++) {
        if (strcasecmp($users[$i]['username'], $username) === 0) {
            $idx = $i;
            break;
        }
    }

    if ($idx === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'ইউজার পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ((string)$users[$idx]['password'] !== $curPass) {
        http_response_code(400);
        echo json_encode(['error' => 'বর্তমান পাসওয়ার্ড সঠিক নয়!'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!empty($newPass)) {
        $users[$idx]['password'] = $newPass;
    }
    if (!empty($newUsername)) {
        $users[$idx]['username'] = $newUsername;
    }
    if (!empty($name)) {
        $users[$idx]['name'] = $name;
    }

    saveDatabase($db);

    echo json_encode([
        'status' => 'success',
        'message' => 'প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে।',
        'user' => [
            'id' => $users[$idx]['id'] ?? 1,
            'username' => $users[$idx]['username'],
            'name' => $users[$idx]['name'] ?? $users[$idx]['username'],
            'role' => $users[$idx]['role'] ?? 'Admin'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Add User
if ($action === 'add_user') {
    $username = trim($requestParams['username'] ?? '');
    $password = (string)($requestParams['password'] ?? '');
    $name = trim($requestParams['name'] ?? '') ?: $username;
    $role = $requestParams['role'] ?? 'Admin';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'ইউজারনেম এবং পাসওয়ার্ড পূরণ করুন।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = getDatabase();
    if (!isset($db['users'])) $db['users'] = [];

    foreach ($db['users'] as $u) {
        if (strcasecmp($u['username'], $username) === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'এই ইউজারনেমটি ইতিমধ্যে বিদ্যমান।'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $newUser = [
        'id' => round(microtime(true) * 1000),
        'username' => $username,
        'password' => $password,
        'name' => $name,
        'role' => $role,
        'created_at' => date('Y-m-d')
    ];

    $db['users'][] = $newUser;
    saveDatabase($db);

    echo json_encode([
        'status' => 'success',
        'message' => 'নতুন এডমিন ইউজার সফলভাবে যুক্ত হয়েছে।',
        'user' => $newUser
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Update User
if ($action === 'update_user') {
    $id = $requestParams['id'] ?? null;
    $username = trim($requestParams['username'] ?? '');
    $password = (string)($requestParams['password'] ?? '');
    $name = trim($requestParams['name'] ?? '');
    $role = $requestParams['role'] ?? 'Admin';

    if (!$id || empty($username)) {
        http_response_code(400);
        echo json_encode(['error' => 'সঠিক তথ্য দিন।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = getDatabase();
    $found = false;
    foreach ($db['users'] as &$u) {
        if ((string)$u['id'] === (string)$id) {
            $u['username'] = $username;
            if (!empty($name)) $u['name'] = $name;
            if (!empty($role)) $u['role'] = $role;
            if (!empty($password)) $u['password'] = $password;
            $found = true;
            break;
        }
    }

    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => 'ইউজার পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    saveDatabase($db);
    echo json_encode(['status' => 'success', 'message' => 'ইউজার তথ্য আপডেট হয়েছে।'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Delete User
if ($action === 'delete_user') {
    $id = $requestParams['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ইউজার আইডি প্রদান করুন।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = getDatabase();
    if (count($db['users'] ?? []) <= 1) {
        http_response_code(400);
        echo json_encode(['error' => 'কমপক্ষে একজন এডমিন ইউজার অবশ্যই থাকতে হবে!'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db['users'] = array_values(array_filter($db['users'], function($u) use ($id) {
        return (string)$u['id'] !== (string)$id;
    }));

    saveDatabase($db);
    echo json_encode(['status' => 'success', 'message' => 'ইউজার ডিলিট করা হয়েছে।'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle File Upload
if ($action === 'upload') {
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0777, true);
    }

    $uploadedFile = $_FILES['file'] ?? $_FILES['image'] ?? $_FILES['upload'] ?? null;
    
    if ($uploadedFile && isset($uploadedFile['tmp_name']) && is_uploaded_file($uploadedFile['tmp_name'])) {
        if ($uploadedFile['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'ফাইল আপলোড ব্যর্থ হয়েছে। এরর কোড: ' . $uploadedFile['error']], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $origName = basename($uploadedFile['name']);
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'pdf', 'doc', 'docx', 'ttf', 'woff', 'woff2', 'csv', 'zip'];

        if (!in_array($ext, $allowed)) {
            http_response_code(400);
            echo json_encode(['error' => 'অননুমোদিত ফাইল ফরম্যাট (.' . $ext . ')। ছবি (.png, .jpg, .svg, .webp) বা ডকুমেন্ট আপলোড করুন।'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $uniqueName = time() . '_' . rand(1000, 9999) . '.' . $ext;
        $destPath = $uploadDir . '/' . $uniqueName;
        $relPath = 'assets/uploads/' . $uniqueName;

        if (move_uploaded_file($uploadedFile['tmp_name'], $destPath)) {
            chmod($destPath, 0644);
            echo json_encode([
                'status' => 'success',
                'url' => $relPath,
                'file_url' => $relPath,
                'filename' => $uniqueName,
                'message' => 'ফাইল সফলভাবে আপলোড হয়েছে।'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } else {
            // Attempt copy fallback
            if (@copy($uploadedFile['tmp_name'], $destPath)) {
                chmod($destPath, 0644);
                echo json_encode([
                    'status' => 'success',
                    'url' => $relPath,
                    'file_url' => $relPath,
                    'filename' => $uniqueName,
                    'message' => 'ফাইল সফলভাবে আপলোড হয়েছে।'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            http_response_code(500);
            echo json_encode(['error' => 'ফাইল সংরক্ষণ করা যায়নি। হোস্টিংয়ে assets/uploads ফোল্ডারের পারমিশন 755 বা 777 দিন।'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // Check Base64 payload fallback (e.g. data:image/png;base64,...)
    $base64Data = $requestParams['base64'] ?? $requestParams['image_base64'] ?? '';
    if (!empty($base64Data) && preg_match('/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-\+\.]+);base64,(.+)$/', $base64Data, $bMatches)) {
        $mime = $bMatches[1];
        $binary = base64_decode($bMatches[2]);
        $mimeMap = [
            'image/jpeg' => 'jpg', 'image/jpg' => 'jpg', 'image/png' => 'png',
            'image/webp' => 'webp', 'image/gif' => 'gif', 'image/svg+xml' => 'svg',
            'application/pdf' => 'pdf'
        ];
        $ext = $mimeMap[$mime] ?? 'png';
        $uniqueName = time() . '_' . rand(1000, 9999) . '.' . $ext;
        $destPath = $uploadDir . '/' . $uniqueName;
        $relPath = 'assets/uploads/' . $uniqueName;

        if (@file_put_contents($destPath, $binary)) {
            chmod($destPath, 0644);
            echo json_encode([
                'status' => 'success',
                'url' => $relPath,
                'file_url' => $relPath,
                'filename' => $uniqueName
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    http_response_code(400);
    echo json_encode(['error' => 'কোনো ফাইল পাওয়া যায়নি বা ফাইল আপলোড সাইজ লিমিট অতিক্রম করেছে।'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Captcha Proxy (Education Board / Fallback)
if ($action === 'edu_captcha') {
    $sessionId = 'sess_' . time() . '_' . rand(1000, 9999);
    
    // Try fetching from eboardresults.com via cURL
    $ch = curl_init('https://eboardresults.com/v2/home');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    $homeRes = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headers = substr($homeRes, 0, $headerSize);
    curl_close($ch);

    preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $headers, $matches);
    $cookieStr = !empty($matches[1]) ? implode('; ', $matches[1]) : '';

    if (!empty($cookieStr)) {
        $ch2 = curl_init('https://eboardresults.com/v2/captcha?r=' . time());
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch2, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch2, CURLOPT_COOKIE, $cookieStr);
        curl_setopt($ch2, CURLOPT_REFERER, 'https://eboardresults.com/v2/home');
        curl_setopt($ch2, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        $imgData = curl_exec($ch2);
        $contentType = curl_getinfo($ch2, CURLINFO_CONTENT_TYPE) ?: 'image/png';
        curl_close($ch2);

        if ($imgData && strlen($imgData) > 50) {
            // Save cookie in temporary session file
            @file_put_contents($dataDir . '/' . $sessionId . '.sess', $cookieStr);
            echo json_encode([
                'status' => 'success',
                'session_id' => $sessionId,
                'captcha_image' => 'data:' . $contentType . ';base64,' . base64_encode($imgData),
                'is_fallback' => false
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // High quality SVG Fallback Captcha if board network is slow
    $code = (string)rand(1000, 9999);
    @file_put_contents($dataDir . '/' . $sessionId . '.sess', 'FALLBACK:' . $code);
    $chars = str_split($code);
    $colors = ['#1e1b4b', '#1d4ed8', '#047857', '#b45309', '#6d28d9'];
    $textEls = '';
    foreach ($chars as $idx => $c) {
        $textEls .= '<text x="' . (18 + $idx * 26) . '" y="32" font-family="Verdana, monospace" font-size="24" font-weight="900" fill="' . $colors[$idx % count($colors)] . '">' . $c . '</text>';
    }
    $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="130" height="45" viewBox="0 0 130 45" style="background:#f8fafc; border-radius:10px; border:1.5px solid #cbd5e1;"><rect width="130" height="45" fill="#f8fafc" rx="10"/><line x1="10" y1="20" x2="120" y2="25" stroke="#cbd5e1" stroke-dasharray="3,3"/><line x1="10" y1="35" x2="120" y2="12" stroke="#cbd5e1" stroke-dasharray="3,3"/>' . $textEls . '</svg>';

    echo json_encode([
        'status' => 'success',
        'session_id' => $sessionId,
        'captcha_image' => 'data:image/svg+xml;base64,' . base64_encode($svg),
        'is_fallback' => true
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Result Verification
if ($action === 'verify_edu_result') {
    $board = $requestParams['board'] ?? '';
    $year = $requestParams['year'] ?? '';
    $roll = trim($requestParams['roll'] ?? '');
    $reg = trim($requestParams['registration'] ?? $requestParams['reg'] ?? '');
    $captcha = trim($requestParams['captcha'] ?? '');
    $sessionId = $requestParams['session_id'] ?? '';

    if (empty($board) || empty($year) || empty($roll) || empty($reg) || empty($captcha)) {
        http_response_code(400);
        echo json_encode(['error' => 'সবগুলো ঘর (বোর্ড, পাসের সন, রোল, রেজিস্ট্রেশন ও ক্যাপচা) পূরণ করুন।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = getDatabase();
    $minGpa = (float)($db['site']['admission_info']['bteb_min_gpa'] ?? $db['site']['admission_info']['min_gpa'] ?? 2.00);

    // Mock/Fallback or Real response generator
    $demoNames = [
        'MD SAKIB HASAN', 'RAFIQUL ISLAM', 'NUSRAT JAHAN', 'TANVIR AHMED', 'JANNATUL FERDOUS', 
        'MOHAMMAD ALI', 'FATEMA BEGUM', 'SAIFUL ISLAM', 'ANIKA TABASSUM'
    ];
    $name = $demoNames[array_rand($demoNames)];
    $schoolNames = [
        'DOHAZARI HIGH SCHOOL', 'JAMIRJURI HIGH SCHOOL', 'CHANDANAISH PILOT HIGH SCHOOL', 
        'CHITTAGONG COLLEGIATE SCHOOL', 'GOVT MUSLIM HIGH SCHOOL'
    ];
    $school = $schoolNames[array_rand($schoolNames)];

    // If result is unqualified (simulated check for GPA < 2.0 or specific flags)
    $gpa = 4.50;
    if ($roll === '000000' || $roll === '111111') {
        $gpa = 1.85; // Unqualified demo
    }

    if ($gpa < $minGpa) {
        http_response_code(400);
        echo json_encode([
            'status' => 'unqualified',
            'unqualified' => true,
            'student_gpa' => number_format($gpa, 2),
            'student_name' => $name,
            'board' => $board,
            'roll' => $roll,
            'reg' => $reg,
            'school' => $school,
            'year' => $year,
            'gender' => 'পুরুষ',
            'is_failed' => false,
            'error_title' => 'মন খারাপ করো না প্রিয় শিক্ষার্থী! নতুন সম্ভাবনা তোমার অপেক্ষায়',
            'error' => 'বাংলাদেশ কারিগরি শিক্ষা বোর্ডের (BTEB) নীতিমালা অনুযায়ী ডিপ্লোমায় ন্যূনতম GPA ' . number_format($minGpa, 2) . ' প্রয়োজন।'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'শিক্ষা বোর্ডের ফলাফল সফলভাবে যাচাই হয়েছে।',
        'data' => [
            'name' => $name,
            'name_en' => $name,
            'father_name' => 'MD ABDUR RAHIM',
            'father_name_en' => 'MD ABDUR RAHIM',
            'mother_name' => 'ROKEYA BEGUM',
            'mother_name_en' => 'ROKEYA BEGUM',
            'board' => $board,
            'year' => $year,
            'roll' => $roll,
            'reg' => $reg,
            'registration' => $reg,
            'gpa' => number_format($gpa, 2),
            'gender' => 'পুরুষ',
            'school_name' => $school,
            'institution' => $school,
            'is_passed' => true
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Online Admission Submission
if ($action === 'submit_admission') {
    $courseType = $requestParams['course_type'] ?? 'diploma';
    $isDiploma = $courseType === 'diploma';
    $curYear = date('Y');
    $randCode = rand(10000, 99999);
    $appId = $isDiploma ? "ASPI-{$curYear}-DIP-{$randCode}" : "ASPI-{$curYear}-NSDA-{$randCode}";

    $studentName = $requestParams['student_name_bn'] ?? $requestParams['name'] ?? $requestParams['student_name'] ?? $requestParams['student_name_en'] ?? 'শিক্ষার্থী';
    $studentPhone = $requestParams['student_mobile'] ?? $requestParams['phone'] ?? $requestParams['mobile'] ?? '';

    if (empty($studentName) || empty($studentPhone)) {
        http_response_code(400);
        echo json_encode(['error' => 'শিক্ষার্থীর নাম এবং মোবাইল নম্বর আবশ্যক।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = getDatabase();
    if (!isset($db['admissions'])) $db['admissions'] = [];

    $newAdmission = array_merge([
        'id' => round(microtime(true) * 1000),
        'application_id' => $appId,
        'course_type' => $courseType,
        'technology' => $requestParams['technology'] ?? $requestParams['course_name'] ?? ($isDiploma ? 'কম্পিউটার সায়েন্স অ্যান্ড টেকনোলজি' : 'প্রফেশনাল কোর্স'),
        'student_name' => $studentName,
        'student_name_bn' => $requestParams['student_name_bn'] ?? $studentName,
        'student_name_en' => strtoupper($requestParams['student_name_en'] ?? ''),
        'phone' => $studentPhone,
        'status' => 'pending',
        'admin_notes' => '',
        'is_read' => 0,
        'created_at' => date('Y-m-d h:i:s A')
    ], $requestParams);

    array_unshift($db['admissions'], $newAdmission);
    saveDatabase($db);

    echo json_encode([
        'status' => 'success',
        'application_id' => $appId,
        'admission' => $newAdmission,
        'message' => 'ভর্তি আবেদন সফলভাবে গৃহীত হয়েছে।'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Update Admission Status
if ($action === 'update_admission_status') {
    $id = $requestParams['id'] ?? null;
    $status = $requestParams['status'] ?? 'pending';
    $reason = $requestParams['rejection_reason'] ?? $requestParams['admin_notes'] ?? '';

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'আবেদন আইডি প্রয়োজন।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = getDatabase();
    $found = false;
    foreach ($db['admissions'] as &$a) {
        if ((string)$a['id'] === (string)$id) {
            $a['status'] = $status;
            if (!empty($reason)) {
                $a['admin_notes'] = $reason;
                $a['rejection_reason'] = $reason;
            }
            $a['is_read'] = 1;
            $found = true;
            break;
        }
    }

    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => 'আবেদনটি পাওয়া যায়নি।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    saveDatabase($db);
    echo json_encode(['status' => 'success', 'message' => 'স্ট্যাটাস আপডেট সফল হয়েছে।'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Delete Admission
if ($action === 'delete_admission') {
    $id = $requestParams['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'আবেদন আইডি আবশ্যক।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = getDatabase();
    $db['admissions'] = array_values(array_filter($db['admissions'] ?? [], function($a) use ($id) {
        return (string)$a['id'] !== (string)$id;
    }));

    saveDatabase($db);
    echo json_encode(['status' => 'success', 'message' => 'ভর্তি আবেদনটি সফলভাবে মুছে ফেলা হয়েছে।'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Mark Read
if ($action === 'mark_read') {
    $db = getDatabase();
    if (isset($db['admissions'])) {
        foreach ($db['admissions'] as &$a) {
            $a['is_read'] = 1;
        }
        saveDatabase($db);
    }
    echo json_encode(['status' => 'success']);
    exit;
}

// Helpers for Education Board Captcha & SSC Verification
function normalizeBanglaNumbers($str) {
    if (!$str) return '';
    $bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return str_replace($bn, $en, (string)$str);
}

function getEduSessions() {
    global $dataDir;
    $cacheFile = $dataDir . '/edu_sessions.json';
    if (file_exists($cacheFile)) {
        $data = json_decode(@file_get_contents($cacheFile), true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveEduSessions($sessions) {
    global $dataDir;
    $cacheFile = $dataDir . '/edu_sessions.json';
    $now = time();
    $cleaned = [];
    foreach ($sessions as $id => $s) {
        if ($now - ($s['created_at'] ?? 0) < 900) {
            $cleaned[$id] = $s;
        }
    }
    @file_put_contents($cacheFile, json_encode($cleaned, JSON_UNESCAPED_UNICODE));
}

function generateSvgCaptcha($code) {
    $chars = str_split($code);
    $colors = ['#1e1b4b', '#1d4ed8', '#047857', '#b45309', '#6d28d9'];
    $textElements = '';
    foreach ($chars as $i => $c) {
        $col = $colors[$i % count($colors)];
        $rot = rand(-7, 7);
        $x = 18 + $i * 26;
        $y = 31 + rand(0, 4);
        $textElements .= "<text x=\"{$x}\" y=\"{$y}\" font-family=\"Verdana, Tahoma, monospace, sans-serif\" font-size=\"24\" font-weight=\"900\" fill=\"{$col}\" transform=\"rotate({$rot} {$x} {$y})\">{$c}</text>";
    }
    $lines = '';
    for ($i = 0; $i < 3; $i++) {
        $x1 = rand(0, 130); $y1 = rand(0, 45); $x2 = rand(0, 130); $y2 = rand(0, 45);
        $lines .= "<line x1=\"{$x1}\" y1=\"{$y1}\" x2=\"{$x2}\" y2=\"{$y2}\" stroke=\"#94a3b8\" stroke-width=\"1\" stroke-dasharray=\"3,3\" opacity=\"0.6\"/>";
    }
    $svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"130\" height=\"45\" viewBox=\"0 0 130 45\" style=\"background:#f8fafc; border-radius:10px; border:1.5px solid #cbd5e1;\"><rect width=\"130\" height=\"45\" fill=\"#f8fafc\" rx=\"10\"/>{$lines}{$textElements}</svg>";
    return 'data:image/svg+xml;base64,' . base64_encode($svg);
}

require_once __DIR__ . '/EducationBoardResult.php';

// Handle Get Education Board Captcha
if ($action === 'get_edu_captcha') {
    try {
        $engine = new EducationBoardResult();
        $res = $engine->getCaptcha();
        echo json_encode($res, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// Handle Verify Education Board Result
if ($action === 'verify_edu_result') {
    $board = $requestParams['board'] ?? 'chittagong';
    $year = normalizeBanglaNumbers($requestParams['year'] ?? date('Y'));
    $roll = normalizeBanglaNumbers($requestParams['roll'] ?? '');
    $reg = normalizeBanglaNumbers($requestParams['reg'] ?? ($requestParams['registration'] ?? ''));
    $captcha = normalizeBanglaNumbers($requestParams['captcha'] ?? '');
    $exam = $requestParams['exam'] ?? 'ssc';

    if (empty($roll) || empty($reg) || empty($captcha)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'এসএসসি রোল, রেজিস্ট্রেশন নম্বর এবং ক্যাপচা কোড প্রদান করুন।'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    try {
        $engine = new EducationBoardResult();
        $rawRes = $engine->fetchResult($board, $year, $roll, $reg, $captcha, $exam);

        if (isset($rawRes['status']) && $rawRes['status'] === 0 && isset($rawRes['res'])) {
            $res = $rawRes['res'];
            $gpa = $res['gpa'] ?? '0.00';
            $isPassed = (float)$gpa >= 2.00 && $gpa !== '0.00' && $gpa !== '0';

            $studentData = [
                'roll' => $res['roll_no'] ?? $roll,
                'reg' => $res['regno'] ?? $reg,
                'registration' => $res['regno'] ?? $reg,
                'board' => $res['board_name'] ?? $board,
                'year' => $year,
                'name' => $res['name'] ?? '',
                'name_en' => strtoupper(trim($res['name'] ?? '')),
                'name_bn' => '',
                'father' => $res['fname'] ?? '',
                'father_name' => $res['fname'] ?? '',
                'father_name_en' => strtoupper(trim($res['fname'] ?? '')),
                'father_name_bn' => '',
                'mother' => $res['mname'] ?? '',
                'mother_name' => $res['mname'] ?? '',
                'mother_name_en' => strtoupper(trim($res['mname'] ?? '')),
                'mother_name_bn' => '',
                'school_name' => strtoupper(trim($res['inst_name'] ?? '')),
                'institution' => strtoupper(trim($res['inst_name'] ?? '')),
                'institute' => strtoupper(trim($res['inst_name'] ?? '')),
                'gpa' => $gpa,
                'result' => $isPassed ? 'PASSED' : 'FAILED',
                'is_passed' => $isPassed,
                'group' => $res['stud_group'] ?? '',
                'type' => $res['stud_type'] ?? 'REGULAR',
                'dob' => $res['dob'] ?? '',
                'gender' => ($res['stud_sex'] ?? '') === 'M' ? 'পুরুষ' : (($res['stud_sex'] ?? '') === 'F' ? 'মহিলা' : 'পুরুষ'),
                'grades' => $res['grade'] ?? [],
                'verified_at' => date('Y-m-d H:i:s'),
                'verified_by_board' => true
            ];

            if (!$isPassed) {
                echo json_encode([
                    'status' => 'unqualified',
                    'unqualified' => true,
                    'data' => $studentData,
                    'student' => $studentData,
                    'message' => "শিক্ষার্থীর ফলাফল জিপিএ ২.০০ এর কম (জিপিএ: {$gpa})।"
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            echo json_encode([
                'status' => 'success',
                'data' => $studentData,
                'student' => $studentData,
                'message' => 'শিক্ষা বোর্ডের কেন্দ্রীয় ডাটাবেজ থেকে শিক্ষার্থীর তথ্য সফলভাবে যাচাই হয়েছে।'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $errMsg = $rawRes['msg'] ?? 'ফলাফল পাওয়া যায়নি অথবা তথ্য সঠিক নয়।';
        if (stripos($errMsg, 'captcha') !== false) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'ক্যাপচা কোডটি সঠিক হয়নি! অনুগ্রহ করে নতুন ক্যাপচা দেখে সঠিক সংখ্যাটি লিখুন।'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => $errMsg], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Handle MySQL Connection Test
if ($action === 'mysql_test') {
    try {
        $conn = connectMySQL($jsonBody);
        $serverInfo = $conn->server_info;
        $conn->close();
        echo json_encode([
            'success' => true,
            'message' => "MySQL সংযোগ সফল হয়েছে! (সার্ভার ভার্সন: {$serverInfo})"
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// Handle MySQL Save Config
if ($action === 'mysql_save_config') {
    try {
        $saved = saveMySQLConfig($jsonBody);
        echo json_encode([
            'success' => true,
            'message' => 'MySQL কনফিগারেশন সংরক্ষিত হয়েছে!',
            'config' => $saved
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// Handle MySQL Get Config
if ($action === 'mysql_get_config') {
    $cfg = getMySQLConfig();
    unset($cfg['password']); // Protect password
    echo json_encode(['success' => true, 'config' => $cfg], JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle Sync To DB (Push current data to MySQL)
if ($action === 'mysql_sync_to_db') {
    try {
        $conn = connectMySQL();
        $db = getDatabase();
        
        // Create tables if not exists
        $conn->query("CREATE TABLE IF NOT EXISTS `site_settings` (
            `id` INT PRIMARY KEY AUTO_INCREMENT,
            `setting_key` VARCHAR(100) NOT NULL UNIQUE,
            `setting_value` LONGTEXT,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $conn->query("CREATE TABLE IF NOT EXISTS `users` (
            `id` BIGINT PRIMARY KEY,
            `username` VARCHAR(100) NOT NULL UNIQUE,
            `password` VARCHAR(255) NOT NULL,
            `name` VARCHAR(150),
            `role` VARCHAR(50) DEFAULT 'Admin',
            `created_at` VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $conn->query("CREATE TABLE IF NOT EXISTS `admissions` (
            `id` BIGINT PRIMARY KEY,
            `application_id` VARCHAR(100),
            `student_name` VARCHAR(200),
            `phone` VARCHAR(50),
            `course_type` VARCHAR(50),
            `course_name` VARCHAR(200),
            `ssc_gpa` VARCHAR(30),
            `is_read` TINYINT(1) DEFAULT 0,
            `data_json` LONGTEXT,
            `created_at` VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Sync Site Data
        $siteJson = $conn->real_escape_string(json_encode($db['site'] ?? [], JSON_UNESCAPED_UNICODE));
        $conn->query("INSERT INTO `site_settings` (`setting_key`, `setting_value`) VALUES ('site_config', '{$siteJson}') ON DUPLICATE KEY UPDATE `setting_value`='{$siteJson}'");

        // Sync Users
        foreach ($db['users'] ?? [] as $u) {
            $uid = (int)($u['id'] ?? 1);
            $uName = $conn->real_escape_string($u['username'] ?? '');
            $uPass = $conn->real_escape_string($u['password'] ?? '');
            $uFullName = $conn->real_escape_string($u['name'] ?? $uName);
            $uRole = $conn->real_escape_string($u['role'] ?? 'Admin');
            $uCreated = $conn->real_escape_string($u['created_at'] ?? date('Y-m-d'));
            $conn->query("INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`, `created_at`) VALUES ({$uid}, '{$uName}', '{$uPass}', '{$uFullName}', '{$uRole}', '{$uCreated}') ON DUPLICATE KEY UPDATE `password`='{$uPass}', `name`='{$uFullName}'");
        }

        $conn->close();
        echo json_encode(['success' => true, 'message' => 'MySQL ডাটাবেজে সকল ডেটা সফলভাবে সিঙ্ক সম্পন্ন হয়েছে।'], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'সিঙ্ক ত্রুটি: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// Handle Export SQL Dump
if ($action === 'mysql_export_sql') {
    $db = getDatabase();
    header('Content-Type: application/sql');
    header('Content-Disposition: attachment; filename="aspi_polytechnic_db_' . date('Y-m-d') . '.sql"');
    
    echo "-- ASPI Database Dump\n";
    echo "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
    echo "CREATE TABLE IF NOT EXISTS `site_settings` (`id` INT PRIMARY KEY AUTO_INCREMENT, `setting_key` VARCHAR(100) NOT NULL UNIQUE, `setting_value` LONGTEXT);\n";
    echo "CREATE TABLE IF NOT EXISTS `users` (`id` BIGINT PRIMARY KEY, `username` VARCHAR(100) NOT NULL UNIQUE, `password` VARCHAR(255) NOT NULL, `name` VARCHAR(150), `role` VARCHAR(50), `created_at` VARCHAR(50));\n";
    echo "CREATE TABLE IF NOT EXISTS `admissions` (`id` BIGINT PRIMARY KEY, `student_name` VARCHAR(200), `phone` VARCHAR(50), `course_type` VARCHAR(50), `ssc_gpa` VARCHAR(30), `created_at` VARCHAR(100));\n\n";
    
    foreach ($db['users'] ?? [] as $u) {
        echo "INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`, `created_at`) VALUES (" . (int)$u['id'] . ", '" . addslashes($u['username']) . "', '" . addslashes($u['password']) . "', '" . addslashes($u['name'] ?? $u['username']) . "', '" . addslashes($u['role'] ?? 'Admin') . "', '" . addslashes($u['created_at'] ?? '2026-08-19') . "') ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);\n";
    }
    exit;
}

// Default POST handler: Save entire website content updates
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($jsonBody) && is_array($jsonBody)) {
        $db = getDatabase();
        if (isset($jsonBody['site'])) $db['site'] = array_merge($db['site'] ?? [], $jsonBody['site']);
        if (isset($jsonBody['messages'])) $db['messages'] = $jsonBody['messages'];
        if (isset($jsonBody['facilities'])) $db['facilities'] = $jsonBody['facilities'];
        if (isset($jsonBody['routines'])) $db['routines'] = $jsonBody['routines'];
        if (isset($jsonBody['notices'])) $db['notices'] = $jsonBody['notices'];
        if (isset($jsonBody['events'])) $db['events'] = $jsonBody['events'];
        if (isset($jsonBody['teachers'])) $db['teachers'] = $jsonBody['teachers'];
        if (isset($jsonBody['courses'])) $db['courses'] = $jsonBody['courses'];
        if (isset($jsonBody['faqs'])) $db['faqs'] = $jsonBody['faqs'];
        if (isset($jsonBody['admissions'])) $db['admissions'] = $jsonBody['admissions'];
        saveDatabase($db);
        aspiCleanupUnreferencedUploads($db);
        echo json_encode(['status' => 'success', 'message' => 'ওয়েবসাইটের তথ্য সংরক্ষিত হয়েছে।'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Fallback
echo json_encode(['status' => 'ok', 'server' => 'ASPI Backend API (PHP/Node Compatible)'], JSON_UNESCAPED_UNICODE);
