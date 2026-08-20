<?php
/**
 * EducationBoardResult Engine
 *
 * Server-side proxy for the official Bangladesh Education Board result
 * endpoints. Captcha and verification are bound to the same PHP session and
 * provider cookie jar, preventing browser CORS/cookie problems and preventing
 * one applicant's captcha session from overwriting another applicant's.
 */

class EducationBoardResult {
    private $cookieDir;
    private $activeBaseUrl = null;

    private $baseUrls = [
        'https://eboardresults.com',
        'https://www.educationboardresults.gov.bd'
    ];

    public function __construct($cookiePath = null) {
        $this->cookieDir = __DIR__ . '/cookies';

        if (!is_dir($this->cookieDir)) {
            @mkdir($this->cookieDir, 0700, true);
        }

        if ($cookiePath) {
            $dir = dirname($cookiePath);
            if (is_dir($dir) || @mkdir($dir, 0700, true)) {
                $this->cookieDir = $dir;
            }
        }
    }

    /** Make the cookie jar unique per browser PHP session and provider. */
    private function cookieFile($baseUrl) {
        $host = parse_url($baseUrl, PHP_URL_HOST) ?: 'default';
        $safeHost = preg_replace('/[^a-z0-9._-]+/i', '_', $host);
        $session = function_exists('session_id') ? session_id() : '';
        $session = $session ?: 'anonymous';
        $safeSession = preg_replace('/[^a-z0-9_-]+/i', '_', $session);

        return rtrim($this->cookieDir, '/\\')
            . '/edu_board_' . $safeSession . '_' . $safeHost . '.txt';
    }

    private function resetCookieFile($baseUrl) {
        $file = $this->cookieFile($baseUrl);
        if (file_exists($file)) {
            @unlink($file);
        }
        @touch($file);
        @chmod($file, 0600);
        return $file;
    }

    private function getHeaders($referer, $isAjax = false) {
        $headers = [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language: bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
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

    private function isValidCaptchaPayload($data, $contentType) {
        if (!is_string($data) || strlen($data) < 30) {
            return false;
        }

        $contentType = strtolower((string)$contentType);
        if (strpos($contentType, 'image/') !== false) {
            return true;
        }

        $prefix = substr($data, 0, 16);
        return substr($prefix, 0, 8) === "\x89PNG\r\n\x1a\n"
            || substr($prefix, 0, 3) === "\xFF\xD8\xFF"
            || strpos($prefix, 'GIF8') === 0
            || strpos($prefix, '<svg') !== false;
    }

    private function request($url, $options = []) {
        $ch = curl_init($url);
        curl_setopt_array($ch, $options + [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 4,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_ENCODING => '',
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
        ]);

        $body = curl_exec($ch);
        $info = curl_getinfo($ch);
        $error = curl_error($ch);
        curl_close($ch);

        return [
            'body' => $body,
            'http' => (int)($info['http_code'] ?? 0),
            'content_type' => (string)($info['content_type'] ?? ''),
            'error' => $error
        ];
    }

    private function initProviderSession($baseUrl) {
        $cookieFile = $this->resetCookieFile($baseUrl);
        $homeUrl = $baseUrl . '/v2/home';

        $res = $this->request($homeUrl, [
            CURLOPT_COOKIEJAR => $cookieFile,
            CURLOPT_COOKIEFILE => $cookieFile,
            CURLOPT_HTTPHEADER => $this->getHeaders($homeUrl)
        ]);

        if ($res['error'] || $res['http'] < 200 || $res['http'] >= 400) {
            return [
                'ok' => false,
                'cookie' => $cookieFile,
                'message' => $res['error'] ?: "HTTP {$res['http']} from {$homeUrl}"
            ];
        }

        $this->activeBaseUrl = $baseUrl;
        return ['ok' => true, 'cookie' => $cookieFile];
    }

    public function getCaptcha() {
        if (!function_exists('curl_init')) {
            return [
                'status' => 'error',
                'message' => 'PHP cURL Extension is not enabled on this server. cPanel থেকে PHP cURL extension চালু করুন।'
            ];
        }

        // One PHP session = one applicant/browser captcha session.
        if (session_status() !== PHP_SESSION_ACTIVE) {
            @session_start();
        }

        // Remove stale provider selection when generating a new captcha.
        unset($_SESSION['edu_board_captcha_provider']);

        $errors = [];

        foreach ($this->baseUrls as $baseUrl) {
            $session = $this->initProviderSession($baseUrl);
            if (!$session['ok']) {
                $errors[] = $session['message'];
                continue;
            }

            $cookieFile = $session['cookie'];
            $homeUrl = $baseUrl . '/v2/home';
            $captchaUrl = $baseUrl . '/v2/captcha?r=' . rawurlencode((string)microtime(true));

            $res = $this->request($captchaUrl, [
                CURLOPT_COOKIEFILE => $cookieFile,
                CURLOPT_COOKIEJAR => $cookieFile,
                CURLOPT_HTTPHEADER => array_merge($this->getHeaders($homeUrl), [
                    'Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                ])
            ]);

            if ($res['http'] === 200 && $this->isValidCaptchaPayload($res['body'], $res['content_type'])) {
                $mime = $res['content_type'];
                if (!$mime || strpos(strtolower($mime), 'image/') !== 0) {
                    $mime = 'image/png';
                }

                $_SESSION['edu_board_captcha_provider'] = $baseUrl;
                $_SESSION['edu_board_captcha_created'] = time();

                return [
                    'status' => 'success',
                    'captcha_image' => 'data:' . $mime . ';base64,' . base64_encode($res['body']),
                    'server' => $baseUrl,
                    'message' => 'অফিসিয়াল শিক্ষা বোর্ড ক্যাপচা লোড হয়েছে।'
                ];
            }

            $errors[] = $res['error'] ?: "HTTP {$res['http']} / invalid captcha response from {$baseUrl}";
        }

        return [
            'status' => 'error',
            'message' => 'শিক্ষা বোর্ডের অফিসিয়াল সার্ভার থেকে ক্যাপচা লোড করা যায়নি। ' . implode(' | ', $errors)
        ];
    }

    public function fetchResult($board, $year, $roll, $reg, $captcha, $exam = 'ssc') {
        if (!function_exists('curl_init')) {
            return [
                'status' => 1,
                'msg' => 'PHP cURL Extension is not enabled.'
            ];
        }

        if (session_status() !== PHP_SESSION_ACTIVE) {
            @session_start();
        }

        $board = strtolower(trim((string)$board));
        $year = trim((string)$year);
        $roll = trim((string)$roll);
        $reg = trim((string)$reg);
        $captcha = trim((string)$captcha);
        $exam = trim((string)$exam) ?: 'ssc';

        if ($board === '' || $year === '' || $roll === '' || $captcha === '') {
            return [
                'status' => 1,
                'msg' => 'বোর্ড, সাল, রোল এবং ক্যাপচা পূরণ করুন।'
            ];
        }

        // NEVER switch provider during verification. The captcha must be
        // submitted to exactly the provider that generated it.
        $provider = $_SESSION['edu_board_captcha_provider'] ?? null;
        $created = (int)($_SESSION['edu_board_captcha_created'] ?? 0);

        if (!$provider || !in_array($provider, $this->baseUrls, true)) {
            return [
                'status' => 1,
                'msg' => 'ভেরিফিকেশন সেশন পাওয়া যায়নি। অনুগ্রহ করে নতুন ক্যাপচা লোড করুন।'
            ];
        }

        // Captcha sessions are intentionally short-lived.
        if ($created > 0 && (time() - $created) > 10 * 60) {
            unset($_SESSION['edu_board_captcha_provider'], $_SESSION['edu_board_captcha_created']);
            return [
                'status' => 1,
                'msg' => 'ক্যাপচার মেয়াদ শেষ হয়েছে। অনুগ্রহ করে নতুন ক্যাপচা লোড করুন।'
            ];
        }

        $cookieFile = $this->cookieFile($provider);
        if (!file_exists($cookieFile) || filesize($cookieFile) === 0) {
            return [
                'status' => 1,
                'msg' => 'ক্যাপচা সেশন পাওয়া যায়নি। অনুগ্রহ করে নতুন ক্যাপচা লোড করুন।'
            ];
        }

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

        $homeUrl = $provider . '/v2/home';
        $res = $this->request($provider . '/v2/getres', [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($postData, '', '&'),
            CURLOPT_COOKIEFILE => $cookieFile,
            CURLOPT_COOKIEJAR => $cookieFile,
            CURLOPT_HTTPHEADER => array_merge($this->getHeaders($homeUrl, true), [
                'Origin: ' . $provider
            ])
        ]);

        if ($res['http'] !== 200 || trim((string)$res['body']) === '') {
            return [
                'status' => 1,
                'msg' => $res['error'] ?: 'শিক্ষা বোর্ডের অফিসিয়াল সার্ভার থেকে ফলাফল পাওয়া যায়নি। আবার চেষ্টা করুন।'
            ];
        }

        $json = json_decode($res['body'], true);
        if (!is_array($json)) {
            return [
                'status' => 1,
                'msg' => 'অফিসিয়াল সার্ভারের উত্তর সঠিক ফরম্যাটে পাওয়া যায়নি।'
            ];
        }

        // Captcha is single-use in practice; force a fresh session after a
        // verification attempt so an old captcha cannot be reused accidentally.
        unset($_SESSION['edu_board_captcha_provider'], $_SESSION['edu_board_captcha_created']);

        return $json;
    }
}
