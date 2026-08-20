<?php

/**
 * Education Board Result Engine
 *
 * Uses the proven working flow from the supplied successful project:
 *   1) Use one persistent upstream cookie jar.
 *   2) GET /v2/home and solve the anti-bot challenge when present.
 *   3) GET /v2/home again with the same cookies.
 *   4) GET /v2/captcha with the same cookies.
 *   5) POST /v2/getres with the same cookies; do not recreate the session.
 */
class EducationBoardResult {
    private $baseUrl = 'https://www.educationboardresults.gov.bd';
    private $cookieFile;
    private $ch;

    public function __construct() {
        $cookieDir = __DIR__ . '/cookies';
        if (!is_dir($cookieDir)) {
            @mkdir($cookieDir, 0777, true);
        }

        // Match the proven project: one stable upstream cookie jar.
        // The browser never talks to the official service directly, so this
        // cookie jar belongs only to the ASPI backend proxy.
        $this->cookieFile = $cookieDir . '/edu_board_cookies.txt';
        if (!file_exists($this->cookieFile)) {
            @touch($this->cookieFile);
            @chmod($this->cookieFile, 0666);
        }

        $this->initCurl();
    }

    private function initCurl() {
        if (!function_exists('curl_init')) {
            throw new Exception('PHP cURL Extension is not enabled on this server.');
        }

        $this->ch = curl_init();
        curl_setopt_array($this->ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_COOKIEFILE => $this->cookieFile,
            CURLOPT_COOKIEJAR => $this->cookieFile,
            // Keep this identical to the supplied working project. Some
            // shared-hosting/OpenSSL environments fail verification upstream.
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            CURLOPT_HEADER => false,
            CURLOPT_ENCODING => '',
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_TIMEOUT => 60,
        ]);
    }

    public function getBaseUrl() {
        return $this->baseUrl;
    }

    private function get($url, $headers = []) {
        curl_setopt_array($this->ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => false,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => null,
        ]);

        $response = curl_exec($this->ch);
        if ($response === false) {
            throw new Exception('Official server request failed: ' . curl_error($this->ch));
        }

        return $response;
    }

    private function post($url, $data, $json = false, $headers = []) {
        curl_setopt($this->ch, CURLOPT_URL, $url);
        curl_setopt($this->ch, CURLOPT_POST, true);

        if ($json) {
            $data = json_encode($data, JSON_UNESCAPED_UNICODE);
            $headers[] = 'Content-Type: application/json';
            $headers[] = 'Accept: application/json, text/plain, */*';
        } else {
            if (is_array($data)) {
                $data = http_build_query($data, '', '&');
            }
            $headers[] = 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8';
            $headers[] = 'Accept: */*';
        }

        curl_setopt($this->ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($this->ch, CURLOPT_POSTFIELDS, $data);

        $response = curl_exec($this->ch);
        if ($response === false) {
            throw new Exception('Official server POST failed: ' . curl_error($this->ch));
        }

        return $response;
    }

    /**
     * Solve the anti-bot puzzle challenge exposed by /v2/home.
     */
    public function solveChallenge() {
        $homeUrl = $this->baseUrl . '/v2/home';

        $html = $this->get($homeUrl, [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language: bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer: ' . $this->baseUrl . '/'
        ]);

        if (!$html) {
            throw new Exception('চ্যালেঞ্জ পেজ লোড করা যায়নি');
        }

        // The supplied working project uses this exact challenge shape.
        if (!preg_match('/var\s+challenge\s*=\s*(\{.*?\});/s', $html, $matches)) {
            return true; // already accepted / challenge not required
        }

        $challenge = json_decode($matches[1], true);
        if (!is_array($challenge) || !isset($challenge['token']) || !isset($challenge['missing']['id'])) {
            throw new Exception('চ্যালেঞ্জ ডেটা পার্স করা যায়নি');
        }

        $answer = 'puzzle:' . $challenge['missing']['id'];

        $response = $this->post(
            $this->baseUrl . '/_challenge-verify',
            [
                'token' => $challenge['token'],
                'answer' => $answer,
            ],
            true,
            [
                'Origin: ' . $this->baseUrl,
                'Referer: ' . $homeUrl,
                'X-Requested-With: XMLHttpRequest',
            ]
        );

        $result = json_decode($response, true);
        if (!is_array($result) || ($result['ok'] ?? false) !== true) {
            throw new Exception('চ্যালেঞ্জ ভেরিফিকেশন ব্যর্থ হয়েছে');
        }

        return true;
    }

    /**
     * Get the official captcha image using the same cookie jar.
     */
    public function getCaptchaImage() {
        // Keep the exact successful sequence supplied by the user.
        $this->solveChallenge();

        $homeUrl = $this->baseUrl . '/v2/home';
        $this->get($homeUrl, [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language: bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer: ' . $this->baseUrl . '/'
        ]);

        $captchaUrl = $this->baseUrl . '/v2/captcha?r=' . rawurlencode((string)microtime(true));
        $captcha = $this->get($captchaUrl, [
            'Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language: bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer: ' . $homeUrl,
        ]);

        if (strlen((string)$captcha) < 30) {
            throw new Exception('অফিসিয়াল সার্ভার থেকে ক্যাপচা ইমেজ পাওয়া যায়নি');
        }

        $prefix = substr($captcha, 0, 32);
        $looksLikeImage = substr($prefix, 0, 8) === "\x89PNG\r\n\x1a\n"
            || substr($prefix, 0, 3) === "\xFF\xD8\xFF"
            || strpos($prefix, 'GIF8') === 0
            || strpos($prefix, '<svg') !== false;

        if (!$looksLikeImage) {
            throw new Exception('অফিসিয়াল সার্ভার থেকে বৈধ ক্যাপচা ইমেজ পাওয়া যায়নি');
        }

        return $captcha;
    }

    /**
     * Submit result using the exact same persistent upstream cookie jar.
     */
    public function fetchResult($board, $year, $roll, $reg, $captcha, $exam = 'ssc') {
        $postData = [
            'board' => strtolower(trim((string)$board)),
            'exam' => trim((string)$exam) ?: 'ssc',
            'year' => trim((string)$year),
            'result_type' => '1',
            'roll' => trim((string)$roll),
            'reg' => trim((string)$reg),
            'captcha' => trim((string)$captcha),
            'submit' => 'View Result'
        ];

        $response = $this->post(
            $this->baseUrl . '/v2/getres',
            $postData,
            false,
            [
                'Accept: application/json, text/javascript, */*; q=0.01',
                'Accept-Language: bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
                'Origin: ' . $this->baseUrl,
                'Referer: ' . $this->baseUrl . '/v2/home',
                'X-Requested-With: XMLHttpRequest',
            ]
        );

        $json = json_decode($response, true);
        if (!is_array($json)) {
            throw new Exception('শিক্ষা বোর্ডের সার্ভার থেকে অবৈধ রেসপন্স পাওয়া গেছে।');
        }

        return $json;
    }
}
