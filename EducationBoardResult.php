<?php
/**
 * EducationBoardResult Engine
 *
 * Proxies the official Bangladesh Education Board result/captcha endpoints
 * through the institute server so the browser never needs to call the
 * government domain directly (avoids browser CORS/Cookie restrictions).
 *
 * Important: captcha and verification MUST use the same server-side session.
 */

class EducationBoardResult {
    private $cookieDir;
    private $activeBaseUrl = null;

    /**
     * Keep the official providers separate. A captcha issued by one provider
     * must never be submitted to another provider with a different session.
     */
    private $baseUrls = [
        'https://eboardresults.com',
        'https://www.educationboardresults.gov.bd'
    ];

    public function __construct($cookiePath = null) {
        $this->cookieDir = __DIR__ . '/cookies';

        if (!is_dir($this->cookieDir)) {
            @mkdir($this->cookieDir, 0700, true);
        }

        // Backward compatibility with the old constructor argument.
        // A directory is used internally; each provider gets its own cookie jar.
        if ($cookiePath) {
            $dir = dirname($cookiePath);
            if (is_dir($dir) || @mkdir($dir, 0700, true)) {
                $this->cookieDir = $dir;
            }
        }
    }

    private function cookieFile($baseUrl) {
        $host = parse_url($baseUrl, PHP_URL_HOST) ?: 'default';
        $safeHost = preg_replace('/[^a-z0-9._-]+/i', '_', $host);
        return rtrim($this->cookieDir, '/\\') . '/edu_board_' . $safeHost . '.txt';
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

        // Some upstream servers omit/misreport Content-Type. Detect common
        // image signatures so HTML error pages are never returned as captcha.
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
                'message' => $res['error'] ?: "HTTP {$res['http']} from {$baseUrl}/v2/home"
            ];
        }

        $this->activeBaseUrl = $baseUrl;
        return [
            'ok' => true,
            'cookie' => $cookieFile
        ];
    }

    public function getCaptcha() {
        if (!function_exists('curl_init')) {
            return [
                'status' => 'error',
                'message' => 'PHP cURL Extension is not enabled on this server. cPanel থেকে PHP cURL extension চালু করুন।'
            ];
        }

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

    /**
     * Submit verification using the provider session that generated the
     * currently active captcha. The provider is never switched mid-session.
     */
    public function fetchResult($board, $year, $roll, $reg, $captcha, $exam = 'ssc') {
        if (!function_exists('curl_init')) {
            return [
                'status' => 1,
                'msg' => 'PHP cURL Extension is not enabled.'
            ];
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

        // Prefer the provider selected by the most recently created session.
        // If there is no active provider in this PHP instance, test the cookie
        // jars without creating a new captcha session.
        $providers = [];
        if ($this->activeBaseUrl) {
            $providers[] = $this->activeBaseUrl;
        }
        foreach ($this->baseUrls as $baseUrl) {
            if (!in_array($baseUrl, $providers, true)) {
                $providers[] = $baseUrl;
            }
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

        $errors = [];

        foreach ($providers as $baseUrl) {
            $cookieFile = $this->cookieFile($baseUrl);
            if (!file_exists($cookieFile) || filesize($cookieFile) === 0) {
                continue;
            }

            $homeUrl = $baseUrl . '/v2/home';
            $res = $this->request($baseUrl . '/v2/getres', [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query($postData, '', '&'),
                CURLOPT_COOKIEFILE => $cookieFile,
                CURLOPT_COOKIEJAR => $cookieFile,
                CURLOPT_HTTPHEADER => array_merge($this->getHeaders($homeUrl, true), [
                    'Origin: ' . $baseUrl
                ])
            ]);

            if ($res['http'] !== 200 || trim((string)$res['body']) === '') {
                $errors[] = $res['error'] ?: "HTTP {$res['http']} from {$baseUrl}/v2/getres";
                continue;
            }

            $json = json_decode($res['body'], true);
            if (is_array($json)) {
                return $json;
            }

            $errors[] = "Invalid JSON response from {$baseUrl}";
        }

        return [
            'status' => 1,
            'msg' => 'ক্যাপচা/ভেরিফিকেশন সেশন পাওয়া যায়নি বা ক্যাপচা মেয়াদ শেষ হয়েছে। অনুগ্রহ করে নতুন ক্যাপচা লোড করে আবার চেষ্টা করুন।'
                . (empty($errors) ? '' : ' ' . implode(' | ', $errors))
        ];
    }
}
