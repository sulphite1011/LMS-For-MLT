# Hamad's MLT Study Hub — LMS-For-MLT

> **Technical handover and AI-agent context document.**
> Written from an audit of the *current* source code (branch `master`, HEAD `9a87aac`, 2026-10-06, 30 commits; the same code is published at the GitHub repository below), **plus the uncommitted MCQs section described in §10/§14/§30**. Where this file and the code disagree, **the code wins**. Anything that could not be confirmed from the repository is marked **Needs verification**.
>
> Audit environment limits: dependencies could not be installed (npm registry blocked), so `tsc`, `lint` and `next build` have **not** been executed against this code. Nothing here was runtime-tested. See [§27](#27-testing--validation) and [§29](#29-known-issues--technical-debt).

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [One-minute snapshot](#2-one-minute-project-snapshot)
3. [Technology stack](#3-technology-stack)
4. [Current architecture](#4-current-architecture)
5. [Directory structure](#5-complete-directory-structure)
6. [Route map](#6-route-map)
7. [Authentication architecture](#7-authentication-architecture)
8. [Authorization & roles](#8-authorization--role-system)
9. [Admin access system](#9-admin-access-system)
10. [LMS features](#10-lms-features)
11. [Resource system](#11-resource-system)
12. [Resource security](#12-resource-security)
13. [Database architecture](#13-database-architecture)
14. [API documentation](#14-api-documentation)
15. [Data flow](#15-database-data-flow)
16. [Business logic](#16-important-business-logic)
17. [Environment variables](#17-environment-variables)
18. [Vercel / production](#18-vercel--production-deployment)
19. [Git workflow](#19-git-workflow)
20. [Local development](#20-local-development)
21. [Performance architecture](#21-performance-architecture)
22. [UI / UX system](#22-ui--ux-system)
23. [Security architecture](#23-security-architecture)
24. [🚨 Do not break these](#24--do-not-break-these)
25. [🤖 Instructions for AI coding agents](#25--ai-coding-agent-instructions)
26. [Change workflow](#26-change-workflow)
27. [Testing / validation](#27-testing--validation)
28. [Troubleshooting](#28-troubleshooting)
29. [Known issues & technical debt](#29-known-issues--technical-debt)
30. [Project history](#30-important-project-history)
31. [Quick reference](#31-quick-reference)
32. [Final audit notes](#32-final-audit)

---

## 1. Project overview

**What it is.** A Learning Management System (LMS) / study-resource library for **Medical Laboratory Technology (MLT)** students. The site's public name (from `src/app/layout.tsx` metadata) is **"Hamad's MLT Study Hub — Free Medical Lab Technology Resources"**. The npm package name is `hamads-lms`; the repository is `LMS-For-MLT`.

**What it does (from the code).**
- Anyone can browse a catalogue of study resources organised by **subject** and **resource type** (`Notes`, `Video`, `PDF`, `Reference`, `Quiz`), search them, and open a resource page.
- **Signed-in users** can additionally open the resource's study material (PDF/image files, YouTube videos, external links — gated in the UI; the file download endpoint is gated on the server), comment, reply, like comments, leave 1–5 star ratings, favorite/like resources, and manage a personal dashboard (profile, favorites, liked, activity).
- **Admins** (`admin`, `superAdmin`) manage subjects and resources (create/edit/delete, upload banner images and PDF/image files, add YouTube and external links) in `/admin`.
- The **Super Admin** (`superAdmin`) additionally creates *pending admin* accounts (username + temporary password), lists users, and demotes/removes admins.
- Regular users can become admins by redeeming the Super Admin's temporary credentials at `/admin/claim`.

**Who uses it.** MLT students (visitors/users), a small set of content admins, and one owner/Super Admin (identified by a hard-coded e-mail address, see [§8](#8-authorization--role-system)).

**Production status.** Deployed on Vercel at `https://lms-for-mlt.vercel.app` (URL is hard-coded in metadata, `robots.ts`, `sitemap.ts`, resource page). Whether the deployment is currently live and which branch Vercel builds: **Needs verification** (not in repo; check the Vercel dashboard).

| Item | Value |
|---|---|
| Production URL | `https://lms-for-mlt.vercel.app` (from source; live status Needs verification) |
| GitHub repository | `https://github.com/sulphite1011/LMS-For-MLT` (from `git remote`) |
| Branches present (this clone) | `master` only (`origin/HEAD → origin/master`). A `dev` and a `main` branch existed in an earlier clone; whether they still exist on GitHub: Needs verification |
| Production branch | `master` is the working/default branch; the branch Vercel actually deploys: **Needs verification** |
| Deployment platform | Vercel (evidence: `vercel.json`, Vercel-specific comments in code) |

---

## 2. One-minute project snapshot

| Item | Current value |
|---|---|
| Project | Hamad's MLT Study Hub (`hamads-lms` v0.1.0, private) |
| Production URL | `https://lms-for-mlt.vercel.app` |
| Repository | `github.com/sulphite1011/LMS-For-MLT` |
| Production branch | `master` (Needs verification in Vercel) |
| Framework | Next.js **16.1.6**, App Router, React **19.2.3** |
| Language | TypeScript (`strict: true`) |
| Authentication | Clerk (`@clerk/nextjs` ^6.39.0) |
| Database | MongoDB via Mongoose ^9.2.3 (`MONGODB_URI`; host/provider Needs verification) |
| Hosting | Vercel (serverless) |
| File storage | **Inside MongoDB** — PDFs/images as `Buffer`, banners as base64 data-URI strings. No object storage. |
| Main users | MLT students; content admins; one Super Admin |
| Roles | `user` (default), `admin`, `superAdmin` (+ unauthenticated *visitor*; + *pending admin* placeholder records) |
| Package manager | npm (`package-lock.json`, lockfileVersion 3) |
| Tests | None (no test script, no test files) |

---

## 3. Technology stack

| Technology | Version | What it does here | Key files | Compatibility notes |
|---|---|---|---|---|
| **Next.js** | 16.1.6 | App Router, route handlers (`app/api/**/route.ts`), ISR, `next/image`, metadata | `next.config.ts`, `src/app/**` | Next 16: route `params` are **Promises** (`await params`). `images.localPatterns` is required for local images with query strings (used by the banner route). Middleware file is `src/middleware.ts` — Next 16's newer convention is `proxy.ts` (the `dev` branch renamed it); whether `middleware.ts` emits a deprecation warning on build: Needs verification. |
| **React** | 19.2.3 | UI | `src/**/*.tsx` | `eslint-config-next` 16.1.6 (React-hooks rules apply). |
| **TypeScript** | ^5 | Types; path alias `@/*` → `src/*` | `tsconfig.json` | `strict: true`. Many routes use `any` casts (`getAuthUser()` returns `any`). |
| **Node.js** | not pinned (`engines` absent) | Runtime | — | `@types/node` ^20. Required Node version: Needs verification (follow Next.js 16 requirements). |
| **Tailwind CSS** | ^4 via `@tailwindcss/postcss` | Styling; theme tokens in `@theme inline` | `src/app/globals.css`, `postcss.config.mjs` | v4 syntax (`bg-linear-to-br`, `@import "tailwindcss"`). No `tailwind.config.*`. |
| **Clerk** | `@clerk/nextjs` ^6.39.0 | Sign-in/up UI, sessions, `auth()`, `currentUser()`, middleware | `src/middleware.ts`, `src/lib/auth.ts`, `src/contexts/AuthContext.tsx`, `src/app/sign-*` | Clerk keys are not read in source; the SDK reads them from env (see [§17](#17-environment-variables)). |
| **MongoDB + Mongoose** | mongoose ^9.2.3 | Persistence, ODM | `src/lib/db.ts`, `src/models/*` | Connection cached on `global.mongooseCache`; `bufferCommands: false`. |
| **bcryptjs** | ^3.0.3 | Hashes/verifies *temporary admin passwords* | `api/users/route.ts`, `api/auth/claim-admin/route.ts` | Pure JS; cost factor 12 on creation. |
| **Framer Motion** | ^12.34.3 | Animations (22 files import it) | `HomeClient`, `ResourceCard`, `Navbar`, dashboard, admin… | `optimizePackageImports` set in `next.config.ts`. Not yet analysed for bundle impact. |
| **lucide-react** | ^0.575.0 | Icons | everywhere | `optimizePackageImports`. |
| **react-hot-toast** | ^2.6.0 | Toasts | `components/ui/ToastProvider.tsx` | |
| **react-dropzone** | ^15.0.0 | File upload UI (3 files, admin/dashboard) | admin resource forms | |
| **clsx / tailwind-merge** | ^2.1.1 / ^3.5.0 | `cn()` class helper | `src/lib/utils.ts` | |
| **date-fns** | ^4.1.0 | **Not imported anywhere in `src`** (unused dependency) | — | `src/lib/utils.ts` has its own date helpers. |
| **next-sitemap** | ^4.2.3 | **Not imported; no config file** (unused). Sitemap is `src/app/sitemap.ts` | — | |
| **ESLint** | ^9 + `eslint-config-next` 16.1.6 | `core-web-vitals` + `typescript` presets | `eslint.config.mjs` | Script: `npm run lint` → `eslint`. |

State management: React `useState`/`useEffect` + one React context (`AuthContext`). No Redux/Zustand/React Query. Validation: hand-written checks in route handlers (no zod/yup). Font: Inter via `next/font/google`.

---

## 4. Current architecture

```text
Browser
  │  (HTML/RSC + client JS)
  ▼
Vercel edge/CDN  ──►  src/middleware.ts  (Clerk: auth.protect() ONLY for /admin(.*))
  ▼
Next.js App Router
  ├─ Server Components: app/page.tsx (reads MongoDB directly), app/resource/[id]/page.tsx (reads MongoDB via src/lib/resources.ts),
  │                     layouts, sitemap.ts, robots.ts
  ├─ Client Components: HomeClient, ResourceDetailClient, Navbar, dashboard, admin pages, comments, AuthContext…
  └─ Route handlers:    app/api/**/route.ts
        │  auth: getAuthUser()/requireAuth()/requireAdmin()/requireSuperAdmin()  (src/lib/auth.ts → Clerk auth() + MongoDB User)
        ▼
     Mongoose models (User, Subject, Resource, Comment)  ──►  MongoDB (MONGODB_URI)
                                                    files/banners/avatars live INSIDE MongoDB documents
External services: Clerk (identity, hosted UI components, Clerk backend API in /api/auth/sync), Google Fonts (build-time), YouTube (iframe embeds / thumbnails).
```

- **Client/server boundaries.** Public pages are Server Components that read MongoDB directly and pass JSON-serialised props to client components (`HomeClient`, `ResourceDetailClient`). 25+ files carry `"use client"`.
- **Authentication layer.** Clerk session → `auth()` (server) / `useUser()` (client). The app keeps its own `User` collection keyed by `clerkId`; **roles live in MongoDB, not in Clerk**.
- **Authorization layer.** Server: helpers in `src/lib/auth.ts` called at the top of each route handler. Client: `AdminLayout`, `Navbar`, dashboard UI (cosmetic only).
- **Rendering strategy (from source; build output not verified).** `/` → `revalidate = 60` (ISR). `/resource/[id]` → `revalidate = 60` plus on-demand `revalidatePath`. `/sitemap.xml` → `revalidate = 3600`. Everything else client-rendered / dynamic. **Build classification (○/●/ƒ): Needs verification** (`next build` has not been run in the audit environment).
- **Caching.** See [§21](#21-performance-architecture).
- **Error handling.** Route handlers wrap in `try/catch` and return JSON `{ error }`. Several map thrown `Error.message` containing `"Unauthorized"`/`"Forbidden"` to 401/403, otherwise 500. There are **no** `error.tsx` or `not-found.tsx` files; the resource page renders its own "Resource Not Found" UI.

---

## 5. Complete directory structure

```text
LMS-For-MLT/
├── package.json / package-lock.json   npm scripts + deps (do not change deps casually)
├── next.config.ts                     images (AVIF/WebP, remotePatterns "**", localPatterns), headers, optimizePackageImports
├── vercel.json                        response headers (X-Robots-Tag, static cache, /api/subjects cache)
├── tsconfig.json, eslint.config.mjs, postcss.config.mjs
├── .gitignore                         ignores .env*, .next, node_modules, .vercel
├── dev.log, dev.err                   stray empty files committed to the repo
├── docs/performance/                  performance notes from the optimisation work (baseline NOT measured, auth-sync analysis, file-route investigation, verification report)
├── public/                            images/default-avatar.png (320×320) + default Next.js SVGs
└── src/
    ├── middleware.ts                  ⚠ Clerk middleware; protects /admin(.*) (signed-in only)
    ├── app/                           App Router (pages, layouts, API)
    │   ├── layout.tsx                 ClerkProvider + AuthProvider + ToastProvider + ScrollToTop, SEO metadata, Inter font
    │   ├── page.tsx, HomeClient.tsx   Homepage (server data fetch → client UI, search/filter)
    │   ├── loading.tsx                Root loading UI (branded loader)
    │   ├── sitemap.ts, robots.ts      SEO
    │   ├── sign-in/[[...sign-in]]/, sign-up/[[...sign-up]]/   Clerk <SignIn/>/<SignUp/>
    │   ├── resource/[id]/             page.tsx (server, ISR, JSON-LD), ResourceDetailClient.tsx, loading.tsx
    │   ├── mcqs/                      MCQs section (public pages, ISR 60 s): [specialty]/[semester]/[subject]/[unit]
│   ├── dashboard/                 layout.tsx (metadata, noindex), page.tsx (client; tabs Profile/Favorites/Liked/Activity)
    │   ├── admin/                     ⚠ layout.tsx (role gate), page.tsx, subjects/, resources/(new, [id]/edit), users/, claim/
    │   └── api/                       ⚠ all route handlers (see §14)
    ├── components/                    Navbar, AdminSidebar, ResourceCard, SearchFilterBar, EmptyState,
    │   ├── comments/                  CommentSection (paginated), CommentItem
    │   └── ui/                        Loading, Skeleton, ConfirmModal, StarRating, ToastProvider, ScrollToTop
    ├── contexts/AuthContext.tsx       ⚠ calls POST /api/auth/sync; exposes role/userId/avatar to client
    ├── lib/
    │   ├── auth.ts                    ⚠ getAuthUser/requireAuth/requireAdmin/requireSuperAdmin
    │   ├── db.ts                      ⚠ cached Mongoose connection
    │   ├── banner.ts                  banner data-URI → URL helpers (+ isOwnBannerRoute guard)
    │   ├── resources.ts               shared server reads for the resource detail page/API
    │   ├── comments.ts                merges current user info (avatar URLs) into comments
    │   └── utils.ts                   cn, formatters, YouTube helpers, generatePassword, MAX_FILE_SIZE, handle helpers
    ├── models/                        ⚠ User, Subject, Resource, Comment (Mongoose schemas)
    └── types/index.ts                 shared TypeScript types
```
⚠ = security- or data-critical: modify only after reading [§24](#24--do-not-break-these).

---

## 6. Route map

| Route | Purpose | Public | Auth required | Role required |
|---|---|:-:|:-:|---|
| `/` | Homepage: hero, search/filters, newest 20 resources | ✅ | – | – |
| `/resource/[id]` | Resource detail (banner, description, videos, files, links, comments, related) | ✅ (page + metadata) | Material is gated **in the UI** for signed-out users | – |
| `/sign-in`, `/sign-up` | Clerk sign-in / sign-up | ✅ | – | – |
| `/dashboard` | User profile, favorites, liked, activity | ❌ | Client-side only: signed-out visitors see a "Sign in to view your dashboard" message (**not** protected by middleware; data APIs return 401) | any signed-in |
| `/admin` | Admin dashboard (stats) | ❌ | Middleware `auth.protect()` + layout role check | `admin`, `superAdmin` |
| `/admin/subjects` | Manage subjects | ❌ | same | `admin`, `superAdmin` |
| `/admin/resources`, `/admin/resources/new`, `/admin/resources/[id]/edit` | Manage resources | ❌ | same | `admin`, `superAdmin` |
| `/admin/users` | List users, create pending admins, remove admins | ❌ | same + page checks `userRole === "superAdmin"` | `superAdmin` (API enforces it) |
| `/admin/claim` | Redeem temporary admin credentials | ❌ | Middleware (signed-in) + layout special case | any signed-in user |
| `/mcqs` | MCQs: list of specialties (MLT, MIT, OTT… — whatever the Super Admin created) | ✅ | – | – |
| `/mcqs/[specialty]` | Semester picker for a specialty | ✅ | – | – |
| `/mcqs/[specialty]/[semester]` | Subjects of one semester | ✅ | – | – |
| `/mcqs/[specialty]/[semester]/[subject]` | **Units page** of a subject (list of units) + Share button | ✅ | – | – |
| `/mcqs/[specialty]/[semester]/[subject]/[unit]` | MCQ page of one unit (uploaded HTML shown in a sandboxed iframe) + Share button | ✅ | – | – |
| `/admin/mcqs` | Manage MCQ specialties, subjects, units and HTML uploads | ❌ | Middleware + layout; page shows "Super Admin Only" otherwise | `superAdmin` (API enforces it) |
| `/sitemap.xml`, `/robots.txt` | SEO | ✅ | – | – |
| `/api/**` | See [§14](#14-api-documentation) | mixed | per route | per route |

There is no custom `/404` or error page.

---

## 7. Authentication architecture

**Provider:** Clerk. **Files:** `src/middleware.ts`, `src/app/layout.tsx` (`<ClerkProvider>`), `src/contexts/AuthContext.tsx`, `src/lib/auth.ts`, `src/app/api/auth/sync/route.ts`, `src/app/sign-in|sign-up/**`, `src/components/Navbar.tsx` (`<UserButton/>`, `<SignedIn/>`).

```text
User ─► Clerk (sign-up / sign-in UI, hosted identity) ─► Clerk session (cookie/JWT)
      ─► Next.js middleware (clerkMiddleware; auth.protect() only for /admin(.*))
      ─► Browser: useUser() → AuthProvider
      ─► POST /api/auth/sync  (once per full page load for signed-in users)
           ├─ auth() → clerkId;  currentUser() (Clerk backend API call) → email, image, username
           ├─ User.findOne({clerkId}) → create (first sign-in) or update
           └─ returns { _id, username, userHandle, userImage, role }
      ─► MongoDB `users` record = source of truth for ROLE
      ─► Client AuthContext (userRole, username, avatar) → UI gating
      ─► Server routes: getAuthUser() = auth() + User.findOne({clerkId}) → role checks
```

- **Sign-up / sign-in / sign-out:** Clerk components; sign-out via `UserButton` (`afterSignOutUrl="/"`) and Clerk `signOut` in the admin sidebar.
- **User synchronisation:** `/api/auth/sync` creates the `User` document on first sync (role `user`, or `superAdmin` if a Clerk e-mail equals the hard-coded owner e-mail), refreshes the avatar from Clerk unless a `customAvatar` exists, assigns a unique `userHandle` when missing. **A signed-in Clerk user with no `User` document gets `null` from `getAuthUser()` → 401 on authenticated APIs until sync has run.**
- **Client state:** `AuthProvider` runs the sync effect when `isLoaded && isSignedIn`; effect dependencies are primitives (`user.id`, `username`, `hasImage`, `imageUrl`). Exposes `isLoaded`, `isSignedIn`, `userRole`, `username`, `userImage`, `updateUser`. `AdminLayout` waits for `isLoaded`.
- **Server helpers (`src/lib/auth.ts`):**
  - `getAuthUser({includeAvatar?})` → lean `User` (fields `_id clerkId username userHandle userImage role`, plus `customAvatar` only when requested) or `null`. Excludes `password`.
  - `requireAuth()` throws `Error("Unauthorized")` if no user.
  - `requireAdmin()` throws `Error("Forbidden: Admin access required")` unless role ∈ {`admin`,`superAdmin`}.
  - `requireSuperAdmin()` throws `Error("Forbidden: Super Admin access required")` unless `superAdmin`.
  - `syncUser()` exists in `lib/auth.ts` but is **not called anywhere** (the sync route has its own copy of the logic).
- **Middleware matcher** excludes `_next` and common static extensions; runs for all pages and `/api`/`trpc`. Only `/admin(.*)` calls `auth.protect()`.
- **Auth env vars:** see [§17](#17-environment-variables).

---

## 8. Authorization & role system

Roles are stored in `User.role` (enum `"superAdmin" | "admin" | "user"`, default `"user"`). Other states:
- **Visitor** — not signed in (no DB record).
- **Pending admin** — a `User` document with `isPending: true`, `role: "admin"`, `clerkId: "pending_<timestamp>"`, a bcrypt `password`. It is a *credential placeholder*, not a person; it is consumed by `/admin/claim`.

| Feature | Visitor | User | Admin | Super Admin |
|---|:-:|:-:|:-:|:-:|
| Browse homepage / search / open resource page | ✅ | ✅ | ✅ | ✅ |
| See YouTube player, file buttons, external links (UI) | ❌ (locked UI) | ✅ | ✅ | ✅ |
| `GET /api/resources/[id]/file` (server-enforced) | ❌ 401 | ✅ | ✅ | ✅ |
| Comment / reply / like comment / rate | ❌ | ✅ | ✅ | ✅ |
| Favorite / like a resource, dashboard, edit own profile | ❌ | ✅ | ✅ | ✅ |
| Delete own comment/reply | ❌ | ✅ | ✅ | ✅ |
| Delete **any** comment/reply | ❌ | ❌ | ❌ | ✅ |
| Open `/admin` area | ❌ | ❌ (blocked) | ✅ | ✅ |
| Create / edit / delete resources (any resource — no ownership check) | ❌ | ❌ | ✅ | ✅ |
| Create / rename / delete subjects (delete blocked while it has resources) | ❌ | ❌ | ✅ | ✅ |
| List users, create pending admin, remove/demote admin (`/api/users*`) | ❌ | ❌ | ❌ | ✅ |
| Redeem admin credentials (`/admin/claim`, `POST /api/auth/claim-admin`) | ❌ | ✅ | ✅ | ✅ (⚠ see §23) |
| Admin resource list shows only own resources (`?admin=true`) | – | – | ✅ | all resources |

### Authentication vs authorization — what is actually enforced where

| Layer | Mechanism | Is it security? |
|---|---|---|
| Middleware | `auth.protect()` on `/admin(.*)` → signed-in required | ✅ (authentication only, not role) |
| API route handlers | `requireAuth` / `requireAdmin` / `requireSuperAdmin` / `getAuthUser` + ownership checks | ✅ **authoritative** |
| `AdminLayout` (`src/app/admin/layout.tsx`) | Client component; shows "Admin Access Required" unless role ∈ {admin, superAdmin}; `/admin/claim` allowed for any signed-in user | ⚠ **UI gate only** (client-side). Real protection for admin data is the API layer. |
| Navbar admin link, dashboard "Admin Access" card, locked video/file/link UI | Conditional rendering | ❌ cosmetic — **hiding a button is not security** |

---

## 9. Admin access system

**Files:** `src/app/admin/layout.tsx`, `src/app/admin/claim/page.tsx`, `src/app/api/auth/claim-admin/route.ts`, `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts`, `src/app/admin/users/page.tsx`, `src/components/AdminSidebar.tsx`, `src/lib/auth.ts`.

**Layout rules (`AdminLayout`).** While Clerk/sync loads → skeleton. If path is `/admin/claim` **and** signed in → render children only (no sidebar). Otherwise, if not signed in or `userRole ∉ {admin, superAdmin}` → "Admin Access Required" card (Sign-In button only for signed-out users). Else → sidebar + content. Sidebar items: Dashboard, Subjects, Resources; **Users** only for `superAdmin`.

**Admin creation + claim flow (actual implementation):**

```text
Super Admin ─► /admin/users ─► POST /api/users { username }                (requireSuperAdmin)
      server: username must be unique; generatePassword(); bcrypt.hash(pw, 12);
              User.create({ clerkId:"pending_<ts>", username, role:"admin", password:<hash>, isPending:true, createdBy })
      response (201): { _id, username, role, tempPassword, hashedPassword, note }   ← plaintext shown ONCE to the Super Admin
Super Admin shares username + temp password with the intended admin (out of band)

Signed-in normal user ─► Dashboard → "Admin Access" card (role === "user") → "Claim Admin Role" ─► /admin/claim
      form ─► POST /api/auth/claim-admin { username, password }
      server: getAuthUser() (401 if none) → find User{username, isPending:true, role:"admin"}
              (404 "Invalid credentials or claim already processed" if none)
              bcrypt.compare(password, pending.password)  (401 if wrong)
              User.findOneAndUpdate({clerkId: me}, { role:"admin" })      ← promotes the caller
              User.deleteOne(pending record)                              ← single use
      client: toast, then window.location.href = "/admin" (full reload so /api/auth/sync refreshes the role)
```
`/admin/claim` also has the "Request Admin Access" e-mail alternative on the dashboard (`mailto:` link to the owner).

**Removing admins.** `DELETE /api/users/[id]` (Super Admin only): cannot delete yourself or a `superAdmin`; a *pending* record (`clerkId` starts with `pending_`) is deleted; a real user is **demoted to `user`** (not deleted). **Their resources are NOT transferred to the super admin:** every resource they created is marked `isOrphaned: true` with `formerOwnerId`/`formerOwnerName` stored. Public pages and APIs show these as **"Unknown Author"** (`lib/orphans.ts`: `maskOrphans`, `HIDE_FORMER_OWNER`; the former-owner fields are stripped from every response except the Super Admin's `?admin=true` listing). Only the Super Admin sees the former owner in `/admin/resources` and can **claim** the resource (`PATCH /api/resources/[id]/owner` `{action:"claim"}` → `createdBy` = super admin, orphan flags cleared) or leave it as Unknown. Orphaned resources are hidden from other admins' own listing. Note: this runs only through `DELETE /api/users/[id]`; there is no Clerk webhook for account deletion done by the user in Clerk.

**Super Admin.** There is no UI/API to create one. A user becomes `superAdmin` when `POST /api/auth/sync` sees the hard-coded owner e-mail among the Clerk user's e-mail addresses (on creation, and on every later sync if the role differs).

**Admin-only pages call** `GET /api/resources?admin=true` (own resources for `admin`, all for `superAdmin`), `/api/subjects`, `/api/users` (superAdmin).

---

## 10. LMS features

| Feature | Where | Components / routes | APIs / models |
|---|---|---|---|
| Homepage + hero + stats | `/` | `app/page.tsx`, `HomeClient.tsx` | direct Mongoose reads (Resource, Subject, Comment aggregate) |
| Search (350 ms debounce), type & subject filters | `/` | `SearchFilterBar`, `HomeClient` | `GET /api/resources?search&type&subject` |
| Resource cards (banner, type, subject, rating, favorite/like) | `/`, related, dashboard | `ResourceCard` | `POST /api/users/me/favorites` |
| Resource detail | `/resource/[id]` | `page.tsx`, `ResourceDetailClient` | `src/lib/resources.ts`, `GET /api/resources/[id]` |
| YouTube videos (multiple, tabbed embeds) | resource page | `ResourceDetailClient`, `getYoutubeEmbedUrl` | `Resource.youtubeUrls` |
| PDF / image files ("Access Material": view/download) | resource page | `ResourceDetailClient` | `GET /api/resources/[id]/file` |
| External links | resource page | `ResourceDetailClient` | `Resource.externalLinks` |
| Banner images | cards, detail | `next/image` | `GET /api/resources/[id]/banner` |
| Related resources (same subject, 4) | resource page | `fetchRelatedResources` | Resource |
| Comments, replies (threaded, @mentions), likes | resource page | `CommentSection`, `CommentItem` | `/api/resources/[id]/comments`, `/api/comments/[id]` |
| Ratings (1–5, standalone or with comment) | resource page | `StarRating`, `CommentSection` | `/api/resources/[id]/rate` |
| User dashboard (Profile, Favorites, Liked, Activity) | `/dashboard` | `dashboard/page.tsx` | `/api/users/me*` |
| Admin dashboard, subjects, resources, users | `/admin/**` | `AdminSidebar`, admin pages | `/api/subjects*`, `/api/resources*`, `/api/users*` |
| Loading states | `/`, `/resource/[id]` | `loading.tsx` → `components/ui/Loading.tsx` (branded loader); `Skeleton` for in-page placeholders | – |
| Empty states, confirm modal, toasts, scroll-to-top | various | `EmptyState`, `ConfirmModal`, `ToastProvider`, `ScrollToTop` | – |
| **MCQs section** (specialty → semester → subject → unit → MCQ page; every page has a Share button and its own URL/metadata) | `/mcqs/**`, `/admin/mcqs` | `app/mcqs/**`, `components/mcq/*`, `components/ShareButton.tsx`, `app/admin/mcqs/page.tsx` | `/api/mcq/**`; models `McqSpecialty`, `McqSubject`, `McqUnit` |
| SEO | all public | `layout.tsx` metadata, JSON-LD on resource page, `sitemap.ts`, `robots.ts` | – |
| Responsive navigation | all | `Navbar` (desktop + mobile menu), `AdminSidebar` (collapsible/mobile drawer) | – |

---

## 11. Resource system

```text
MongoDB Resource doc
   ↓ (server)   src/lib/resources.ts / Mongoose queries  (banner base64 and file bytes EXCLUDED from list reads)
   ↓            API route (public list/detail JSON)  or  Server Component props
Resource page (/resource/[id])  – public HTML (ISR)
   ↓ (client)   Clerk useUser(): signed-out → locked UI for videos / files / external links
   ↓            file buttons → GET /api/resources/[id]/file  → requireAuth() (401 if signed out)
User
```

- **Creation** (`POST /api/resources`, admin): multipart form → `title`, `subjectName` (find-or-create `Subject`, case-insensitive), `resourceType`, `description`, `youtubeUrls` (JSON), `externalLinks` (JSON; legacy single `externalLink`), `bannerImage` file *or* `bannerImageUrl`, `files[]` (legacy `file`). Files > `MAX_FILE_SIZE` (default 10 485 760 B) rejected with 400. Banner uploads are stored as a **base64 data URI** in `bannerImageUrl`; files are stored as `Buffer` in `files[].fileContent` and the first file is also copied to legacy `fileData`.
- **Editing** (`PUT /api/resources/[id]`, admin): updates title/subject/type/description/youtubeUrls/banner; **handles only the legacy `fileData`** (`file`, `removeFile`, single `externalLink`) — it does **not** read the `files[]` array or the `externalLinks[]` array from the form (confirmed in route code; effect on the edit UI Needs verification). Ignores a banner URL equal to the resource's own `/banner` route (so saving an edit does not overwrite the stored image).
- **Deletion** (`DELETE`, admin): `findByIdAndDelete`; comments for the resource are **not** deleted (no cascade in code).
- **Listing** (`GET /api/resources`): filter by `search` (escaped regex on title/description), `type`, `subject`; `page`/`limit` (no upper bound on `limit`); sorted `createdAt` desc; returns average rating & count via aggregation; banners returned as URLs.
- **Types:** `Notes`, `Video`, `PDF`, `Reference`, `Quiz` (schema enum).
- **Files:** `fileType` ∈ `pdf` | `image` | `external`. Chosen by MIME (`type.includes("pdf") ? "pdf" : "image"`).
- **YouTube:** only URL strings; embeds built client-side by `getYoutubeEmbedUrl` (regex for `youtube.com/watch?v=`, `/embed/`, `youtu.be/`).
- **Subject association:** `Resource.subjectId → Subject`; subjects cannot be deleted while resources reference them.
- **Related:** up to 4 newest resources with the same `subjectId`, excluding the current one.

---

## 12. Resource security

This section describes what the **backend actually enforces**.

| Asset | Server-side enforcement | UI behaviour | Cache |
|---|---|---|---|
| **File bytes** (`GET /api/resources/[id]/file[?index=n]`) | `requireAuth()`: 401 for signed-out; **any** signed-in user with a DB `User` record may fetch **any** resource's files by id (resources are not per-user private). No role check. | Signed-out users see "Sign In to View PDF" instead of buttons | `Cache-Control: private, no-store` on 200/401 |
| **YouTube URLs** | ❌ **None.** `youtubeUrls` are returned by the public `GET /api/resources/[id]`, embedded in the public ISR page's serialised props (`initialResource`). | Locked card + "Sign in to access direct video links"; iframe rendered only when `isSignedIn` | public (`s-maxage=60`) |
| **External links** | ❌ **None.** Same exposure as YouTube. | Locked card "Sign In to View Material" when signed out | public |
| **Banner images** | Public by design | `next/image` | `public, max-age=31536000, immutable` (`?v=` busts cache) |
| **User avatars** (`/api/avatars/[clerkId]`) | Public by design (already public in comments) | – | immutable |
| **Resource metadata / description / file *names*** | Public (`GET /api/resources`, `/api/resources/[id]`, page HTML) | – | public cache |
| **Comments** (`GET`) | Public read; write requires sign-in | – | not cached |

- **IDOR:** resource ids are Mongo ObjectIds; there is no ownership model for reading. Comment edit/delete verifies `comment.userId === user.clerkId` or `superAdmin`. Favorites/likes act only on the caller's own `User` document (`clerkId` from the session, never from the request body).
- **File route detail:** the route first calls `requireAuth()` (mapping only `Error("Unauthorized")` to 401; other errors → 500), then loads the resource (`fileData` + `files`, content included), picks `files[index]` (or legacy `fileData`), and returns bytes with `Content-Disposition: inline`. **It loads all attachments of the resource from MongoDB on each request** (no projection narrowing).
- **Conclusion:** only **file bytes** are server-protected. Video and link "protection" is **UI-only** and can be bypassed by reading API/page JSON. Treat as a known limitation ([§23](#23-security-architecture)).

---

## 13. Database architecture

- **Technology:** MongoDB through Mongoose 9. **Provider/hosting of the database: Needs verification** (only `MONGODB_URI` is referenced).
- **Connection (`src/lib/db.ts`):** `dbConnect()` caches the connection and in-flight promise on `global.mongooseCache`; `bufferCommands: false`; throws if `MONGODB_URI` is missing; resets the cached promise on failure. Called at the top of every route/page that touches the DB.
- **Index creation:** Mongoose `autoIndex` is not disabled, so schema indexes are built on first connection.
- Models are registered with the `mongoose.models.X || mongoose.model(...)` pattern. Importing a model file is required before `.populate()` references it (`lib/resources.ts` imports `Subject` and `User` for that reason).

### `User` (`models/User.ts`)
| Field | Type / rules |
|---|---|
| `clerkId` | String, required, **unique** (`pending_<ts>` for pending admins) |
| `username` | String, required, **unique** |
| `userHandle` | String, unique+sparse, lowercase, trimmed |
| `userHandleLastChanged`, `usernameLastChanged` | Date (enforce 15-day handle / 30-day username change limits in `PATCH /api/users/me`) |
| `userImage`, `customAvatar` | String (`customAvatar` = base64 data URI uploaded by the user) |
| `bio` | String, max 300 |
| `role` | enum `superAdmin` / `admin` / `user`, default `user` |
| `password` | String — bcrypt hash, only on pending admin records |
| `isPending` | Boolean, default false |
| `favoriteResources`, `likedResources` | `[ObjectId → Resource]` |
| `createdAt` | Date; `createdBy` ObjectId → User |

### `Subject` (`models/Subject.ts`)
`name` (required, **unique**, trim), `description`, `createdBy → User` (required), `createdAt`.

### `Resource` (`models/Resource.ts`, timestamps)
| Field | Notes |
|---|---|
| `title` (req), `description` | trimmed strings |
| `subjectId` → Subject (req) | |
| `resourceType` (req) | enum `Notes`, `Video`, `PDF`, `Reference`, `Quiz` |
| `bannerImageUrl` | string: external URL **or base64 data URI** (can be very large) |
| `bannerImageData` | legacy `Buffer` (excluded from reads) |
| `fileData` | legacy single file `{fileType, fileContent Buffer, fileName, fileSize, mimeType, externalLink}` |
| `files[]` | `{fileType: pdf|image|external, fileContent Buffer, fileName, fileSize, mimeType, externalLink, label}` (subdocs have `_id`) |
| `externalLinks[]` | `{label (default "External Link"), url (req)}` |
| `youtubeUrls[]` | strings |
| `createdBy` → User (req) | |
| Indexes | text(title, description); `createdAt:-1`; `subjectId+createdAt:-1`; `resourceType+createdAt:-1`; `subjectId+resourceType+createdAt:-1` |

### `Comment` (`models/Comment.ts`, timestamps)
`resourceId → Resource` (req), `userId` (Clerk id string), `userName`, `userImage`, `content` (default `""` — empty for standalone ratings), `rating` (1–5, optional), `likes[]` (Clerk ids), `replies[]` (embedded: `userId, userName, userImage, content, likes[], parentReplyId, mentionedUser, createdAt`). Indexes: `resourceId`; `createdAt:-1`; `userId`; `resourceId+rating`; `resourceId+createdAt:-1`.

### `McqSpecialty`, `McqSubject`, `McqUnit` (`models/Mcq*.ts`)
`McqSpecialty`: `name` (≤40), `slug` (unique, lowercase, fixed after creation), `fullName`, `description`, `semesterCount` (1–12, default 8), `createdBy → User`, timestamps.
`McqSubject`: `specialtyId → McqSpecialty`, `semester` (1–12), `name`, `slug`, `description`, `createdBy → User`, timestamps. Indexes: unique `{specialtyId, semester, slug}`, `{specialtyId, semester, createdAt}`. (Legacy `htmlContent/htmlFileName/htmlSize/hasPage` fields remain in the schema from the earlier subject-level version but are no longer read or written.)
`McqUnit`: `subjectId → McqSubject`, `specialtyId → McqSpecialty` (denormalised), `name` (≤120), `slug`, `description`, **`htmlContent` (String, `select:false` — the uploaded MCQ page)**, `htmlFileName`, `htmlSize`, `hasPage`, `createdBy → User`, timestamps. Indexes: unique `{subjectId, slug}`, `{subjectId, createdAt}`, `{specialtyId}`.

```text
McqSpecialty 1 ──< McqSubject 1 ──< McqUnit (one uploaded HTML page each)
Subject 1 ──< Resource 1 ──< Comment (embedded replies)
User ──< Resource (createdBy)      User.favoriteResources / likedResources → Resource
Comment.userId / reply.userId = Clerk id string (NOT an ObjectId reference)
```
**Large binary data lives inside documents** (file Buffers, base64 banners/avatars). MongoDB's 16 MB document limit applies to a resource with many files.

---

## 14. API documentation

All handlers live in `src/app/api/**/route.ts`. Error bodies are `{ "error": string }`. "Auth" below = enforced in the handler.

### Authentication / users

**POST `/api/auth/sync`** — Purpose: create/refresh the app's `User` record for the signed-in Clerk user. Auth: Clerk session (401 if none). Authz: none (self). Request: none. Response: `{_id, username, userHandle, userImage, role}`. Errors: 401, 404 (no Clerk user), 500. DB: `User.findOne/create/save`. External: Clerk `currentUser()`. Security: **the only place the owner e-mail promotes a user to `superAdmin`.**

**POST `/api/auth/claim-admin`** — Purpose: redeem temporary admin credentials. Auth: `getAuthUser()` (401). Request `{username, password}`. Response `{success, message, role}`. Errors: 400, 401 (not signed in / wrong password), 404 (no matching pending record), 500. DB: find pending `User`, `bcrypt.compare`, `findOneAndUpdate(role:"admin")`, `deleteOne(pending)`. Security: see §23 (no rate limit; overwrites caller's role to `admin`).

**GET `/api/users`** — Super Admin only (`requireSuperAdmin`): all users (`-__v`, includes `password` hash for pending records — ⚠ see §23). 401/403/500.

**POST `/api/users`** — Super Admin only. Body `{username}`. Creates pending admin; returns `{_id, username, role, tempPassword, hashedPassword, note}`. 400/409/401/403/500.

**DELETE `/api/users/[id]`** — Super Admin only. Pending record → deleted; real user → role set to `user` and their resources marked orphaned ("Unknown Author"). Refuses self and `superAdmin`. 400/401/403/404/500.

**GET `/api/users/me`** — signed-in. Returns own profile (`-password -__v`, includes `customAvatar`, favorites, likes). 401/404/500.
**PATCH `/api/users/me`** — signed-in. Body `{username?, userHandle?, bio?, customAvatar?}`; username 2–30 chars, unique, 30-day cooldown; handle unique, 15-day cooldown; bio ≤ 300; `customAvatar` stored as given (no size/type validation in this handler — Needs verification of client-side limits). 400/401/404/409/500.
**GET `/api/users/me/favorites`** — signed-in: `{favorites, liked}` resources (banners as URLs). **POST** body `{resourceId, type: "favorite"|"like"}` toggles membership in the caller's own arrays → `{action: "added"|"removed", ...}`. 400/401/404/500.
**GET `/api/users/me/activity`** — signed-in: last 20 own non-empty comments with resource info.

### Subjects

**GET `/api/subjects`** — public; `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
**POST `/api/subjects`** — admin+; body `{name, description?}`; 400/409.
**PUT `/api/subjects/[id]`** — admin+; rename/update; 400/404/409.
**DELETE `/api/subjects/[id]`** — admin+; 400 if resources exist; 404.

### Resources

**GET `/api/resources`** — public. Query: `search, type, subject, page=1, limit=20, admin=true`. Response `{resources[], total, pages, page}` (each with `averageRating`, `totalRatings`, `bannerImageUrl` as URL). `admin=true`: if caller is `admin`, filters `createdBy = caller` (superAdmin/anyone else: unfiltered); cache header `private, no-store` in that mode, otherwise `public, s-maxage=30, stale-while-revalidate=60`. ⚠ `admin=true` is a listing convenience, **not** an authorization boundary (the data returned is public anyway). No cap on `limit`.
**POST `/api/resources`** — admin+ (`requireAdmin`); multipart; 201 `{_id,title}`; 400/401/403/500; calls `revalidatePath("/")`.
**GET `/api/resources/[id]`** — public; detail incl. populated subject/creator(`clerkId`), `averageRating`, `totalRatings`, `bannerImageUrl` URL; `public, s-maxage=60, stale-while-revalidate=120`; 404/500. Includes `youtubeUrls`, `externalLinks`, file metadata (no bytes).
**PUT `/api/resources/[id]`** — admin+; multipart; 400/401/403/404/500; `revalidatePath("/")` and the resource page.
**DELETE `/api/resources/[id]`** — admin+; **soft delete (recycle bin)**: sets `deletedAt`/`deletedBy`; the resource disappears from every public page/API immediately (all public queries filter `deletedAt: null`) and is removed for good after **30 days** (`lib/recycleBin.ts`, daily Vercel cron `GET /api/cron/purge-recycle-bin` at 03:00 UTC — set `CRON_SECRET` in Vercel to protect it — plus a lazy purge whenever a bin is listed).
**GET `/api/resources/trash`** — admin+: the caller's own recycle bin; Super Admin: every bin, `?owner=<user id>` for one admin's bin. **POST `/api/resources/[id]/restore`**, **DELETE `/api/resources/[id]/purge`** (permanent) — Super Admin, the owner, or the deleter. `GET /api/resources?admin=true&owner=<id>` (Super Admin) lists one admin's resources. UI: `/admin/resources` → "Recycle bin" tab and (Super Admin) an "Admin" selector. Resource creation date/time is shown publicly on cards and the detail page (`formatDateTime`/`formatShortDate` in `lib/utils.ts`, fixed Asia/Karachi time).
**GET `/api/resources/[id]/file?index=n`** — **signed-in only** (401 otherwise); returns bytes (`Content-Type`, `inline`); 404 if no resource/file; `private, no-store`.
**GET `/api/resources/[id]/banner`** — public; decodes stored data-URI to image bytes (allow-listed: any `image/*`), ETag + `immutable` caching, sandboxing CSP header; external `http(s)` URLs → 307 redirect; 404 otherwise.
**GET `/api/avatars/[clerkId]`** — public; same mechanism for `User.customAvatar`.

### MCQs (specialties / subjects / units / uploaded HTML pages)

**GET `/api/mcq/specialties`** — public list `{_id,name,slug,fullName,description,semesterCount,subjectCount,pageCount}`; `public, s-maxage=60`.
**POST `/api/mcq/specialties`** — Super Admin only; JSON `{name (≤40), fullName?, description?, semesterCount? (1–12, default 8)}`; slug generated from `name` and never changes; 400/401/403/409/500; revalidates `/mcqs` (layout).
**PUT / DELETE `/api/mcq/specialties/[id]`** — Super Admin only. PUT cannot lower `semesterCount` below a semester that already has subjects; DELETE refused while the specialty has subjects.
**GET `/api/mcq/subjects?specialtyId=&semester=`** — public list (never includes the HTML; `htmlContent` is `select:false`).
**POST `/api/mcq/subjects`** — Super Admin only; multipart: `specialtyId, semester, name, description?`; slug unique per specialty+semester (409).
**PUT `/api/mcq/subjects/[id]`** — Super Admin only; multipart: `name?, description?, semester?`.
**DELETE `/api/mcq/subjects/[id]`** — Super Admin only; refused (409) while the subject still has units.
**GET `/api/mcq/units?subjectId=`** — public list (never includes the HTML).
**POST `/api/mcq/units`** — Super Admin only; multipart: `subjectId, name, description?, file?` (one `.html`, ≤ 4,000,000 bytes, must look like HTML); slug unique per subject (409).
**PUT `/api/mcq/units/[id]`** — Super Admin only; multipart: `name?, description?, file? (replace), removeFile=true`. **DELETE** — Super Admin only.
**GET `/api/mcq/units/[id]/html`** — public; serves the stored HTML with `Content-Security-Policy: sandbox allow-scripts allow-popups allow-forms allow-modals; frame-ancestors 'self'` (opaque origin: no cookies/storage/same-origin access), `nosniff`; `?v=<updatedAt>` → `immutable` cache, otherwise `must-revalidate`.

### Comments & ratings

**GET `/api/resources/[id]/comments`** — public. No `limit` → full array (legacy, includes empty-content rating entries). With `limit` (1–50, default 20 if unparsable) → `{comments, hasMore, nextCursor, total}`; cursor param `before="<ISO createdAt>_<_id>"`; only non-empty comments; `total` only on the first page. Avatar URLs resolved via `lib/comments.ts`.
**POST `/api/resources/[id]/comments`** — signed-in; `{content, rating?}`; 201; revalidates the resource page if a rating is included; 400/401/500.
**PATCH `/api/comments/[id]`** — signed-in; `{action}` ∈ `like` (toggle), `reply` (content required; supports `parentReplyId`, `mentionedUser`), `delete_reply` (`replyIndex`; owner or superAdmin only → 403). 400/401/404/500.
**DELETE `/api/comments/[id]`** — signed-in; author or `superAdmin` only (403 otherwise).
**GET `/api/resources/[id]/rate`** — public stats `{averageRating, totalRatings, distribution}` (+ `userRating` when signed in).
**POST `/api/resources/[id]/rate`** — signed-in; `{rating: 1..5}` (400 otherwise); upserts the caller's comment-with-rating for the resource; returns updated stats; revalidates the resource page.

Rating math: detail route counts comments having a `rating` field; `/rate` and list endpoints use `rating > 0`; computed with MongoDB aggregation over **all** comments of the resource (independent of comment pagination).

---

## 15. Database data flow

```text
React UI (client)  ──fetch──►  Route handler
                                 ├─ Authentication  (Clerk auth() → getAuthUser → User doc)
                                 ├─ Authorization   (role / ownership checks)
                                 ├─ Validation      (hand-written field checks, size limits)
                                 ├─ Mongoose (lean() reads, aggregation for ratings & banner URLs)
                                 ▼
                              MongoDB  ──►  JSON (or bytes)  ──► UI
Server Components (/, /resource/[id]) skip the HTTP hop: they call Mongoose / lib helpers directly, JSON-serialise, and pass props to client components.
Mutations that affect cached pages call revalidatePath("/") and/or revalidatePath("/resource/<id>").
```

---

## 16. Important business logic

- Only `admin`/`superAdmin` create, edit, delete resources and subjects. **Any admin may edit/delete any resource or subject** (no `createdBy` check); only the admin *list view* filters by creator for role `admin`.
- Only `superAdmin` lists users, creates pending admins, demotes/removes admins. Cannot remove self or another superAdmin.
- Roles change via: sync (owner e-mail → `superAdmin`), claim (→ `admin`), `DELETE /api/users/[id]` (→ `user`). No other API changes roles.
- Subject find-or-create by name (case-insensitive regex) on resource create/update; subject deletion blocked while referenced.
- File size cap `MAX_FILE_SIZE` env (default 10 MiB); error text hard-codes "10MB".
- Username change: once per 30 days; handle: once per 15 days; both unique.
- Comments: anyone signed-in can post; only author/superAdmin delete. **Admins cannot delete others' comments.** Standalone ratings are comment documents with empty `content`.
- Rating: 1–5; one upsert per user per resource via `/rate`.
- Favorites/likes are stored on the user, toggled via `POST /api/users/me/favorites`.
- Pending admin records are single-use: consumed (deleted) on successful claim.
- `bannerImageUrl` data-URI values are never returned by list/detail APIs; clients receive `/api/resources/<id>/banner?v=<updatedAt ms>`.
- Edit form echoes banner URL; the PUT handler drops it if it is the resource's own banner route.

---

## 17. Environment variables

There is **no `.env.example`** in the repo and `.env*` is git-ignored. Variables found by auditing source:

| Variable | Required | Public/Private | Purpose / where used |
|---|---|---|---|
| `MONGODB_URI` | **Yes** | Private | MongoDB connection string — `src/lib/db.ts` (throws if missing) |
| `MAX_FILE_SIZE` | No (default `10485760`) | Private | Upload size cap (bytes) — `lib/utils.ts`, resource POST/PUT |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes (Clerk SDK)** | Public | Not referenced in source; required by `@clerk/nextjs`. Presence in Vercel/local: **Needs verification** |
| `CLERK_SECRET_KEY` | **Yes (Clerk SDK)** | **Private/secret** | Same — server-side Clerk calls (`auth()`, `currentUser()`, middleware). **Needs verification** |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `…SIGN_UP_URL` / redirect URLs | Unknown | Public | Not referenced in source; whether set in deployment: **Needs verification** |
| `NEXT_PHASE` | – | Set by Next.js | Read in `app/page.tsx` to allow an empty fallback only during `next build` |

Rules: never commit values; only `NEXT_PUBLIC_*` may be exposed to the browser; keep `CLERK_SECRET_KEY` and `MONGODB_URI` server-only. Required in **local development** (`.env.local`) and in **Vercel (Production + Preview)**; Vercel values **Needs verification**.

---

## 18. Vercel / production deployment

Confirmed from the repository: `vercel.json` (headers only — **no** build/install command, region or Node version overrides), `next.config.ts`, `.gitignore` ignores `.vercel`. Everything else is **Needs verification** (Vercel dashboard): connected repo/branch, build & install commands (Vercel defaults for Next.js are presumably used), Node.js version, env vars, preview behaviour, domain.

`vercel.json` headers: all routes `X-Robots-Tag: index, follow`; `/_next/static/*` immutable cache; `/api/subjects*` `public, s-maxage=300, stale-while-revalidate=600`.

```text
Developer → git commit → git push origin master → GitHub → Vercel detects push
          → build (`next build`) → deploy (production if it is the configured production branch; otherwise preview)
```
Branch → environment mapping: **Needs verification**. Serverless considerations: request body size limits on Vercel functions may be lower than the 10 MiB upload cap (Needs verification); the DB connection is reused per warm instance via `global.mongooseCache`.

---

## 19. Git workflow

- Remote: `origin = https://github.com/sulphite1011/LMS-For-MLT`. This clone has only `master`. An earlier clone also had `dev` (unmerged work, see §30) and `main`; check GitHub before assuming they are gone.
- Normal flow (assuming `master` is production — Needs verification):
```bash
git pull origin master
# make changes
git add <files>            # prefer explicit paths
git commit -m "description"
git push origin master     # Vercel then builds/deploys
```
- Line endings: working-tree files are **CRLF** (Windows checkout). The git index stores LF. If you edit in a non-Windows environment, preserve CRLF and use `git -c core.autocrlf=true …` to avoid whole-file diffs.
- Do not commit `.env*`, `node_modules`, `.next`. Avoid force-pushing `master`/`main`. If a `dev` branch still exists on GitHub, do not merge it wholesale without reviewing — it diverged (see §30).

---

## 20. Local development

```bash
git clone https://github.com/sulphite1011/LMS-For-MLT.git
cd LMS-For-MLT
npm install            # (or `npm ci` to follow the lockfile exactly)
# create .env.local with: MONGODB_URI, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY (values from your own Clerk + MongoDB accounts)
npm run dev            # next dev  → http://localhost:3000
npx tsc --noEmit       # type check (no npm script exists for it)
npm run lint           # eslint
npm run build          # next build
npm run start          # next start (after build)
```
Scripts in `package.json`: `dev`, `build`, `start`, `lint` only.
1. **Clerk setup:** create a Clerk application, copy the publishable + secret keys. Make the Super Admin's Clerk account use the owner e-mail hard-coded in `src/app/api/auth/sync/route.ts` to receive `superAdmin` (or change that logic deliberately with approval).
2. **Database:** any MongoDB the connection string points to; collections/indexes are created automatically.
3. First sign-in creates the `User` document via `/api/auth/sync`.

---

## 21. Performance architecture

Present in the code (not benchmarked — **no before/after measurements exist**; `docs/performance/phase-3-baseline.md` explains how to capture them):
- **Homepage ISR** (`revalidate = 60`) + `revalidatePath("/")` on resource create/update/delete. Failure at runtime rethrows so ISR keeps the last good page; during `next build` it falls back to empty.
- **Resource page ISR** (`revalidate = 60`) with direct DB read (no self-HTTP) + `revalidatePath` on edit/delete/rating; client fetches only `/api/users/me` (signed-in only). Fallback to client fetch if the server read fails.
- **Banners:** list/detail queries exclude `bannerImageUrl` and compute URLs inside MongoDB (`getBannerUrlMap` aggregation); `/banner` route serves bytes with immutable cache + ETag; `next/image` optimises (AVIF/WebP, `minimumCacheTTL` 1 week).
- **Avatars:** comment payloads reference `/api/avatars/<clerkId>?v=<hash>` instead of repeating base64.
- **Indexes:** Resource `createdAt`, compound subject/type indexes; Comment `resourceId+createdAt`, `resourceId+rating`.
- **Rating stats** via aggregation, not by loading documents.
- **`getAuthUser`** uses a projection and `.lean()`; `customAvatar` only on request.
- **Comment pagination:** cursor-based, 20 per page, "Load more comments".
- **Search debounce** (350 ms) and escaped regex.
- **Sitemap** queries only `_id/updatedAt/createdAt` (hourly revalidate).
- **Connection reuse:** `global.mongooseCache`.
- **Code splitting / lazy loading:** `CommentSection` dynamic-import status Needs verification; `optimizePackageImports` for `lucide-react`, `framer-motion`.
- **Static asset caching:** `/_next/static` immutable; `/images/*` 1 day + SWR.
- **Not done:** attachment projection in file route; bundle analysis; auth-sync reduction (analysis in `docs/performance/auth-sync-analysis.md`); `remotePatterns` restriction.

---

## 22. UI / UX system

- **Theme:** Tailwind v4 tokens in `globals.css` — navy `#0A1929`/`#132F4C`, teal `#14b8a6` (`teal-dark #0d9488`, `teal-light #5eead4`), text `#1e293b`/`#64748b`, semantic success/warning/error. Inter font. Dark navy hero/sign-in backgrounds, white cards (`rounded-2xl shadow-sm`).
- **Dark mode:** `html.dark` class (set before first paint by an inline script in `layout.tsx`: saved choice in `localStorage["theme"]`, else OS preference). `components/ThemeToggle.tsx` is in the Navbar (desktop + mobile menu) and the admin sidebar. Because components use fixed light Tailwind classes, the dark palette is applied by class re-mapping at the end of `globals.css` (`html.dark .bg-white { … }` etc.). **When you use a new light-only colour class, add its dark mapping there.** Uploaded MCQ iframes stay light (`iframe.mcq-frame`).
- **Navigation:** `Navbar` (logo, My Profile, Admin link for admin/superAdmin, Clerk `UserButton`, mobile menu); `AdminSidebar` (collapsible, mobile drawer, sign-out).
- **Responsive:** mobile-first grids; separate mobile menu and admin drawer.
- **Loading:** branded animated loader (`components/ui/Loading.tsx`) via `app/loading.tsx` and `app/resource/[id]/loading.tsx`; `Skeleton` (`ResourceGridSkeleton`, `DetailSkeleton`) in client states.
- **Empty states:** `EmptyState`. **Modals:** `ConfirmModal` (admin deletes). **Toasts:** `react-hot-toast` via `ToastProvider`. **Animations:** Framer Motion (card hover/entrance, tab transitions, menus). **Reusable:** `ResourceCard`, `StarRating`, `SearchFilterBar`, `ScrollToTop`.
- **Accessibility:** no dedicated audit; Needs verification.

---

## 23. Security architecture

### Confirmed protections
- Server-side auth on all mutating APIs (`getAuthUser`/`require*`); role checks for admin/superAdmin routes.
- File bytes gated by `requireAuth()` and served `private, no-store`.
- Clerk-verified sessions; `/admin(.*)` requires sign-in at middleware.
- Passwords exist only for pending-admin placeholders: bcrypt (cost 12), `password` excluded from `getAuthUser()` and `/api/users/me`.
- Favorites/likes/profile mutations use the session's `clerkId`, not client-supplied ids.
- Comment/reply deletion limited to author or superAdmin; `like`/`reply` require sign-in.
- Search input is regex-escaped. React escapes rendered text.
- Banner/avatar routes only serve decoded `image/*`, `nosniff` + sandbox CSP.
- `.env*` git-ignored; no secrets found in source (the owner's e-mail address *is* hard-coded).
- Client cannot set `role` through `PATCH /api/users/me` (field not read).

### Potential risks (confirmed from code, not exploited/tested)
1. **Claim flow:** no rate limiting, no expiry on pending credentials; any signed-in user can brute-force `username`+`password` (username is guessable only if known). A successful claim sets the caller's role to `admin` **even if the caller is currently `superAdmin`** (`findOneAndUpdate({role:"admin"})`); the next `/api/auth/sync` re-promotes only the owner e-mail account.
2. **`GET /api/users` returns the `password` hash** of pending records (superAdmin-only); `POST /api/users` response also returns `hashedPassword`.
3. **YouTube URLs and external links are not server-protected** (public API + ISR page props).
4. **Any signed-in user can download any resource's files** (no per-resource entitlement).
5. **Any admin can edit/delete any resource/subject**; `?admin=true` filtering is not authorization.
6. **Admin area UI gate is client-side**; correct, but data safety depends on API checks (which exist).
7. **`limit` is unbounded** on `GET /api/resources`; **comments GET without `limit` is unbounded** (legacy path).
8. **`images.remotePatterns` allows any `https` host** (`**`) — open image-optimizer usage.
9. **User-supplied `customAvatar` is stored without server-side size/type validation** in `PATCH /api/users/me` (Needs verification).
10. **Hard-coded owner e-mail** controls superAdmin promotion (`api/auth/sync/route.ts`, `lib/auth.ts`).
11. **CSRF:** relies on Clerk session cookies + JSON/multipart POSTs; no explicit CSRF tokens (Needs verification of Clerk/Next protections).
12. Error responses sometimes return raw `error.message`/`String(error)` (information disclosure).
13. `X-Robots-Tag: index, follow` (vercel.json) applies to all paths incl. `/api` and `/admin`, while `robots.txt` disallows them (inconsistent).

### Needs verification
Clerk dashboard settings (allowed sign-up methods, session lifetime); actual Vercel env/headers behaviour; whether `middleware.ts` runs as expected under Next 16; MongoDB network/user permissions.

---

## 24. 🚨 DO NOT BREAK THESE

- 🔒 **Never remove `requireAuth()` from `/api/resources/[id]/file`**, and never give it a public/shared cache header (`private, no-store`).
- 🔒 **Never remove `requireAdmin()`/`requireSuperAdmin()`** from any admin/superAdmin route. UI checks are *not* security.
- 🔒 **`/admin` must stay inaccessible to ordinary users** (role check in `AdminLayout` **and** API checks). `/admin/claim` must stay reachable by any signed-in user.
- 🔒 **Do not break the claim flow:** pending record shape (`isPending`, `role:"admin"`, bcrypt `password`, `clerkId: pending_*`), `POST /api/auth/claim-admin`, the full reload to `/admin`, and `/api/auth/sync` refreshing the role.
- 🔒 **Do not change role names/enum values** (`superAdmin`, `admin`, `user`) — they appear in models, `lib/auth.ts`, layout, navbar, dashboard, sync, APIs.
- 🔒 **Do not touch `/api/auth/sync` casually** — it creates users and performs owner promotion; a signed-in Clerk user without a `User` doc gets 401 everywhere.
- 🔑 **Never put secrets in `NEXT_PUBLIC_*`**; never commit `.env*`.
- 🗄️ **Do not rename DB fields or delete data** (`bannerImageUrl` data-URIs, `files[].fileContent`, `fileData`, `customAvatar` are live data; legacy `fileData`/`bannerImageData` must keep working).
- 🖼️ **Do not return `bannerImageUrl` raw data-URIs from list/detail APIs**; keep `-bannerImageUrl` in selects and the `/banner` route. PUT must keep ignoring the resource's own banner URL (`isOwnBannerRoute`) or edits will destroy banners.
- ♻️ **Keep `revalidatePath` calls** in resource create/update/delete and rating/comment writes, or cached pages go stale.
- 💬 **Keep rating math independent of comment pagination** (aggregation over all comments).
- 👤 **Keep `getAuthUser()` projections** (excluding `password`/`customAvatar`); use `{includeAvatar:true}` only where an avatar is stamped on new content (comment, reply, rating).
- 🚫 Do not migrate MongoDB/Clerk/Vercel or file storage, and do not delete a `dev` branch (if it still exists on GitHub) or its unmerged work, without explicit approval.
- 🧾 Preserve **CRLF line endings** in existing files.
- 🧪 **MCQ HTML is untrusted content.** Keep it sandboxed: the iframe `sandbox` attribute must never include `allow-same-origin`, and `/api/mcq/units/[id]/html` must keep its CSP `sandbox` header. Keep `htmlContent` as `select:false` and never return it from list APIs.
- 🔗 **MCQ URLs are shared links:** never regenerate a specialty/subject/unit `slug` on rename; keep `revalidatePath("/mcqs","layout")` after MCQ writes.

---

## 25. 🤖 AI coding agent instructions

1. Read this README completely. 2. **The current source code is the final authority** (this file may lag). 3. Inspect the relevant files before editing. 4. Preserve existing functionality. 5. Make the smallest safe change. 6. No unnecessary rewrites or refactors. 7. No service/storage/database migrations without explicit approval. 8. Never delete DB fields or data. 9. Never weaken authentication. 10. Never weaken authorization. 11. Never expose or request secrets. 12. State security implications of each change. 13. State database implications (schemas, indexes, data compatibility). 14. Run `npx tsc --noEmit`. 15. Run `npm run lint` where practical. 16. Run `npm run build` where practical. 17. Review `git diff`. 18. Explain what changed. 19. Explain possible regressions. 20. Explain deployment impact (ISR/revalidation, env vars, Vercel).

**Project-specific rules**
- Next 16: `params` is a Promise — `const { id } = await params`.
- Path alias `@/` = `src/`. Every route handler must call `dbConnect()` before Mongoose use.
- Import `@/models/Subject` and `@/models/User` wherever you `.populate()` them.
- Roles are read from MongoDB via `getAuthUser()`, never trusted from the client.
- Use `.lean()` and field projections; never select file `Buffer`s or `bannerImageUrl` in list queries (`-fileData.fileContent -files.fileContent -bannerImageData -bannerImageUrl`).
- After changing data shown on `/` or `/resource/[id]`, call `revalidatePath`.
- Preserve CRLF line endings; edit with tools that do not normalise them.
- Do not report a check as "passed" unless it was executed. State plainly what was not run.
- Before claiming performance gains, measure (see `docs/performance/`).
- Do not "clean up" legacy fields (`fileData`, `bannerImageData`) or the unused `syncUser()` without approval.
- If the request would require weakening a rule in §24, stop and ask.

---

## 26. Change workflow

```text
Read README → understand affected system → inspect relevant source files → identify dependencies
→ make smallest change → run validation (tsc, lint, build) → review git diff
→ commit → push → Vercel deployment → verify production
```
Validation: `npx tsc --noEmit && npm run lint && npm run build`, then the manual checks in §27. After deploy, verify the affected pages/APIs on the production URL and watch Vercel build/function logs.

---

## 27. Testing / validation

- **Automated tests: none** (no test script, no test files, no CI config / `.github`).
- Static checks available: TypeScript (`npx tsc --noEmit`), ESLint (`npm run lint`), `npm run build`.
- **Status:** these were **not executed** against the current code in the audit environment (dependency install blocked). Treat the current tree as *unverified until you run them*.
- **Manual checklist (critical systems):**
  1. Sign up / sign in / sign out (Clerk); first sign-in creates a `User` (role `user`).
  2. Normal user: `/admin` shows "Admin Access Required"; `/admin/claim` loads; dashboard shows Request/Claim Admin buttons.
  3. Signed-out: `/admin/claim` → sign-in; resource page shows locked video/files/links; `GET /api/resources/<id>/file` → **401**.
  4. Admin claim: Super Admin creates a pending admin (`/admin/users`), user redeems at `/admin/claim`, reloads into `/admin`.
  5. Admin: create resource (banner + PDF + YouTube + link), edit **without** changing banner (banner must survive), replace/clear banner, delete resource, create/delete subject.
  6. Signed-in user: open/download PDF, comment, reply, like, rate, load-more comments, favorite/like resource.
  7. Super Admin: users page, remove/demote admin, delete another user's comment.
  8. Homepage/resource page show changes after admin edits (ISR + revalidation).

---

## 28. Troubleshooting

| Symptom → Likely cause → Where to check → Fix |
|---|
| `Please define the MONGODB_URI environment variable` → missing env → `.env.local` / Vercel env → add it (private). |
| Clerk errors / blank auth UI / redirect loops → missing/incorrect Clerk keys or URLs → env, Clerk dashboard, `middleware.ts` → set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`. |
| Signed-in but APIs return 401 → no `User` doc yet (sync not completed) → Network tab for `POST /api/auth/sync`, DB `users` collection → reload; check sync errors/Clerk. |
| `/admin` shows "Admin Access Required" for an admin → DB role not `admin`/`superAdmin`, or sync failed → `GET /api/users/me`, `users.role` in DB → fix role via claim/Super Admin; reload. |
| Claim says "Invalid credentials or claim already processed" (404) → wrong username, record already consumed, or `isPending` false → `users` collection → Super Admin creates a new pending admin. |
| Banner missing after editing a resource → PUT overwrote `bannerImageUrl` → check `isOwnBannerRoute` guard in `api/resources/[id]/route.ts`, DB value → restore from backup/re-upload. |
| Images with `?v=` fail ("localPatterns") → `images.localPatterns` missing → `next.config.ts` → keep the `/api/resources/*/banner` pattern. |
| Homepage/resource page not updating → ISR cache → `revalidate`, `revalidatePath` calls, Vercel cache → wait ≤60 s or redeploy. |
| PDF returns 401 → signed out or no `User` doc → sign in; confirm sync. PDF 404 → `files[index]`/`fileData` missing. |
| Large upload fails → size > `MAX_FILE_SIZE` or Vercel body limit → env, Vercel limits (Needs verification) → reduce file / adjust. |
| Build fails on types → `any` casts, Mongoose lean typing, unverified Phase 1–4 code → run `npx tsc --noEmit`, fix reported lines. |
| Works locally, differs in production → env vars, ISR/CDN caching, Clerk instance (dev vs prod keys) → compare env and headers. |

---

## 29. Known issues & technical debt

### Confirmed issues
- **Type-check, lint and build of the current tree have never been run** (environment limitation) — unverified.
- YouTube URLs and external links are only UI-gated (see §12, §23).
- `PUT /api/resources/[id]` does not update `files[]`/`externalLinks[]` (legacy `fileData` only).
- Deleting a resource does not delete its comments.
- Claim flow demotes a `superAdmin` caller to `admin` (§23).
- `dev.log`, `dev.err` committed; `date-fns` and `next-sitemap` dependencies unused; `syncUser()` in `lib/auth.ts` unused; `serverActions.bodySizeLimit` configured but no Server Actions exist.
- Hero "Resources" stat uses the loaded page length (max 20), not the total.

### Technical debt
- MCQ HTML runs in a sandbox **without** `allow-same-origin`, so uploaded pages cannot use `localStorage`/cookies (progress saving inside those pages will not work).
- MCQ HTML (≤ 4 MB) is stored inside MongoDB documents like other files; MCQ pages are publicly readable (no sign-in gate, by design so links can be shared).
- Binary files and images stored in MongoDB (document-size limit, large payloads, file route loads *all* attachments per request).
- `getAuthUser()` returns `any`; widespread `any` in routes; error-to-status mapping by string matching.
- `src/middleware.ts` vs Next 16 `proxy.ts` convention (Needs verification).
- No automated tests/CI; no `.env.example`; no `error.tsx`/`not-found.tsx`.
- `/api/auth/sync` runs on every full page load and calls Clerk's backend API each time.
- `images.remotePatterns: "**"`.
- Framer Motion on every card (bundle impact unmeasured).

### Potential risks (unconfirmed)
- Vercel request-body size vs 10 MiB uploads; MongoDB 16 MB document limit with many files; CSRF posture; behaviour of ISR + Clerk in production builds; edit UI behaviour for multi-file resources.

---

## 30. Important project history

(Condensed from `git log`; `master` has 30 commits at HEAD `9a87aac`.)
- **2026-03-01/02:** initial app; subject UI change; SEO phases (Search Console header, metadata); super-admin creation fix; **"use admin credentials provided by super admin" (pending-admin + claim system)**; admin deletion separated from user deletion; rating + comment system with nested replies; multi-file uploads; user dashboard.
- **2026-03-03:** avatar, favorites/likes fixes; username 30-day restriction; **"version 2.0.0"**; PR #1 merge (`94b5857`).
- **`dev` branch work seen in an earlier clone (not in `master`; branch absent from this clone — Needs verification on GitHub):** safe-sandbox init, removal of hard-coded secrets/sensitive scripts, middleware→`proxy.ts` rename, heartbeat API (prevent DB pause), sandbox-mode indicator, share-course button, **guest restriction** (sign-in-gated video/PDF + `requireAuth` on the file route, `b5c2e4c`), branded loader (`1bf785c`), "web laging" (`f84bd72`, 2026-03-26). Parts of the guest restriction and loader were ported to `master` in `d355f07`; the rest was **not** merged.
- **2026-10-06 — performance + access work (all on `master`):**
  - `09c99da` "version3.0.0 claude update" — AI-assisted update (touches 34 files incl. `lib/banner.ts`, `lib/resources.ts`, `lib/comments.ts`, indexes); `485fff4` performance snapshot: banner URL route (stop returning base64), ISR homepage + revalidation, sitemap query, avatar shrink + header fix, auth-user projection, rating aggregation, `createdAt` index, search debounce, `loading.tsx`, log cleanup, server-rendered resource page, comment avatars route, comment pagination, performance docs.
  - `d355f07` / `73c8980` **"fix: restore protected access and loading UI"** — `requireAuth` + `private, no-store` on the file route, locked video/PDF UI, branded loader.
  - `4b095bc` "external links protected" — locked External Links block for signed-out users.
  - `b2484d7` "routes protected 2.0" — `/admin` role check (admin/superAdmin only) with `/admin/claim` exception; dashboard "Admin Access" card (Request/Claim buttons for role `user`).
  - `f8ba454`, `3ffb326`, `e5942e2`, `9a87aac` — merges, a merge-conflict fix, removal of an accidental file, and formatting-only changes to `ResourceDetailClient.tsx`.
- **Uncommitted (added after `9a87aac`):** **fixes** — favorites/liked/activity lists were empty on cold serverless instances because `Subject` was not registered before `populate("subjectId")` (explicit import added in `/api/users/me/favorites` and `/activity`); homepage hearts/bookmarks were white because the ISR homepage is rendered with `currentUser={null}` (now `HomeClient` loads `/api/users/me` on the client and `ResourceCard` syncs props). **Unknown Author** flow for resources of removed admins, **dark mode**, and the **MCQs section** (specialty → semester → subject → unit → page) — models `McqSpecialty`/`McqSubject`/`McqUnit`, `lib/mcq.ts`, `/api/mcq/**`, public `/mcqs/**` pages, `ShareButton`, `/admin/mcqs`, Navbar "MCQs" link, admin sidebar item (Super Admin), sitemap entries. Not yet type-checked/built/run.
- **Working tree:** the ZIP this README shipped in showed many files as "modified" only because of CRLF vs LF line endings; no functional uncommitted changes were identified (Needs verification with `git -c core.autocrlf=true status`).

---

## 31. Quick reference

```text
Project:                Hamad's MLT Study Hub (LMS-For-MLT, package "hamads-lms")
Production:             https://lms-for-mlt.vercel.app   (live status Needs verification)
Repository:             https://github.com/sulphite1011/LMS-For-MLT
Production Branch:      master (Needs verification in Vercel)
Framework:              Next.js 16.1.6 (App Router) · React 19.2.3 · TypeScript · Tailwind v4
Database:               MongoDB via Mongoose (MONGODB_URI)
Authentication:         Clerk (@clerk/nextjs); roles stored in MongoDB User.role
Hosting:                Vercel
Main Resource System:   Resource docs in MongoDB; files = Buffers, banners = base64 data-URIs (served via /banner route)
Roles:                  user (default) · admin · superAdmin  (+ visitor, + pending-admin placeholder records)
Admin System:           /admin (role-gated layout + API checks); Super Admin creates pending admins; users claim at /admin/claim
Critical Security:      src/lib/auth.ts, src/middleware.ts, /api/resources/[id]/file (requireAuth), /api/auth/claim-admin, /api/users*
```

### Most important files
```text
src/lib/auth.ts                          → server authentication/authorization helpers (getAuthUser, require*)
src/middleware.ts                        → Clerk middleware; auth.protect() for /admin(.*)
src/app/admin/layout.tsx                 → admin UI role gate (+ /admin/claim exception)
src/app/api/auth/sync/route.ts           → creates/updates User; owner → superAdmin promotion
src/app/api/auth/claim-admin/route.ts    → temporary-credential admin claim
src/app/api/users/route.ts, users/[id]/  → Super Admin: pending admins, demote/remove
src/app/api/resources/route.ts           → list + create resources
src/app/api/resources/[id]/route.ts      → detail, update (banner guard), delete (+revalidation)
src/app/api/resources/[id]/file/route.ts → protected file download (requireAuth, private/no-store)
src/app/api/resources/[id]/banner/route.ts → data-URI banner → cacheable image
src/lib/banner.ts, src/lib/resources.ts  → banner URL aggregation; shared resource reads
src/app/resource/[id]/page.tsx + ResourceDetailClient.tsx → resource page, locked UI for signed-out users
src/app/page.tsx + HomeClient.tsx        → ISR homepage + search/filter
src/contexts/AuthContext.tsx             → client auth state + /api/auth/sync trigger
src/models/{User,Resource,Comment,Subject}.ts → schemas & indexes
src/lib/db.ts                            → cached MongoDB connection
src/components/comments/CommentSection.tsx → comments, ratings, pagination UI
src/app/dashboard/page.tsx               → user dashboard (+ Admin Access card)
next.config.ts, vercel.json              → image config, headers, caching
docs/performance/*.md                    → performance/verification notes (no measurements exist)
```

---

## 32. Final audit

Cross-checked against the repository: 25 route handler files (documented in §14), 14 page/layout routes (§6), 4 models (§13), 3 env vars found in source + Clerk keys inferred from the SDK (§17), `package.json` scripts (§20), `vercel.json`/`next.config.ts` (§18, §21), roles (`user`/`admin`/`superAdmin` + pending state), auth helpers (§7), admin/claim flow (§9). Items **not** confirmable from the repo are marked **Needs verification**: Vercel project settings (branch, build command, Node version, env values), Clerk dashboard configuration, MongoDB hosting, build output classification, runtime behaviour of any feature (nothing was executed), and the effect of the legacy `PUT` limitations on the edit UI. The old README was not used as a source.
