<?php

function hash_owner_token(string $ownerKey): string {
  return hash('sha256', $ownerKey);
}

function random_token(int $bytes = 32): string {
  return bin2hex(random_bytes($bytes));
}

function is_valid_access_code(string $code): bool {
  return (bool) preg_match('/^[A-Za-z0-9]{8}$/', $code);
}

function is_valid_display_name(string $name): bool {
  // Huruf saja (unicode letters), min 3
  return (bool) preg_match('/^[\p{L}]{3,64}$/u', $name);
}

function is_valid_note_id(string $id): bool {
  return (bool) preg_match('/^[A-Za-z0-9_.:\-]{8,64}$/', $id);
}

/**
 * Rate limit sangat sederhana berbasis file (shared hosting friendly).
 * Untuk production berat, ganti Redis/APCu.
 */
function rate_limit_check(array $cfg): void {
  $limit = (int) ($cfg['rate_limit_per_minute'] ?? 120);
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  $dir = sys_get_temp_dir() . '/meimo_rl';
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $file = $dir . '/' . hash('sha256', $ip) . '.json';
  $now = time();
  $window = 60;
  $data = ['start' => $now, 'count' => 0];
  if (is_file($file)) {
    $raw = @file_get_contents($file);
    $parsed = $raw ? json_decode($raw, true) : null;
    if (is_array($parsed) && isset($parsed['start'], $parsed['count'])) {
      $data = $parsed;
    }
  }
  if ($now - (int) $data['start'] >= $window) {
    $data = ['start' => $now, 'count' => 0];
  }
  $data['count'] = (int) $data['count'] + 1;
  @file_put_contents($file, json_encode($data), LOCK_EX);
  if ($data['count'] > $limit) {
    json_error('Rate limit exceeded', 429);
  }
}
