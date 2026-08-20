<?php
/**
 * EducationBoardResult Engine
 * Handles official session, cookies and live scraping from:
 * 1. https://eboardresults.com
 * 2. https://www.educationboardresults.gov.bd
 */

class EducationBoardResult {
    private $cookieFile;
    private $baseUrls = [
        'https://eboardresults.com',
        'https://www.educationboardresults.gov.bd'
    ];
    private $activeBaseUrl = 'https://eboardresults.com';

    public function __construct($cookiePath = null) {
        if ($cookiePath) {
            $this->cookieFile = $cookiePath;
        } else {
            $cookieDir = __DIR__ . '/cookies';
            if (!is_dir($cookieDir)) {
                @mkdir($cookieDir, 0777, true);
            }
            $this->cookieFile = $cookieDir . '/edu_board_cookies.txt';
        }

        if (!file_exists($this->cookieFile)) {
            @touch($this->cookieFile);
            @chmod($this->cookieFile, 0666);
        }
    }

    private function getHeaders($referer, $isAjax = false) {
        $headers = [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language: en-US,en;q=0.9,bn;q=0.8',
            'sec-ch-ua: "Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'sec-ch-ua-mobile: ?0',
            'sec-ch-ua-platform: "Windows"',
            'Referer: ' . $referer
        ];

        if ($isAjax) {
            $headers[] = 'X-Requested-With: XMLHttpRequest';
            $headers[] = 'Accept: application/json, text/javascript, */*; q=0.01';
            $headers[] = 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8';
        } else {
            $headers[] = 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
        }

        return $headers;
    }

    public function getCaptcha() {
        if (!function_exists('curl_init')) {
            return [
                'status' => 'error',
                'message' => 'PHP cURL Extension is not enabled on this server. অনুগ্রহ করে cPanel থেকে PHP curl extension এনাবল করুন।'
            ];
        }

        $lastError = '';

        foreach ($this->baseUrls as $baseUrl) {
            // Clear existing cookies for a fresh session
            if (file_exists($this->cookieFile)) {
                @file_put_contents($this->cookieFile, '');
            }

            // 1. Initialize session on home page
            $ch = curl_init("{$baseUrl}/v2/home");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
                CURLOPT_COOKIEJAR => $this->cookieFile,
                CURLOPT_COOKIEFILE => $this->cookieFile,
                CURLOPT_TIMEOUT => 12,
                CURLOPT_CONNECTTIMEOUT => 7,
                CURLOPT_HTTPHEADER => $this->getHeaders("{$baseUrl}/v2/home")
            ]);
            $homeRes = curl_exec($ch);
            $homeHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            // 2. Fetch binary captcha image
            $random = microtime(true) * 1000;
            $captchaUrl = "{$baseUrl}/v2/captcha?r={$random}";

            $ch2 = curl_init($captchaUrl);
            curl_setopt_array($ch2, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
                CURLOPT_COOKIEFILE => $this->cookieFile,
                CURLOPT_TIMEOUT => 12,
                CURLOPT_CONNECTTIMEOUT => 7,
                CURLOPT_HTTPHEADER => array_merge($this->getHeaders("{$baseUrl}/v2/home"), [
                    'Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Sec-Fetch-Dest: image',
                    'Sec-Fetch-Mode: no-cors',
                    'Sec-Fetch-Site: same-origin'
                ])
            ]);

            $imageData = curl_exec($ch2);
            $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
            $contentType = curl_getinfo($ch2, CURLINFO_CONTENT_TYPE);
            $curlError = curl_error($ch2);
            curl_close($ch2);

            if ($httpCode2 === 200 && !empty($imageData) && strlen($imageData) > 30) {
                $this->activeBaseUrl = $baseUrl;
                $mime = !empty($contentType) ? $contentType : 'image/png';
                $base64 = 'data:' . $mime . ';base64,' . base64_encode($imageData);
                return [
                    'status' => 'success',
                    'captcha_image' => $base64,
                    'server' => $baseUrl,
                    'message' => 'অফিসিয়াল শিক্ষা বোর্ড ক্যাপচা লোড হয়েছে।'
                ];
            }

            $lastError = $curlError ?: "HTTP {$httpCode2} on {$baseUrl}";
        }

        return [
            'status' => 'error',
            'message' => 'শিক্ষা বোর্ডের কেন্দ্রীয় সার্ভার থেকে ক্যাপচা আনা যায়নি (' . $lastError . ')। অনুগ্রহ করে "নতুন ক্যাপচা" বাটনে ক্লিক করুন।'
        ];
    }

    public function fetchResult($board, $year, $roll, $reg, $captcha, $exam = 'ssc') {
        if (!function_exists('curl_init')) {
            return [
                'status' => 1,
                'msg' => 'PHP cURL Extension is not enabled.'
            ];
        }

        // Clean & normalize inputs
        $board = strtolower(trim($board));
        $year = trim($year);
        $roll = trim($roll);
        $reg = trim($reg);
        $captcha = trim($captcha);

        $postData = [
            'board' => $board,
            'exam' => $exam,
            'year' => $year,
            'result_type' => '1',
            'roll' => $roll,
            'reg' => $reg,
            'captcha' => $captcha,
            'submit' => 'View Result'
        ];

        $lastError = '';

        foreach ($this->baseUrls as $baseUrl) {
            $ch = curl_init("{$baseUrl}/v2/getres");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query($postData),
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
                CURLOPT_COOKIEFILE => $this->cookieFile,
                CURLOPT_TIMEOUT => 20,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_HTTPHEADER => array_merge($this->getHeaders("{$baseUrl}/v2/home", true), [
                    'Origin: ' . $baseUrl
                ])
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($httpCode === 200 && !empty($response)) {
                $json = json_decode($response, true);
                if (is_array($json)) {
                    return $json;
                }
            }

            $lastError = $curlError ?: "HTTP {$httpCode} on {$baseUrl}";
        }

        return [
            'status' => 1,
            'msg' => 'শিক্ষা বোর্ডের কেন্দ্রীয় সার্ভার থেকে ফলাফল পাওয়া যায়নি (' . $lastError . ')।'
        ];
    }
}
