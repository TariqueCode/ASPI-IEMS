<?php
/**
 * ASPI Upload Garbage Collector
 * Deletes files in assets/uploads that are no longer referenced by data/db.json.
 * Keeps .gitkeep and never touches files outside the uploads directory.
 */

function aspiCollectUploadReferences($value, array &$refs = []): array
{
    if (is_array($value)) {
        foreach ($value as $item) {
            aspiCollectUploadReferences($item, $refs);
        }
        return $refs;
    }

    if (!is_string($value) || $value === '') {
        return $refs;
    }

    if (preg_match_all('~assets/uploads/([^\"\'<>?#\\]+)~', $value, $matches)) {
        foreach ($matches[1] as $name) {
            $name = basename(rawurldecode($name));
            if ($name !== '' && $name !== '.gitkeep') {
                $refs[$name] = true;
            }
        }
    }

    return $refs;
}

function aspiCleanupUnreferencedUploads(?array $db = null): int
{
    $baseDir = __DIR__;
    $uploadDir = $baseDir . '/assets/uploads';
    $dbFile = $baseDir . '/data/db.json';

    if (!is_dir($uploadDir)) {
        return 0;
    }

    if ($db === null) {
        $db = [];
        if (is_file($dbFile)) {
            $decoded = json_decode((string)@file_get_contents($dbFile), true);
            if (is_array($decoded)) {
                $db = $decoded;
            }
        }
    }

    $refs = [];
    aspiCollectUploadReferences($db, $refs);

    $removed = 0;
    foreach (glob($uploadDir . '/*') ?: [] as $path) {
        if (!is_file($path)) {
            continue;
        }

        $name = basename($path);
        if ($name === '.gitkeep' || isset($refs[$name])) {
            continue;
        }

        // Only delete regular files directly inside assets/uploads.
        $realUploadDir = realpath($uploadDir);
        $realPath = realpath($path);
        if (!$realUploadDir || !$realPath || dirname($realPath) !== $realUploadDir) {
            continue;
        }

        if (@unlink($realPath)) {
            $removed++;
        }
    }

    return $removed;
}
