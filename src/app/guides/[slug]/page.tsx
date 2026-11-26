// Server Component : metadata, JSON-LD et contenu sont dans le HTML initial (crawlers, IA).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPageSeo } from "@/lib/pageSeo";
import { guides, getGuideBySlug } from "@/data/guides";
import {
  buildArticleJsonLd,
  buildGuideBreadcrumbJsonLd,
  buildGuideFaqJsonLd,
} from "@/lib/guideJsonLd";
import { buildJsonLdScript } from "@/lib/serviceJsonLd";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GuideContent from "@/components/guides/GuideContent";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};
  const seo = buildPageSeo({
    title: guide.metaTitle,
    description: guide.metaDescription,
    path: `/guides/${guide.slug}`,
  });
  return {
    ...seo,
    authors: [{ name: guide.authorName }],
    robots: { index: true, follow: true },
    openGraph: {
      ...seo.openGraph,
      type: "article",
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
      authors: [guide.authorName],
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const jsonLd = [
    buildArticleJsonLd(guide),
    buildGuideFaqJsonLd(guide),
    buildGuideBreadcrumbJsonLd(guide),
  ];

  return (
    <>
      {jsonLd.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildJsonLdScript(data) }}
        />
      ))}
      <Navbar />
      <main id="main-content">
        <GuideContent guide={guide} />
      </main>
      <Footer />
    </>
  );
}
