import type { Metadata } from "next";
import Link from "next/link";
import { buildPageSeo } from "@/lib/pageSeo";
import { guides, formatGuideDate, guideReadingMinutes } from "@/data/guides";
import { buildBreadcrumbJsonLd } from "@/lib/guideJsonLd";
import { buildJsonLdScript } from "@/lib/serviceJsonLd";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  ...buildPageSeo({
    title: "Guides : prix d'un site vitrine et SEO local",
    description:
      "Deux guides pratiques pour les indépendants et petites entreprises : le prix d'un site vitrine en 2026 et le référencement local, étape par étape.",
    path: "/guides",
  }),
  robots: { index: true, follow: true },
};

export default function GuidesIndexPage() {
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Accueil", path: "/" },
    { name: "Guides", path: "/guides" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildJsonLdScript(breadcrumb) }}
      />
      <Navbar />
      <main id="main-content">
        <header className="gd-hero">
          <div className="wrap">
            <nav aria-label="Fil d'Ariane" className="gd-crumbs">
              <ol>
                <li><Link href="/">Accueil</Link></li>
                <li aria-current="page">Guides</li>
              </ol>
            </nav>
            <h1 className="gd-h1">Guides pour votre site et votre visibilité locale</h1>
            <p className="gd-lead gd-index-lead">
              Des repères clairs, sourcés et datés, écrits par Anatholy Bricon, pour décider sans jargon.
            </p>
          </div>
        </header>

        <div className="wrap gd-index">
          <ul className="gd-index-list">
            {guides.map((g) => {
              const path = `/guides/${g.slug}`;
              return (
                <li key={g.slug}>
                  <p className="label">
                    Mis à jour le {formatGuideDate(g.dateModified)} · {guideReadingMinutes(g)} min de lecture
                  </p>
                  <h2>
                    <Link href={path}>{g.h1}</Link>
                  </h2>
                  <p>{g.listSummary}</p>
                  <Link href={path} className="gd-index-more">
                    Lire le guide
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
