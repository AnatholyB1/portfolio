import type { Metadata } from "next";

// Social-card image shared by every public page. A page-level `openGraph` or
// `twitter` object REPLACES the root layout's one (Next merges shallowly), so each
// page must repeat the image: this helper keeps that in a single place.
export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Sèvalys — Agence digitale · Sites, outils sur mesure & IA",
};

type PageSeoInput = {
  /** Title WITHOUT the brand: the root layout template appends " · Sèvalys". */
  title: string;
  description: string;
  /** Absolute path of the page, e.g. "/services". Becomes its own canonical. */
  path: string;
  /** Title shown on social cards (defaults to `title`, brand appended). */
  socialTitle?: string;
};

export function buildPageSeo({
  title,
  description,
  path,
  socialTitle,
}: PageSeoInput): Pick<
  Metadata,
  "title" | "description" | "alternates" | "openGraph" | "twitter"
> {
  const cardTitle = socialTitle ?? `${title} · Sèvalys`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: cardTitle,
      description,
      type: "website",
      locale: "fr_FR",
      siteName: "Sèvalys",
      url: path,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: cardTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
