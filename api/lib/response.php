<?php

function json_out(array $data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function json_error(string $message, int $status = 400, array $extra = []): void {
  json_out(array_merge(['ok' => false, 'error' => $message], $extra), $status);
}

function read_json_body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || $raw === '') return [];
  $data = json_decode($raw, true);
  if (!is_array($data)) json_error('Invalid JSON body', 400);
  return $data;
}

function apply_cors(array $cfg): void {
  $origin = $cfg['cors_origin'] ?? '*';
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Token, X-Owner-Token');
  header('Access-Control-Max-Age: 86400');
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}
