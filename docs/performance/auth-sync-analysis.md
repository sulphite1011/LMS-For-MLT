# `/api/auth/sync` — analysis only (no behaviour changed)

Source read: `src/contexts/AuthContext.tsx`, `src/app/api/auth/sync/route.ts`, `src/app/api/auth/claim-admin/route.ts`,
`src/app/admin/layout.tsx`, `src/components/Navbar.tsx`, `src/lib/auth.ts`.

## When it is called
- `AuthProvider` wraps the whole app in the root layout. Its effect calls `POST /api/auth/sync` once Clerk reports
  `isLoaded && isSignedIn`.
- That happens once per **full page load** for signed-in users (client-side navigations keep the provider mounted).
- Effect dependencies (changed in Phase 2 from the whole Clerk `user` object): `isLoaded`, `isSignedIn`, `user.id`,
  `user.username`, `user.hasImage`, `user.imageUrl`. So it re-runs only if one of those changes.
- Signed-out visitors never call it.

## What the route does
1. `auth()` → 401 if no session.
2. `currentUser()` — a **network call to Clerk's backend API** on every sync.
3. Computes `isHamad` (any Clerk email equals the hard-coded super-admin email) and the resolved avatar.
4. `User.findOne({clerkId})` (full document).
   - No document → **creates it** (role `superAdmin` if `isHamad`, else `user`; unique handle generation).
   - Document exists → promotes to `superAdmin` if `isHamad` and not already; refreshes `userImage` from Clerk unless a
     `customAvatar` exists; assigns a handle if missing; saves only if something changed.
5. Returns `{ _id, username, userHandle, userImage, role }`.

## Who depends on the response (client state)
- `Navbar`: admin link visibility; shows a placeholder until the sync finishes.
- `AdminSidebar`, `app/admin/layout.tsx` (blocks the entire admin area until loaded and requires a non-null role),
  `app/admin/page.tsx`, `app/admin/users/page.tsx`.
- `CommentSection` / `CommentItem` / dashboard: `userImage`, `username` for the current user.

## Super-admin and admin flows
- **Super-admin promotion happens only here** (and in the create branch). If sync were skipped, a user whose Clerk email
  is the super-admin email would not be promoted.
- **Admin claim:** `claim-admin` updates the DB role to `admin` and the claim page does `window.location.href = "/admin"`
  ("force reload to refresh auth state"). The client learns the new role **only through the next sync**.
- **First sign-in:** the `User` document is created by sync. `getAuthUser()` returns `null` when no document exists, so
  authenticated APIs return 401 for a brand-new user until the first sync completes.
- **Server-side authorization does not use the client role.** API routes (`requireAdmin`, etc.) read the role from MongoDB
  through `getAuthUser()`. A stale client role can therefore only change what the UI shows, not what the API allows.

## Stale-role scenarios if sync were cached or skipped
| Scenario | Effect |
|---|---|
| User claims admin, page reloads, cached role still `user` | `/admin` shows "Admin Access Required" (false deny). |
| Super-admin demotes an admin (`users/[id]`) | Target's UI keeps showing admin links until cache expiry; APIs already deny. |
| Super-admin email added to / removed from the Clerk account | Promotion delayed/missed. |
| Username or avatar changed in Clerk | DB (`userImage`, used in comments) stays old. |
| Different account in same browser | Wrong role shown if the cache is not keyed by Clerk id. |
| New user's first action before sync | 401 (no `User` document yet). |

## What invalidation would be required for any caching
- Key by Clerk user id; clear on sign-out / user change.
- Clear on: claim-admin success, any role change response, profile edits, and a short TTL.
- Never skip the call for a user with no cached record, and never skip the promotion check.

## Recommended future design (not implemented)
1. **Remove the Clerk API round-trip, keep per-load correctness.** Add `email`, `username` and `image_url` to the Clerk
   session-token claims (Clerk dashboard → Sessions → Customize session token), then read them from
   `auth().sessionClaims` instead of `currentUser()`. The route stays authoritative on every load (no staleness) but loses
   its slowest step. This needs a Clerk configuration change, so it should be decided and tested on a preview first, with a
   fallback to `currentUser()` when the claims are missing.
2. Use a projection + `.lean()` for the "existing user, nothing to change" path and only load the full document when a
   write is needed.
3. Only then consider UI-side caching: render the cached role immediately but **always revalidate in the background**,
   with the invalidations above. This improves perceived speed only, not server work.

Not recommended: skipping the sync on a timer/flag without a server-side `lastSyncedAt`, because of the admin-claim and
promotion flows above.
