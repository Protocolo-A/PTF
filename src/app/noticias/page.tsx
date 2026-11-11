import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, BookOpen, CalendarDays, Newspaper } from "lucide-react";
import { listPublishedNews } from "@/lib/data-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Noticias y notas · Portafolio", description: "Artículos, ideas, novedades y recursos compartidos desde el portafolio." };

export default async function NewsPage() {
  const articles = await listPublishedNews();
  return <main className="news-public-page">
    <header className="news-public-header">
      <Link href="/" className="news-back-link">← Volver al portafolio</Link>
      <span className="eyebrow"><Newspaper size={14} /> NOTAS Y ACTUALIDAD</span>
      <h1>Noticias e ideas</h1>
      <p>Información, recursos y cosas interesantes para leer y explorar.</p>
    </header>
    {articles.length === 0 ? <div className="news-public-empty"><BookOpen size={34} /><h2>Pronto habrá novedades.</h2><p>Estamos preparando artículos y recursos para compartir.</p></div> : <div className="news-public-grid">
      {articles.map((article) => <article className="news-public-card" key={article.id}>
        <Link href={`/noticias/${article.slug}`} className="news-public-card-image">
          {article.coverImage ? <img src={article.coverImage} alt="" /> : <span><Newspaper size={30} /></span>}
        </Link>
        <div className="news-public-card-body">
          <time><CalendarDays size={13} />{new Date(article.publishedAt ?? article.updatedAt).toLocaleDateString("es-SV", { dateStyle: "medium" })}</time>
          <h2><Link href={`/noticias/${article.slug}`}>{article.title}</Link></h2>
          <p>{article.excerpt || "Lee el artículo completo."}</p>
          <Link className="news-read-link" href={`/noticias/${article.slug}`}>Leer artículo <ArrowUpRight size={15} /></Link>
        </div>
      </article>)}
    </div>}
  </main>;
}
