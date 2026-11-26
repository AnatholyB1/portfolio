import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { services, getServiceBySlug } from "@/data/services";
import { translations } from "@/lib/translations";
import { buildPageSeo } from "@/lib/pageSeo";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildJsonLdScript,
  buildServiceJsonLd,
} from "@/lib/serviceJsonLd";

// Per-slug metadata + FAQPage JSON-LD for /services/[slug] (Phase 6).
// This is a Server Component: generateMetadata and generateStaticParams are
// Server-Component-only exports in Next.js, and the JSON-LD <script> must be
// in the server-rendered HTML for crawlers. page.tsx stays 'use client' for
// useReveals() and reads copy from the language context, resolved only
// post-hydration — so the server-rendered/crawled version of every page is
// always the hardcoded French source below (the i18n system is client-only,
// post-hydration; see src/app/layout.tsx's precedent of hardcoding its
// global FAQPage JSON-LD).

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

// dynamicParams stays at its default (true): Next.js 16's automatic 404 for
// `dynamicParams = false` does not route to this segment's own not-found.tsx
// (falls back to the generic Next.js 404 instead — a known upstream bug,
// vercel/next.js#84738 / #87738). The explicit `notFound()` call below
// already 404s any slug outside the fixed 9 and correctly renders this
// segment's not-found.tsx, so dynamicParams=false brings no benefit here —
// only the framework's broken shortcut.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const svc = getServiceBySlug(slug);
  if (!svc) return {};
  const copy = translations.fr.services.pages.items[svc.index];

  return {
    ...buildPageSeo({
      title: copy.metaTitle,
      description: copy.metaDescription,
      path: `/services/${slug}`,
    }),
    robots: { index: true, follow: true },
  };
}

export default async function ServiceSlugLayout({ params, children }: Props) {
  const { slug } = await params;
  const svc = getServiceBySlug(slug);
  if (!svc) notFound();
  const copy = translations.fr.services.pages.items[svc.index];

  const pageUrl = `${SITE_URL}/services/${slug}`;
  const labels = translations.fr.services.pages.extra;
  // FAQPage = exactement la FAQ visible (même source `copy.faq`).
  const jsonLd = [
    buildServiceJsonLd(
      {
        name: copy.name,
        description: copy.metaDescription,
        areas: copy.areas,
        pricing: copy.pricing ? { price: copy.pricing.price } : null,
      },
      slug,
      SITE_URL
    ),
    buildFaqJsonLd(copy.faq, pageUrl),
    buildBreadcrumbJsonLd(
      [
        { name: labels.breadcrumbHome, path: "/" },
        { name: labels.breadcrumbServices, path: "/services" },
        { name: copy.name, path: `/services/${slug}` },
      ],
      SITE_URL
    ),
  ];

  return (
    <>
      {jsonLd.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildJsonLdScript(node) }}
        />
      ))}
      {children}
    </>
  );
}
