# Hamad's LMS - MLT Study Hub

A full-featured Learning Management System built for Medical Laboratory Technology resources. Browse notes, videos, PDFs, quizzes, and more -- all in one place.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Authentication:** Clerk (username/password)
- **Database:** MongoDB with Mongoose
- **Styling:** Tailwind CSS v4 + Framer Motion animations
- **Icons:** Lucide React
- **File Storage:** MongoDB (Base64 encoded) + external links (Google Drive, GitHub)
- **State Management:** React Context

## Getting Started

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Required variables:**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key from [dashboard.clerk.com](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `MONGODB_URI` | MongoDB connection string |
| `NEXT_PUBLIC_APP_URL` | App URL (default: `http://localhost:3000`) |
| `MAX_FILE_SIZE` | Max upload size in bytes (default: `10485760` = 10MB) |

### 3. Set Up Clerk

1. Create a Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Enable **Username** authentication (disable social logins for username/password only)
3. Copy your API keys to `.env.local`

### 4. Set Up MongoDB

1. Create a MongoDB Atlas cluster or use a local MongoDB instance
2. Copy the connection string to `MONGODB_URI` in `.env.local`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    page.tsx                    # Public homepage with hero, search, resource grid
    layout.tsx                  # Root layout with Clerk + Auth providers
    resource/[id]/page.tsx      # Resource detail page with PDF viewer
    sign-in/[[...sign-in]]/     # Clerk sign-in page
    sign-up/[[...sign-up]]/     # Clerk sign-up page
    admin/
      layout.tsx                # Admin layout with sidebar
      page.tsx                  # Dashboard overview with stats
      subjects/page.tsx         # Subject management (CRUD)
      resources/page.tsx        # Resource listing with actions
      resources/new/page.tsx    # Add new resource form
      resources/[id]/edit/      # Edit resource form
      users/page.tsx            # User management (Super Admin only)
    api/
      auth/sync/route.ts        # Sync Clerk user to MongoDB
      subjects/route.ts         # GET all / POST new subject
      subjects/[id]/route.ts    # PUT / DELETE subject
      resources/route.ts        # GET all / POST new resource
      resources/[id]/route.ts   # GET / PUT / DELETE resource
      resources/[id]/file/      # Serve uploaded PDF/file from MongoDB
      users/route.ts            # GET all / POST new admin
      users/[id]/route.ts       # DELETE admin user
  components/
    Navbar.tsx                  # Public navigation bar
    AdminSidebar.tsx            # Admin collapsible sidebar
    ResourceCard.tsx            # Resource card with hover effects
    SearchFilterBar.tsx         # Search + filter chips component
    EmptyState.tsx              # Empty state illustrations
    ui/
      Skeleton.tsx              # Loading skeleton components
      ConfirmModal.tsx          # Delete confirmation modal
      ToastProvider.tsx         # Toast notification provider
      ScrollToTop.tsx           # Scroll-to-top floating button
  contexts/
    AuthContext.tsx              # Auth state context (role, username)
  lib/
    db.ts                       # MongoDB connection with caching
    auth.ts                     # Server-side auth helpers
    utils.ts                    # Utility functions
  models/
    User.ts                     # User Mongoose model
    Subject.ts                  # Subject Mongoose model
    Resource.ts                 # Resource Mongoose model
  types/
    index.ts                    # TypeScript types and constants
```

## Roles & Access

| Role | Access |
|---|---|
| **Visitor** (not logged in) | Browse all resources, view details, download PDFs |
| **Admin** | Full content management (subjects, resources) |
| **Super Admin** | Everything + user management |

## Features

- **Public Homepage:** Hero section, search bar, type/subject filter chips, animated resource grid
- **Resource Detail:** Banner, description, embedded YouTube videos, PDF viewer/download, related resources
- **Admin Dashboard:** Stats overview, quick actions, subject CRUD, resource CRUD with file upload
- **File Upload:** Drag-and-drop PDF/image upload (stored in MongoDB), or paste external links
- **User Management:** Super Admin can create/delete admin accounts with auto-generated passwords
- **Animations:** Framer Motion fade-ins, hover scales, skeleton loaders, modal transitions
- **Responsive:** Mobile-first with hamburger menu, collapsible sidebar, touch-friendly buttons

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Deploy

### Netlify

1. Push code to GitHub
2. Import project on Netlify
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```
