# Phase 4 — Editor collaboration

## Dual-path
- Local: IndexedDB via document-service.saveNote (backup + Shared tab list)
- Server: shared-api push/poll when `metadata.sharedMeta.serverSynced`

## Lock model
- One session per blockId
- TTL refreshed on re-lock (server lock_ttl_seconds)
- Unfocus editor body = release own locks (neutral view mode)

## Versioning
- shared_notes.version increments on each successful push
- Client sends baseVersion; mismatch → 409 + full document
