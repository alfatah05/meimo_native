<?php
/**
 * Meimo Shared Notes API — single front controller.
 * Upload folder `api/` ke public_html (atau subdomain).
 * Contoh: https://domain.com/api/?action=poll
 *
 * Actions:
 *   share | join | poll | push | lock | unlock | presence | unshare | change-code | health
 */

declare(strict_types=1);

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['ok' => false, 'error' => 'config.php missing — copy config.example.php']);
  exit;
}

$cfg = require $configPath;
require __DIR__ . '/lib/response.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/auth.php';

apply_cors($cfg);
rate_limit_check($cfg);

$action = $_GET['action'] ?? $_POST['action'] ?? '';
if ($action === '' && isset($_SERVER['PATH_INFO'])) {
  $action = trim($_SERVER['PATH_INFO'], '/');
}

try {
  $pdo = db_connect($cfg);
} catch (Throwable $e) {
  json_error('Database connection failed', 500);
}

switch ($action) {
  case 'health':
    json_out(['ok' => true, 'service' => 'meimo-shared', 'time' => now_utc()]);

  case 'share':
    handle_share($pdo, $cfg);
  case 'join':
    handle_join($pdo, $cfg);
  case 'poll':
    handle_poll($pdo, $cfg);
  case 'push':
    handle_push($pdo, $cfg);
  case 'lock':
    handle_lock($pdo, $cfg);
  case 'unlock':
    handle_unlock($pdo, $cfg);
  case 'presence':
    handle_presence($pdo, $cfg);
  case 'unshare':
    handle_unshare($pdo, $cfg);
  case 'change-code':
    handle_change_code($pdo, $cfg);
  default:
    json_error('Unknown action', 404, ['actions' => [
      'health','share','join','poll','push','lock','unlock','presence','unshare','change-code'
    ]]);
}

/* ===================== handlers ===================== */

function purge_stale(PDO $pdo, array $cfg, string $noteId): void {
  $now = now_utc();
  $pdo->prepare('DELETE FROM shared_locks WHERE note_id = ? AND expires_at < ?')
    ->execute([$noteId, $now]);
  $ttl = (int) ($cfg['session_ttl_seconds'] ?? 120);
  $pdo->prepare('DELETE FROM shared_sessions WHERE note_id = ? AND last_seen < DATE_SUB(?, INTERVAL ? SECOND)')
    ->execute([$noteId, $now, $ttl]);
}

function require_session(PDO $pdo, array $cfg, string $noteId): array {
  $token = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
  if ($token === '') {
    $body = read_json_body();
    $token = (string) ($body['sessionToken'] ?? '');
  }
  if ($token === '' || !preg_match('/^[a-f0-9]{64}$/', $token)) {
    json_error('Missing or invalid session token', 401);
  }
  purge_stale($pdo, $cfg, $noteId);
  $st = $pdo->prepare('SELECT * FROM shared_sessions WHERE session_token = ? AND note_id = ? LIMIT 1');
  $st->execute([$token, $noteId]);
  $row = $st->fetch();
  if (!$row) json_error('Session expired or invalid', 401);
  $pdo->prepare('UPDATE shared_sessions SET last_seen = ? WHERE id = ?')
    ->execute([now_utc(), $row['id']]);
  return $row;
}

function get_note_or_404(PDO $pdo, string $noteId): array {
  $st = $pdo->prepare('SELECT * FROM shared_notes WHERE note_id = ? LIMIT 1');
  $st->execute([$noteId]);
  $row = $st->fetch();
  if (!$row) json_error('Note not found', 404);
  return $row;
}

function handle_share(PDO $pdo, array $cfg): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_error('POST required', 405);
  $body = read_json_body();
  $noteId = trim((string) ($body['noteId'] ?? ''));
  $accessCode = (string) ($body['accessCode'] ?? '');
  $ownerKey = (string) ($body['ownerKey'] ?? '');
  $title = (string) ($body['title'] ?? '');
  $document = $body['document'] ?? null;

  if (!is_valid_note_id($noteId)) json_error('Invalid noteId');
  if (!is_valid_access_code($accessCode)) json_error('Invalid access code (8 alphanumeric)');
  if (strlen($ownerKey) < 8) json_error('Owner key required');
  if (!is_array($document)) json_error('document object required');

  $json = json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) json_error('document not serializable');
  $max = (int) ($cfg['max_document_bytes'] ?? 2000000);
  if (strlen($json) > $max) json_error('Document too large', 413);

  $exists = $pdo->prepare('SELECT id FROM shared_notes WHERE note_id = ? LIMIT 1');
  $exists->execute([$noteId]);
  if ($exists->fetch()) json_error('Note already shared', 409);

  $now = now_utc();
  $hash = hash_owner_token($ownerKey);
  $ins = $pdo->prepare(
    'INSERT INTO shared_notes (note_id, access_code, owner_token_hash, title, document_json, version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
  );
  $ins->execute([$noteId, $accessCode, $hash, mb_substr($title, 0, 500), $json, $now, $now]);

  // Create owner session so owner can edit immediately
  $displayName = (string) ($body['displayName'] ?? 'Owner');
  if (!is_valid_display_name($displayName)) $displayName = 'Owner';
  $session = random_token(32);
  $pdo->prepare(
    'INSERT INTO shared_sessions (note_id, session_token, display_name, last_seen, created_at) VALUES (?,?,?,?,?)'
  )->execute([$noteId, $session, $displayName, $now, $now]);

  json_out([
    'ok' => true,
    'noteId' => $noteId,
    'version' => 1,
    'sessionToken' => $session,
  ]);
}

function handle_join(PDO $pdo, array $cfg): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_error('POST required', 405);
  $body = read_json_body();
  $noteId = trim((string) ($body['noteId'] ?? ''));
  $accessCode = (string) ($body['accessCode'] ?? '');
  $displayName = trim((string) ($body['displayName'] ?? ''));

  if (!is_valid_note_id($noteId)) json_error('Invalid noteId');
  if (!is_valid_access_code($accessCode)) json_error('Invalid access code');
  if (!is_valid_display_name($displayName)) json_error('Name must be 3+ letters only');

  $note = get_note_or_404($pdo, $noteId);
  if (!hash_equals($note['access_code'], $accessCode)) {
    json_error('Wrong access code', 403);
  }

  purge_stale($pdo, $cfg, $noteId);
  $max = (int) ($cfg['max_concurrent'] ?? 5);
  $cnt = $pdo->prepare('SELECT COUNT(*) AS c FROM shared_sessions WHERE note_id = ?');
  $cnt->execute([$noteId]);
  $c = (int) $cnt->fetch()['c'];
  if ($c >= $max) json_error('Room full (max ' . $max . ' users)', 429);

  $now = now_utc();
  $session = random_token(32);
  $pdo->prepare(
    'INSERT INTO shared_sessions (note_id, session_token, display_name, last_seen, created_at) VALUES (?,?,?,?,?)'
  )->execute([$noteId, $session, $displayName, $now, $now]);

  $doc = json_decode($note['document_json'], true);
  json_out([
    'ok' => true,
    'noteId' => $noteId,
    'title' => $note['title'],
    'version' => (int) $note['version'],
    'document' => $doc,
    'sessionToken' => $session,
    'displayName' => $displayName,
  ]);
}

function handle_poll(PDO $pdo, array $cfg): void {
  $noteId = trim((string) ($_GET['noteId'] ?? ''));
  if ($noteId === '') {
    $body = read_json_body();
    $noteId = trim((string) ($body['noteId'] ?? ''));
  }
  if (!is_valid_note_id($noteId)) json_error('Invalid noteId');
  $session = require_session($pdo, $cfg, $noteId);
  $note = get_note_or_404($pdo, $noteId);
  purge_stale($pdo, $cfg, $noteId);

  $since = isset($_GET['sinceVersion']) ? (int) $_GET['sinceVersion'] : null;
  $version = (int) $note['version'];

  $locks = $pdo->prepare(
    'SELECT block_id, session_token, display_name, locked_at, expires_at FROM shared_locks WHERE note_id = ?'
  );
  $locks->execute([$noteId]);
  $lockRows = $locks->fetchAll();

  $pres = $pdo->prepare(
    'SELECT display_name, last_seen, session_token FROM shared_sessions WHERE note_id = ? ORDER BY last_seen DESC'
  );
  $pres->execute([$noteId]);
  $presence = $pres->fetchAll();

  $out = [
    'ok' => true,
    'noteId' => $noteId,
    'version' => $version,
    'updatedAt' => $note['updated_at'],
    'locks' => array_map(static function ($r) use ($session) {
      return [
        'blockId' => $r['block_id'],
        'displayName' => $r['display_name'],
        'isMine' => hash_equals($r['session_token'], $session['session_token']),
        'expiresAt' => $r['expires_at'],
      ];
    }, $lockRows),
    'presence' => array_map(static function ($r) use ($session) {
      return [
        'displayName' => $r['display_name'],
        'lastSeen' => $r['last_seen'],
        'isMe' => hash_equals($r['session_token'], $session['session_token']),
      ];
    }, $presence),
    'changed' => true,
  ];

  if ($since !== null && $since === $version) {
    $out['changed'] = false;
    $out['document'] = null;
  } else {
    $out['document'] = json_decode($note['document_json'], true);
    $out['title'] = $note['title'];
  }

  json_out($out);
}

function handle_push(PDO $pdo, array $cfg): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_error('POST required', 405);
  $body = read_json_body();
  $noteId = trim((string) ($body['noteId'] ?? ''));
  if (!is_valid_note_id($noteId)) json_error('Invalid noteId');
  $session = require_session($pdo, $cfg, $noteId);
  $baseVersion = (int) ($body['baseVersion'] ?? 0);
  $document = $body['document'] ?? null;
  $title = isset($body['title']) ? (string) $body['title'] : null;
  if (!is_array($document)) json_error('document required');

  $json = json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) json_error('document not serializable');
  $max = (int) ($cfg['max_document_bytes'] ?? 2000000);
  if (strlen($json) > $max) json_error('Document too large', 413);

  $pdo->beginTransaction();
  try {
    $st = $pdo->prepare('SELECT * FROM shared_notes WHERE note_id = ? FOR UPDATE');
    $st->execute([$noteId]);
    $note = $st->fetch();
    if (!$note) {
      $pdo->rollBack();
      json_error('Note not found', 404);
    }
    $current = (int) $note['version'];
    if ($baseVersion !== $current) {
      $pdo->rollBack();
      json_out([
        'ok' => false,
        'error' => 'version_conflict',
        'version' => $current,
        'document' => json_decode($note['document_json'], true),
        'title' => $note['title'],
      ], 409);
    }
    $newVer = $current + 1;
    $now = now_utc();
    $newTitle = $title !== null ? mb_substr($title, 0, 500) : $note['title'];
    $pdo->prepare(
      'UPDATE shared_notes SET document_json = ?, title = ?, version = ?, updated_at = ? WHERE note_id = ?'
    )->execute([$json, $newTitle, $newVer, $now, $noteId]);
    $pdo->commit();
    json_out(['ok' => true, 'version' => $newVer, 'updatedAt' => $now]);
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_error('Push failed', 500);
  }
}

function handle_lock(PDO $pdo, array $cfg): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_error('POST required', 405);
  $body = read_json_body();
  $noteId = trim((string) ($body['noteId'] ?? ''));
  $blockId = trim((string) ($body['blockId'] ?? ''));
  if (!is_valid_note_id($noteId) || $blockId === '' || strlen($blockId) > 64) {
    json_error('Invalid noteId/blockId');
  }
  $session = require_session($pdo, $cfg, $noteId);
  get_note_or_404($pdo, $noteId);
  purge_stale($pdo, $cfg, $noteId);

  $ttl = (int) ($cfg['lock_ttl_seconds'] ?? 60);
  $now = now_utc();
  $expires = gmdate('Y-m-d H:i:s', time() + $ttl);

  $st = $pdo->prepare('SELECT * FROM shared_locks WHERE note_id = ? AND block_id = ? LIMIT 1');
  $st->execute([$noteId, $blockId]);
  $existing = $st->fetch();
  if ($existing && !hash_equals($existing['session_token'], $session['session_token'])) {
    json_error('Block locked by ' . $existing['display_name'], 423, [
      'displayName' => $existing['display_name'],
      'expiresAt' => $existing['expires_at'],
    ]);
  }

  if ($existing) {
    $pdo->prepare('UPDATE shared_locks SET expires_at = ?, locked_at = ? WHERE id = ?')
      ->execute([$expires, $now, $existing['id']]);
  } else {
    $pdo->prepare(
      'INSERT INTO shared_locks (note_id, block_id, session_token, display_name, locked_at, expires_at)
       VALUES (?,?,?,?,?,?)'
    )->execute([$noteId, $blockId, $session['session_token'], $session['display_name'], $now, $expires]);
  }

  json_out(['ok' => true, 'blockId' => $blockId, 'expiresAt' => $expires]);
}

function handle_unlock(PDO $pdo, array $cfg): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_error('POST required', 405);
  $body = read_json_body();
  $noteId = trim((string) ($body['noteId'] ?? ''));
  $blockId = trim((string) ($body['blockId'] ?? ''));
  if (!is_valid_note_id($noteId)) json_error('Invalid noteId');
  $session = require_session($pdo, $cfg, $noteId);

  if ($blockId === '' || $blockId === '*') {
    $pdo->prepare('DELETE FROM shared_locks WHERE note_id = ? AND session_token = ?')
      ->execute([$noteId, $session['session_token']]);
  } else {
    $pdo->prepare('DELETE FROM shared_locks WHERE note_id = ? AND block_id = ? AND session_token = ?')
      ->execute([$noteId, $blockId, $session['session_token']]);
  }
  json_out(['ok' => true]);
}

function handle_presence(PDO $pdo, array $cfg): void {
  $noteId = trim((string) ($_GET['noteId'] ?? ''));
  if ($noteId === '') {
    $body = read_json_body();
    $noteId = trim((string) ($body['noteId'] ?? ''));
  }
  if (!is_valid_note_id($noteId)) json_error('Invalid noteId');
  $session = require_session($pdo, $cfg, $noteId);
  purge_stale($pdo, $cfg, $noteId);
  $pres = $pdo->prepare(
    'SELECT display_name, last_seen, session_token FROM shared_sessions WHERE note_id = ?'
  );
  $pres->execute([$noteId]);
  $rows = $pres->fetchAll();
  json_out([
    'ok' => true,
    'presence' => array_map(static function ($r) use ($session) {
      return [
        'displayName' => $r['display_name'],
        'lastSeen' => $r['last_seen'],
        'isMe' => hash_equals($r['session_token'], $session['session_token']),
      ];
    }, $rows),
  ]);
}

function handle_unshare(PDO $pdo, array $cfg): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_error('POST required', 405);
  $body = read_json_body();
  $noteId = trim((string) ($body['noteId'] ?? ''));
  $ownerKey = (string) ($body['ownerKey'] ?? '');
  if (!is_valid_note_id($noteId)) json_error('Invalid noteId');
  if (strlen($ownerKey) < 8) json_error('Owner key required');

  $note = get_note_or_404($pdo, $noteId);
  $hash = hash_owner_token($ownerKey);
  if (!hash_equals($note['owner_token_hash'], $hash)) {
    json_error('Owner key mismatch', 403);
  }

  $pdo->prepare('DELETE FROM shared_locks WHERE note_id = ?')->execute([$noteId]);
  $pdo->prepare('DELETE FROM shared_sessions WHERE note_id = ?')->execute([$noteId]);
  $pdo->prepare('DELETE FROM shared_notes WHERE note_id = ?')->execute([$noteId]);
  json_out(['ok' => true]);
}

function handle_change_code(PDO $pdo, array $cfg): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_error('POST required', 405);
  $body = read_json_body();
  $noteId = trim((string) ($body['noteId'] ?? ''));
  $ownerKey = (string) ($body['ownerKey'] ?? '');
  $newCode = (string) ($body['accessCode'] ?? '');
  if (!is_valid_note_id($noteId)) json_error('Invalid noteId');
  if (!is_valid_access_code($newCode)) json_error('Invalid access code');
  if (strlen($ownerKey) < 8) json_error('Owner key required');

  $note = get_note_or_404($pdo, $noteId);
  if (!hash_equals($note['owner_token_hash'], hash_owner_token($ownerKey))) {
    json_error('Owner key mismatch', 403);
  }
  $pdo->prepare('UPDATE shared_notes SET access_code = ?, updated_at = ? WHERE note_id = ?')
    ->execute([$newCode, now_utc(), $noteId]);
  json_out(['ok' => true, 'accessCode' => $newCode]);
}
