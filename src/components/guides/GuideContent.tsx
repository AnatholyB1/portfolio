// Rendu serveur d'un guide : aucun JS requis pour lire le contenu (tout est dans le HTML initial).
import type { ReactNode } from "react";
import Link from "next/link";
import {
  type Guide,
  type GuideBlock,
  formatGuideDate,
  guideReadingMinutes,
} from "@/data/guides";

const NBSP = " ";

/** Espace insécable avant « : ; ? ! € » » et après « « » (typographie française). */
function nb(text: string): string {
  return text.replace(/\s+([:;?!€»])/g, `${NBSP}$1`).replace(/«\s+/g, `«${NBSP}`);
}

const INLINE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

/** Rend [ancre](href) en lien et **gras** en <strong>. */
export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(nb(text.slice(last, at)));
    if (m[3] !== undefined) {
      out.push(<strong key={key++}>{nb(m[3])}</strong>);
    } else {
      const label = nb(m[1]);
      const href = m[2];
      out.push(
        /^https?:/.test(href) ? (
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ) : (
          <Link key={key++} href={href}>
            {label}
          </Link>
        ),
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(nb(text.slice(last)));
  return out;
}

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "p":
      return <p>{renderInline(block.text)}</p>;
    case "ul":
      return (
        <ul>
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol>
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="gd-table-wrap" role="region" aria-label={block.caption} tabIndex={0}>
          <table>
            <caption>{block.caption}</caption>
            <thead>
              <tr>
                {block.headers.map((h) => (
                  <th key={h} scope="col">{nb(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) =>
                    j === 0 ? (
                      <th key={j} scope="row">{renderInline(cell)}</th>
                    ) : (
                      <td key={j}>{renderInline(cell)}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {block.note ? <p className="gd-table-note">{nb(block.note)}</p> : null}
        </div>
      );
    case "callout":
      return (
        <aside className="gd-callout">
          <p className="gd-callout-title">{nb(block.title)}</p>
          {block.paragraphs.map((p, i) => (
            <p key={i}>{renderInline(p)}</p>
          ))}
        </aside>
      );
  }
}

function Blocks({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </>
  );
}

export function GuideMeta({ guide }: { guide: Guide }) {
  return (
    <p className="gd-meta">
      <span>Publié le <time dateTime={guide.datePublished}>{formatGuideDate(guide.datePublished)}</time></span>
      <span>Mis à jour le <time dateTime={guide.dateModified}>{formatGuideDate(guide.dateModified)}</time></span>
      <span>Par {guide.authorName}, Sèvalys, Tours</span>
      <span>{guideReadingMinutes(guide)} min de lecture</span>
    </p>
  );
}

export default function GuideContent({ guide }: { guide: Guide }) {
  const toc = [
    ...guide.sections.map((s) => ({ id: s.id, title: s.title })),
    { id: "faq", title: "Questions fréquentes" },
    ...(guide.sources.length > 0 ? [{ id: "sources", title: "Sources" }] : []),
  ];

  return (
    <>
      <header className="gd-hero">
        <div className="wrap">
          <nav aria-label="Fil d'Ariane" className="gd-crumbs">
            <ol>
              <li><Link href="/">Accueil</Link></li>
              <li><Link href="/guides">Guides</Link></li>
              <li aria-current="page">{guide.crumb}</li>
            </ol>
          </nav>
          <h1 className="gd-h1">{nb(guide.h1)}</h1>
          <GuideMeta guide={guide} />
          <div className="gd-answer">
            <span className="label">La réponse courte</span>
            <p>{nb(guide.answer)}</p>
          </div>
        </div>
      </header>

      <div className="wrap gd-layout">
        <aside className="gd-aside">
          <nav aria-label="Sommaire" className="gd-toc">
            <span className="label">Sommaire</span>
            <ol>
              {toc.map((t) => {
                const anchor = "#" + t.id;
                return (
                  <li key={t.id}>
                    <a href={anchor}>{nb(t.title)}</a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        <article className="gd-article">
          {guide.intro.map((p, i) => (
            <p key={i} className="gd-lead">{renderInline(p)}</p>
          ))}

          {guide.sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id}>
              <h2 id={s.id}>{nb(s.title)}</h2>
              <Blocks blocks={s.blocks} />
              {s.subsections?.map((sub) => (
                <div key={sub.id} className="gd-sub">
                  <h3 id={sub.id}>{nb(sub.title)}</h3>
                  <Blocks blocks={sub.blocks} />
                </div>
              ))}
            </section>
          ))}

          <section aria-labelledby="faq">
            <h2 id="faq">Questions fréquentes</h2>
            <div className="gd-faq">
              {guide.faq.map((f) => (
                <div key={f.q} className="gd-faq-item">
                  <h3>{nb(f.q)}</h3>
                  <p>{nb(f.a)}</p>
                </div>
              ))}
            </div>
          </section>

          {guide.sources.length > 0 && (
            <section aria-labelledby="sources">
              <h2 id="sources">Sources</h2>
              <p>Fourchettes relevées sur ces pages publiques. Les prix peuvent avoir changé depuis.</p>
              <ul className="gd-sources">
                {guide.sources.map((src) => (
                  <li key={src.href}>
                    <a href={src.href} target="_blank" rel="noopener noreferrer">{src.label}</a>
                    {" "}<span className="gd-src-date">(relevé en {src.retrieved})</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <aside className="gd-author" aria-label="À propos de l'auteur">
            <p className="gd-author-name">{guide.authorName}</p>
            <p className="gd-author-role">{guide.authorRole}</p>
            <p>{renderInline(guide.authorBio)}</p>
          </aside>
        </article>
      </div>

      <section className="gd-cta" aria-labelledby="gd-cta-title">
        <div className="wrap">
          <h2 id="gd-cta-title">{nb(guide.cta.title)}</h2>
          <p>{nb(guide.cta.text)}</p>
          <div className="gd-cta-actions">
            <Link href={guide.cta.primary.href} className="btn btn-primary">{guide.cta.primary.label}</Link>
            <Link href={guide.cta.secondary.href} className="btn btn-ghost">{guide.cta.secondary.label}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
