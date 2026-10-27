<?php
/**
 * Salin jadi config.php dan isi kredensial MySQL hosting.
 * Jangan commit config.php ke git publik.
 */
return [
  'db' => [
    'host' => 'localhost',
    'name' => 'meimo_shared',
    'user' => 'db_user',
    'pass' => 'db_password',
    'charset' => 'utf8mb4',
  ],
  // CORS: domain web Meimo kamu (boleh * saat dev)
  'cors_origin' => '*',
  // Batas
  'max_concurrent' => 5,
  'lock_ttl_seconds' => 60,
  'session_ttl_seconds' => 120,
  'max_document_bytes' => 2_000_000, // ~2MB JSON
  // Rate limit kasar per IP (request / 60s)
  'rate_limit_per_minute' => 120,
];
