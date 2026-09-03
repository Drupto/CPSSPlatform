/**
 * Centralized SEO configuration for KINÉTIKA.
 *
 * This module is the single source of truth for site-wide metadata values
 * (brand name, default title/description, social handles, keywords, etc.)
 * and provides helper functions for building per-page Metadata objects,
 * canonical URLs, and JSON-LD structured data.
 *
 * All values are server-safe (no `window` / Firebase access) so they can be
 * imported from `metadata` exports and route handlers (`sitemap.ts`,
 * `robots.ts`) without becoming client components.
 */

import type { Metadata } from "next";

/* -------------------------------------------------------------------------- */
/*  Site config                                                               */
/* -------------------------------------------------------------------------- */

export const siteConfig = {
  name: "KINÉTIKA",
  /** Production origin — no trailing slash. */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://learnkinetika.com",
  description:
    "Master the science of fitness with KINÉTIKA's comprehensive, evidence-based courses. Prepare for the CSCS exam with 30+ hours of video, 150+ practice questions, and self-paced learning.",
  tagline: "Redefining Fitness Education for Every Body.",
  keywords: [
    "CSCS exam prep",
    "Certified Strength and Conditioning Specialist",
    "NSCA CSCS preparation",
    "strength and conditioning certification",
    "fitness education",
    "exercise science course",
    "sports performance training",
    "evidence-based fitness course",
    "CSCS study guide",
    "KINÉTIKA",
  ],
  authors: [{ name: "KINÉTIKA", url: "https://learnkinetika.com" }],
  creator: "KINÉTIKA",
  publisher: "KINÉTIKA",
  locale: "en_US",
  /** Social handles (used in Twitter / X cards). */
  twitter: "@kinetika",
  /** Default OG image (relative to site root). */
  ogImage: "/opengraph-image.png",
  /** Contact / support email shown in structured data. */
  email: "support@kinetika.fit",
} as const;

export type SiteConfig = typeof siteConfig;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Build an absolute URL from a path (e.g. `/courses` → `https://learnkinetika.com/courses`). */
export function absoluteUrl(path = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${cleanPath}`;
}

/** Build a per-page Metadata object with sensible defaults. */
export function buildMetadata({
  title,
  description,
  path = "/",
  image,
  keywords,
  noIndex = false,
  type = "website",
  publishedTime,
  modifiedTime,
  section,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
}): Metadata {
  const canonical = absoluteUrl(path);
  const ogImage = image ?? absoluteUrl(siteConfig.ogImage);
  const fullTitle =
    title === siteConfig.name ? title : `${title} | ${siteConfig.name}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords ? [...keywords] : [...siteConfig.keywords],
    authors: [...siteConfig.authors],
    creator: siteConfig.creator,
    publisher: siteConfig.publisher,
    alternates: {
      canonical,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type,
      locale: siteConfig.locale,
      url: canonical,
      title: fullTitle,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(type === "article" && {
        publishedTime,
        modifiedTime,
        authors: [siteConfig.url],
        section,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
      creator: siteConfig.twitter,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  JSON-LD structured data                                                   */
/* -------------------------------------------------------------------------- */

/** Organization / WebSite schema used on every page (in root layout). */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl("/logo.png"),
    description: siteConfig.description,
    email: siteConfig.email,
    sameAs: [
      "https://twitter.com/kinetika",
      "https://www.youtube.com/@kinetika",
      "https://www.linkedin.com/company/kinetika",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/courses?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** FAQPage schema — mirrors the homepage FAQ section. */
export function faqJsonLd(
  faqs: { q: string; a: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

/** Course schema for an individual course page. */
export function courseJsonLd(course: {
  title: string;
  description: string;
  slug: string;
  price: number;
  coverImageUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    url: absoluteUrl(`/courses/${course.slug}`),
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    offers: {
      "@type": "Offer",
      price: course.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/courses/${course.slug}`),
    },
    ...(course.coverImageUrl && {
      image: course.coverImageUrl,
    }),
  };
}

/** ItemList schema for the course catalog page. */
export function itemListJsonLd(
  items: { title: string; slug: string; description: string; price: number }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Course",
        name: item.title,
        description: item.description,
        url: absoluteUrl(`/courses/${item.slug}`),
        provider: {
          "@type": "Organization",
          name: siteConfig.name,
          url: siteConfig.url,
        },
        offers: {
          "@type": "Offer",
          price: item.price,
          priceCurrency: "INR",
          url: absoluteUrl(`/courses/${item.slug}`),
        },
      },
    })),
  };
}

/** BreadcrumbList schema. */
export function breadcrumbJsonLd(
  crumbs: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}