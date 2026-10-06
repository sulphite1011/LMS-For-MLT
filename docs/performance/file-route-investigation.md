# File route (`GET /api/resources/[id]/file`) — investigation

## How files are stored (from `src/models/Resource.ts`)
- `files`: array of `FileEntrySchema` sub-documents (`fileType`, `fileContent` Buffer, `fileName`, `fileSize`, `mimeType`,
  `externalLink`, `label`). Sub-documents have the default `_id`.
- `fileData`: legacy single file with the same fields, used when `files` is empty.
- The URL identifies the file by **array position**: `?index=<n>` (no index → first file / legacy file). Existing URLs rely on it.

## Current behaviour
1. (Phase 2) cheap query for `updatedAt` → `ETag`/304 for repeat requests.
2. Otherwise `findById(...).select("fileData.* files")` — loads **every** attachment's bytes, then picks one in JavaScript.

## Why it was left unchanged
Loading only the requested element needs a projection such as `files: { $slice: [index, 1] }` (or an aggregation using
`$arrayElemAt`). It could not be verified here:
- no MongoDB instance and no installed `mongoose`/driver to test against;
- the interaction between `$slice` and the other field selections is version-dependent, and an aggregation returns BSON
  `Binary` values rather than the Node `Buffer` Mongoose currently hands back, so the response-building code would also change.

A wrong guess would break downloads of existing PDFs, so the route was not modified.

## Safe way to do it later
On a staging database containing a resource with several PDFs: (1) try the `$slice` projection through Mongoose and confirm
`fileContent` is still a `Buffer` and that only one element is returned; (2) compare response bytes/`Content-Type` against the
current route for every `?index`; (3) keep the legacy `fileData` path and the 404 behaviour for out-of-range or non-numeric
`index` identical.
