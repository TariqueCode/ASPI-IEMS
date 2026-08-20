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

// Helper to normalize Bengali digits to English
function normalizeNumbers($str) {
    if (!$str) return '';
    $bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return str_replace($bn, $en, (string)$str);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$board = $input['board'] ?? '';
$year = normalizeNumbers($input['year'] ?? '');
$roll = normalizeNumbers($input['roll'] ?? '');
$reg = normalizeNumbers($input['reg'] ?? ($input['registration'] ?? ''));
$captcha = normalizeNumbers($input['captcha'] ?? '');
$exam = $input['exam'] ?? 'ssc';

if (empty($board) || empty($year) || empty($roll) || empty($reg) || empty($captcha)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'বোর্ড, পাসের সন, এসএসসি রোল, রেজিস্ট্রেশন ও ক্যাপচা সবগুলো ফিল্ড পূরণ করুন।'
    ], JSON_UNESCAPED_UNICODE);
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

    $errMsg = $rawRes['msg'] ?? 'ফলাফল পাওয়া যায়নি অথবা তথ্য ভুল রয়েছে।';
    if (stripos($errMsg, 'captcha') !== false) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'ক্যাপচা কোডটি সঠিক হয়নি! অনুগ্রহ করে নতুন ক্যাপচা দেখে সঠিক সংখ্যাটি লিখুন।'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'message' => $errMsg
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'সার্ভার ত্রুটি: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
