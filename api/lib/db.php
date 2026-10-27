<?php

function db_connect(array $cfg): PDO {
  $d = $cfg['db'];
  $dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    $d['host'],
    $d['name'],
    $d['charset'] ?? 'utf8mb4'
  );
  $pdo = new PDO($dsn, $d['user'], $d['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  return $pdo;
}

function now_utc(): string {
  return gmdate('Y-m-d H:i:s');
}
