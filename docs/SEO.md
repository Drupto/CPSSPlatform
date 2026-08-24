# SEO Implementation Guide — KINÉTIKA

This document describes the comprehensive SEO infrastructure implemented for the KINÉTIKA fitness education platform.

## What Was Implemented

### 1. Centralized SEO Configuration (`src/lib/seo.ts`)

A single source of truth for all site-wide SEO values:

- **Brand name, tagline, description, keywords** — consistent across all pages
- **`buildMetadata()`** helper — generates per-page `Metadata` objects with canonical URLs, OpenGraph, Twitter cards, robots directives, and keywords
- **JSON-LD generators** — `organizationJsonLd()`, `websiteJsonLd()`, `faqJsonLd()`, `courseJsonLd()`, `itemListJsonLd()`, `breadcrumbJsonLd()`
- **`absoluteUrl()`** — builds absolute URLs from paths for canonical/sitemap/structured data

### 2. Root Layout Metadata (`src/app/layout.tsx`)

- `metadataBase` set to production URL
- Title template: `%s | KINÉTIKA`
- Default OpenGraph + Twitter card with 1200×630 image
- `robots` directives allowing indexing with `max-image-preview: large`
- `viewport` with theme color
- Web manifest link
- Icon set (favicon, SVG, apple-touch-icon)
- Google Search Console verification placeholder
- **Organization + WebSite JSON-LD** injected on every page

### 3. Dynamic Sitemap (`src/app/sitemap.ts`)

- Static routes: `/`, `/courses`, `/privacy-policy`, `/terms-of-service`
- Dynamic routes: one entry per published course (fetched via Firebase Admin SDK)
- Proper `lastModified`, `changeFrequency`, and `priority` values

### 4. Robots.txt (`src/app/robots.ts`)

- Allows all crawlers on public routes
- Disallows: `/admin/*`, `/dashboard/*`, `/auth`, `/courses/*/learn`
- Points to sitemap at `/sitemap.xml`

### 5. Web App Manifest (`src/app/manifest.ts`)

- PWA-ready manifest with app name, description, icons, theme colors
- Categories: education, health, fitness

### 6. Dynamic OpenGraph Image (`src/app/opengraph-image.tsx`)

- Edge-rendered 1200×630 PNG
- Branded gradient background with logo, tagline, and key features
- Automatically used as the default OG/Twitter image for all pages

### 7. Page-Level Metadata

| Page | Metadata Type | JSON-LD |
|------|--------------|---------|
| Homepage (`/`) | Static `metadata` export | FAQPage + BreadcrumbList |
| Courses catalog (`/courses`) | `generateMetadata()` (server) | ItemList + BreadcrumbList |
| Course detail (`/courses/[slug]`) | `generateMetadata()` (server, dynamic) | Course + BreadcrumbList |
| Privacy Policy (`/privacy-policy`) | Static `metadata` export | — |
| Terms of Service (`/terms-of-service`) | Static `metadata` export | — |

### 8. Noindex for Private Pages

Route segment layouts with `robots: { index: false, follow: false }`:

- `src/app/auth/layout.tsx` — login/signup
- `src/app/dashboard/layout.tsx` — student dashboard
- `src/app/admin/layout.tsx` — admin panel
- `src/app/courses/[slug]/learn/layout.tsx` — enrolled course content

### 9. Server-Side Data Access

- **`src/lib/firebase-admin.ts`** — Firebase Admin SDK singleton for server-side Firestore access
- **`src/lib/course-server.ts`** — `getPublishedCoursesServer()` and `getCourseBySlugServer()` using Admin SDK
- Error-safe: returns empty/null on failure so builds never crash

### 10. Component Refactoring

Client components (`"use client"`) can't export `metadata`, so interactive pages were split:

- `src/components/courses/courses-catalog.tsx` — client component (search, Firestore fetch)
- `src/app/courses/page.tsx` — server wrapper with metadata + JSON-LD
- `src/components/courses/course-detail.tsx` — client component (auth, enrollment)
- `src/app/courses/[slug]/page.tsx` — server wrapper with `generateMetadata` + JSON-LD

### 11. Footer & Semantic HTML Fixes

- Replaced `href="#"` placeholder links with proper `<Link>` components
- Added `<nav aria-label="Footer">` for accessibility
- Links point to `/courses`, `/#curriculum`, `/#instructor`

### 12. Shared FAQ Data (`src/lib/faq-data.ts`)

FAQ content extracted to a shared module so both the visible FAQ component and the FAQPage JSON-LD structured data stay in sync.

### 13. Next.js Config Updates (`next.config.ts`)

Added `firebasestorage.googleapis.com` and `lh3.googleusercontent.com` to `images.remotePatterns` for course cover images and user avatars.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Production site URL (e.g. `https://kinetika.fit`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON (local dev) |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Inline service account JSON (CI/CD) |

## Post-Deploy Checklist

1. **Set `NEXT_PUBLIC_SITE_URL`** in your hosting environment to your production domain
2. **Google Search Console**: Register your site, get the verification token, and replace `GOOGLE_SITE_VERIFICATION_TOKEN` in `src/app/layout.tsx`
3. **Submit sitemap**: Submit `https://yourdomain.com/sitemap.xml` in Google Search Console
4. **Firebase Admin credentials**: Ensure the runtime service account has Firestore read access (automatic on App Hosting/Cloud Run)
5. **Add real icon assets**: Replace placeholder `public/icon.svg` with branded PNG icons (`apple-icon.png`, `icon-192.png`, `icon-512.png`)
6. **Social profiles**: Update `sameAs` URLs in `src/lib/seo.ts` with your actual social media profiles
7. **Support email**: Update `siteConfig.email` in `src/lib/seo.ts` with your real support email

## Files Created/Modified

### New Files
- `src/lib/seo.ts` — centralized SEO config + helpers
- `src/lib/firebase-admin.ts` — server-side Firebase Admin SDK
- `src/lib/course-server.ts` — server-side course data access
- `src/lib/faq-data.ts` — shared FAQ data
- `src/components/json-ld.tsx` — JSON-LD renderer component
- `src/components/courses/courses-catalog.tsx` — extracted client component
- `src/components/courses/course-detail.tsx` — extracted client component
- `src/app/sitemap.ts` — dynamic sitemap
- `src/app/robots.ts` — robots.txt
- `src/app/manifest.ts` — web app manifest
- `src/app/opengraph-image.tsx` — dynamic OG image
- `src/app/auth/layout.tsx` — noindex layout
- `src/app/dashboard/layout.tsx` — noindex layout
- `src/app/admin/layout.tsx` — noindex layout
- `src/app/courses/[slug]/learn/layout.tsx` — noindex layout
- `public/icon.svg` — SVG app icon

### Modified Files
- `.env` — added `NEXT_PUBLIC_SITE_URL`
- `next.config.ts` — added Firebase Storage image hostname
- `src/app/layout.tsx` — comprehensive root metadata + JSON-LD
- `src/app/page.tsx` — homepage metadata + FAQ JSON-LD
- `src/app/courses/page.tsx` — server component with metadata + ItemList JSON-LD
- `src/app/courses/[slug]/page.tsx` — server component with `generateMetadata` + Course JSON-LD
- `src/app/privacy-policy/page.tsx` — proper metadata
- `src/app/terms-of-service/page.tsx` — proper metadata
- `src/components/sections/faq.tsx` — uses shared FAQ data
- `src/components/sections/footer.tsx` — fixed links + semantic nav