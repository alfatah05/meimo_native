-- Meimo v2 Phase 3 — MySQL schema (shared hosting)
-- Import via phpMyAdmin / mysql CLI

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS shared_notes (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  note_id         VARCHAR(64)  NOT NULL,
  access_code     VARCHAR(8)   NOT NULL COMMENT 'plain 8-char; compare case-sensitive',
  owner_token_hash CHAR(64)    NOT NULL COMMENT 'sha256 hex of client Owner Key at share time',
  title           VARCHAR(500) NOT NULL DEFAULT '',
  document_json   LONGTEXT     NOT NULL,
  version         INT UNSIGNED NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL,
  updated_at      DATETIME     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_note_id (note_id),
  KEY idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shared_sessions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  note_id         VARCHAR(64)  NOT NULL,
  session_token   CHAR(64)     NOT NULL,
  display_name    VARCHAR(64)  NOT NULL,
  last_seen       DATETIME     NOT NULL,
  created_at      DATETIME     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session (session_token),
  KEY idx_note_seen (note_id, last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shared_locks (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  note_id         VARCHAR(64)  NOT NULL,
  block_id        VARCHAR(64)  NOT NULL,
  session_token   CHAR(64)     NOT NULL,
  display_name    VARCHAR(64)  NOT NULL,
  locked_at       DATETIME     NOT NULL,
  expires_at      DATETIME     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_note_block (note_id, block_id),
  KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: binary assets later (Phase 6). Keep documents self-contained JSON for v2.0.
