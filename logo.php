<?php
/**
 * ASPI early logo endpoint.
 * Reads the current live logo path from data/db.json and streams the file
 * directly so the browser can request the logo before Alpine/API rendering.
 */
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=300, must-revalidate');

$dbFile = __DIR__ . '/data/db.json';
$logoPath = '';

if (is_file($dbFile)) {
    $json = @file_get_contents($dbFile);
    if ($json !== false) {
        $data = json_decode($json, true);
        if (is_array($data)) {
            $logoPath = (string)($data['site']['logo'] ?? '');
        }
    }
}

// Only allow the dashboard-managed upload area. Never accept arbitrary paths.
$logoPath = ltrim(str_replace('\\', '/', $logoPath), '/');
$prefix = 'assets/uploads/';

if ($logoPath === '' || strncmp($logoPath, $prefix, strlen($prefix)) !== 0) {
    $logoPath = '';
}

$logoFile = $logoPath !== '' ? __DIR__ . '/' . $logoPath : '';

// Prevent path traversal even if the database was manually edited.
if ($logoFile !== '') {
    $realUploadDir = realpath(__DIR__ . '/assets/uploads');
    $realLogoFile = realpath($logoFile);
    if ($realUploadDir === false || $realLogoFile === false || strpos($realLogoFile, $realUploadDir . DIRECTORY_SEPARATOR) !== 0 || !is_file($realLogoFile)) {
        $logoFile = '';
    } else {
        $logoFile = $realLogoFile;
    }
}

// A tiny transparent SVG keeps the page free of broken-image icons until a
// real logo is uploaded from the dashboard.
if ($logoFile === '') {
    $empty = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="transparent"/></svg>';
    header('Content-Type: image/svg+xml; charset=UTF-8');
    header('Content-Length: ' . strlen($empty));
    echo $empty;
    exit;
}

$mime = function_exists('mime_content_type') ? @mime_content_type($logoFile) : false;
$allowed = [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'
];
if (!in_array($mime, $allowed, true)) {
    $ext = strtolower(pathinfo($logoFile, PATHINFO_EXTENSION));
    $mime = match ($ext) {
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        default => 'application/octet-stream'
    };
}

$stat = @stat($logoFile);
$etag = '"' . md5($logoFile . '|' . ($stat['mtime'] ?? 0) . '|' . ($stat['size'] ?? 0)) . '"';
header('ETag: ' . $etag);
header('Content-Type: ' . $mime);

if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
    http_response_code(304);
    exit;
}

readfile($logoFile);
