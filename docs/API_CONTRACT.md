# Meimo Shared Notes — API Contract (Phase 3)

Base: `{API}/index.php?action={name}`

## Auth
- Join/share return `sessionToken` (64 hex).
- Subsequent poll/push/lock: header `X-Session-Token: {token}`.
- Unshare / change-code: body `ownerKey` (plaintext); server compares SHA-256.

## share
Request: `{ noteId, accessCode, ownerKey, title, document, displayName? }`
Response: `{ ok, noteId, version, sessionToken }`

## join
Request: `{ noteId, accessCode, displayName }`
Response: `{ ok, noteId, title, version, document, sessionToken, displayName }`

## poll
Query: `noteId`, optional `sinceVersion`
Response: `{ ok, version, changed, document|null, title?, locks[], presence[], updatedAt }`

## push
Request: `{ noteId, baseVersion, document, title? }`
Success: `{ ok, version, updatedAt }`
Conflict 409: `{ ok:false, error:"version_conflict", version, document, title }`

## lock / unlock
lock: `{ noteId, blockId }` → 423 if held by other
unlock: `{ noteId, blockId }` or `blockId:"*"` for all own locks

## unshare
`{ noteId, ownerKey }` deletes note + sessions + locks

## change-code
`{ noteId, ownerKey, accessCode }`
