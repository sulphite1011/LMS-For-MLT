# Phase 3 baseline — status: NOT MEASURED

**No measurements were taken.** The environment this work was done in has no access to the npm registry
(`npm ci` fails with HTTP 403), no database, and no deployed site. That means `tsc`, `lint`, `build`,
bundle analysis, Lighthouse/DevTools captures and any before/after timing were impossible. Nothing in this
file is a measurement, and no performance improvement is claimed anywhere in the Phase 1–3 work.

What follows is what must be captured (ideally on a Vercel preview that uses production-like data) so that
the numbers can be filled in, plus the exact queries/commands to do it.

## Code-level facts (from reading the repo — not measurements)

| Item | State in the repository |
|---|---|
| `/` rendering | `force-dynamic` removed, `revalidate = 60`. Confirm in `next build` output that `/` is `○`/`●`, not `ƒ`. |
| Banners in list/detail/favorites APIs | `bannerImageUrl` excluded from the query; replaced by `/api/resources/<id>/banner?v=…` for uploaded images. |
| Detail page data | Read directly from MongoDB on the server (`src/lib/resources.ts`); client only fetches `/api/users/me` (signed-in users). |
| Comments API | Without `limit`: unchanged full array. With `limit`: `{ comments, hasMore, nextCursor, total }`. UI uses `limit=20`. |

## Baseline to capture

### Homepage (`/`)
Cold + warm, signed-out, mobile throttling (Slow 4G / 4x CPU) and desktop:
- Response header `x-vercel-cache` (HIT/STALE/MISS) and `age`
- TTFB, document size (transferred + decoded)
- Request count, total transferred bytes, JS transferred
- Largest image/banner response (DevTools → Network → sort by size)
- LCP / TBT / CLS (Lighthouse)

### Resource detail (`/resource/<id>`), pick one resource with a banner, files and many comments
- Document TTFB and size; time until the title/description are visible
- Request list: confirm there is **no** `/api/resources/<id>` call and no `/api/resources?subject=…` call after load;
  `/api/users/me` only when signed in
- Comments request size (`/comments?limit=20`) vs. the old full list (`/comments` with no params)
- Banner and file requests (look for 304s on repeat opens)
- JS transferred

Command-line helpers (replace the host):

```bash
curl -s -o /dev/null -w "ttfb=%{time_starttransfer}s total=%{time_total}s size=%{size_download}B\n" https://<host>/
curl -sI https://<host>/ | grep -i -E "x-vercel-cache|age|cache-control"
curl -s -o /dev/null -w "size=%{size_download}B\n" "https://<host>/api/resources?limit=20"
curl -s -o /dev/null -w "size=%{size_download}B\n" "https://<host>/api/resources/<id>/comments"
curl -s -o /dev/null -w "size=%{size_download}B\n" "https://<host>/api/resources/<id>/comments?limit=20"
```

To get a true *before* number, deploy the commit prior to Phase 1 to a preview and run the same captures.

## Bundle analysis (not run)

Needs a successful `next build`. Options that do not change the lockfile:
- If the installed Next.js version provides it (16.1+), `npx next experimental-analyze`.
- Otherwise add `@next/bundle-analyzer` as a deliberate, reviewed devDependency (this changes `package.json`/lockfile,
  so it was not done silently).

Questions to answer from the output: Framer Motion size and which routes load it; Clerk client size; anything
duplicated; the largest client chunks per route (`/`, `/resource/[id]`, `/admin/*`, `/dashboard`).
No client-side optimisation (Step 7) was made, because there is no measurement showing a worthwhile target.

## Remote image hosts (could not be verified)

No database access, so the distinct hostnames used in stored `bannerImageUrl` values are unknown.
`images.remotePatterns` is unchanged. To produce the list in Atlas / mongosh:

```js
db.resources.aggregate([
  { $match: { bannerImageUrl: { $regex: "^https?://", $options: "i" } } },
  { $project: { host: { $arrayElemAt: [ { $split: [ { $arrayElemAt: [ { $split: ["$bannerImageUrl", "://"] }, 1 ] }, "/" ] }, 0 ] } } },
  { $group: { _id: { $toLower: "$host" }, count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

Also useful: how many banners are stored as `data:` URIs (these go through the new banner route) and their sizes:

```js
db.resources.aggregate([
  { $match: { bannerImageUrl: { $regex: "^data:", $options: "i" } } },
  { $group: { _id: null, n: { $sum: 1 }, avgBytes: { $avg: { $strLenCP: "$bannerImageUrl" } }, maxBytes: { $max: { $strLenCP: "$bannerImageUrl" } } } }
])
```
