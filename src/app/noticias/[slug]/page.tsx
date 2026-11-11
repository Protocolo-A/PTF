import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Quote } from "lucide-react";
import { getPublishedNewsBySlug } from "@/lib/data-store";
import { safeVideoUrl } from "@/lib/news";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedNewsBySlug(slug);
  if (!article) return { title: "Noticia no encontrada" };
  return { title: `${article.title} · Noticias`, description: article.excerpt };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedNewsBySlug(slug);
  if (!article) notFound();
  return <main className="news-article-page">
    <Link href="/noticias" className="news-back-link"><ArrowLeft size={15} /> Todas las noticias</Link>
    <article>
      <header className="news-article-header">
        <span className="eyebrow">ARTÍCULO</span>
        <h1>{article.title}</h1>
        {article.excerpt && <p>{article.excerpt}</p>}
        <time><CalendarDays size={14} />{new Date(article.publishedAt ?? article.updatedAt).toLocaleDateString("es-SV", { dateStyle: "long" })}</time>
        {article.coverImage && <img className="news-article-cover" src={article.coverImage} alt={article.title} />}
      </header>
      <div className="news-article-content">
        {article.blocks.map((block) => {
          if (block.type === "heading") return <h2 key={block.id}>{block.text}</h2>;
          if (block.type === "paragraph") return <p key={block.id}>{block.text}</p>;
          if (block.type === "quote") return <blockquote key={block.id}><Quote size={19} /><p>{block.text}</p>{block.attribution && <cite>{block.attribution}</cite>}</blockquote>;
          if (block.type === "image") return <figure key={block.id}><img src={block.url} alt={block.alt} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
          if (block.type === "gallery") return <div className="news-article-gallery" key={block.id}>{block.images.map((image, index) => <figure key={`${block.id}-${index}`}><img src={image.url} alt={image.alt || "Imagen del artículo"} />{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div>;
          if (block.type === "video") {
            const embed = safeVideoUrl(block.url);
            return embed ? <figure className="news-article-video" key={block.id}><iframe src={embed} title={block.caption || article.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />{block.caption && <figcaption>{block.caption}</figcaption>}</figure> : null;
          }
          return null;
        })}
      </div>
    </article>
    <footer className="news-article-footer"><Link href="/noticias"><ArrowLeft size={15} /> Volver a noticias</Link><Link href="/">Visitar el portafolio</Link></footer>
  </main>;
}
