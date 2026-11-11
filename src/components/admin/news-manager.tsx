"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, FileText, ImagePlus, Images, LoaderCircle, Plus, Save, Send, Trash2, Video, Quote, Heading, Type } from "lucide-react";
import { ImageUpload, Field, SelectField } from "@/components/admin/fields";
import { createClientUuid } from "@/lib/client-id";
import { slugify, type NewsArticleInput, type NewsBlock, type NewsStatus } from "@/lib/news";

type NewsArticle = NewsArticleInput & { id: string; createdAt: string; updatedAt: string; publishedAt: string | null };
type BlockKind = NewsBlock["type"];

function emptyArticle(): NewsArticleInput {
  return { slug: "", title: "", excerpt: "", coverImage: "", blocks: [], status: "draft" };
}

function newBlock(type: BlockKind): NewsBlock {
  const id = createClientUuid();
  if (type === "image") return { id, type, url: "", alt: "", caption: "" };
  if (type === "gallery") return { id, type, images: [] };
  if (type === "video") return { id, type, url: "", caption: "" };
  if (type === "quote") return { id, type, text: "", attribution: "" };
  return { id, type, text: "" };
}

export default function NewsManager() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<NewsArticleInput>(emptyArticle());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/news", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) throw new Error(result?.error || "No se pudieron cargar las noticias.");
      setArticles(result as NewsArticle[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error al cargar noticias."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function startNew() { setSelectedId(""); setForm(emptyArticle()); setNotice(""); setError(""); }
  function edit(article: NewsArticle) {
    setSelectedId(article.id);
    setForm({ slug: article.slug, title: article.title, excerpt: article.excerpt, coverImage: article.coverImage, blocks: structuredClone(article.blocks), status: article.status });
    setNotice(""); setError("");
  }
  function updateBlock(index: number, patch: Record<string, unknown>) {
    setForm((current) => ({ ...current, blocks: current.blocks.map((block, blockIndex) => blockIndex === index ? ({ ...block, ...patch } as NewsBlock) : block) }));
  }
  function addBlock(type: BlockKind) { setForm((current) => ({ ...current, blocks: [...current.blocks, newBlock(type)] })); }
  function removeBlock(index: number) { setForm((current) => ({ ...current, blocks: current.blocks.filter((_, itemIndex) => itemIndex !== index) })); }

  async function save(status: NewsStatus) {
    if (saving) return;
    const title = form.title.trim();
    if (title.length < 3) { setError("Escribe un título de al menos 3 caracteres."); return; }
    if (form.coverImage && !form.coverImage.startsWith("/api/media/") && !form.coverImage.startsWith("https://")) { setError("La portada debe ser una imagen subida o una URL HTTPS."); return; }
    const payload: NewsArticleInput = { ...form, title, slug: slugify(form.slug || title), status };
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/news", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedId ? { ...payload, id: selectedId } : payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la noticia.");
      const article = result as NewsArticle;
      setSelectedId(article.id);
      setForm({ slug: article.slug, title: article.title, excerpt: article.excerpt, coverImage: article.coverImage, blocks: article.blocks, status: article.status });
      await load();
      setNotice(status === "published" ? "Noticia publicada en el sitio." : "Borrador guardado correctamente.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la noticia."); }
    finally { setSaving(false); }
  }

  async function remove(article: NewsArticle) {
    if (!window.confirm(`¿Eliminar la noticia “${article.title}”? Esta acción no se puede deshacer.`)) return;
    try {
      const response = await fetch("/api/admin/news", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: article.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo eliminar.");
      if (selectedId === article.id) startNew();
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar la noticia."); }
  }

  return <div className="news-admin-layout">
    <section className="news-admin-list">
      <div className="news-admin-list-head"><div><strong>Tu espacio de noticias</strong><small>{articles.length} artículos · {articles.filter((a) => a.status === "published").length} publicados</small></div><button className="button button-primary" type="button" onClick={startNew}><Plus size={14} />Nueva noticia</button></div>
      {loading ? <div className="admin-empty"><LoaderCircle className="spin" size={23} />Cargando noticias…</div> : articles.length === 0 ? <div className="news-admin-empty"><BookOpen size={27} /><strong>Aún no has publicado noticias</strong><span>Crea artículos para compartir información, ideas, novedades o recursos con quienes visiten tu portafolio.</span></div> : articles.map((article) => <article className={`news-admin-item ${selectedId === article.id ? "selected" : ""}`} key={article.id}>
        <button type="button" onClick={() => edit(article)} className="news-admin-item-main">
          {article.coverImage ? <img src={article.coverImage} alt="" /> : <span className="news-admin-item-placeholder"><FileText size={20} /></span>}
          <span><strong>{article.title}</strong><small>{article.status === "published" ? "Publicado" : "Borrador"} · {new Date(article.updatedAt).toLocaleDateString("es-SV")}</small></span>
        </button>
        <button type="button" className="news-admin-item-delete" onClick={() => void remove(article)} aria-label={`Eliminar ${article.title}`}><Trash2 size={14} /></button>
      </article>)}
    </section>

    <section className="news-admin-editor">
      <div className="news-admin-editor-heading"><div><span className="eyebrow">EDITOR DE CONTENIDO</span><h2>{selectedId ? "Editar noticia" : "Crear una noticia"}</h2><p>Combina texto, fotos, galerías y vídeos. Guarda como borrador o publica para los visitantes.</p></div>{selectedId && <a href={`/noticias/${form.slug}`} target="_blank" rel="noreferrer" className="button button-outline">Ver artículo ↗</a>}</div>
      <div className="news-admin-fields">
        <Field label="Título del artículo *" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value, slug: current.slug ? current.slug : slugify(value) }))} placeholder="Ej. Qué hay de nuevo en desarrollo web" />
        <Field label="Enlace / slug" value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: slugify(value) }))} hint="Se utiliza en /noticias/tu-enlace." />
        <Field label="Resumen para la portada de noticias" value={form.excerpt} onChange={(value) => setForm((current) => ({ ...current, excerpt: value }))} multiline rows={3} wide hint="Máximo 600 caracteres." />
        <div className="news-admin-cover"><ImageUpload label="Imagen principal" value={form.coverImage} onChange={(value) => setForm((current) => ({ ...current, coverImage: value }))} hint="JPG, PNG, WebP o GIF de hasta 5 MB. La imagen puede ser animada." /></div>
      </div>

      <div className="news-blocks-heading"><div><h3>Contenido del artículo</h3><p>Agrega bloques en el orden en que quieres que aparezcan.</p></div><div className="news-block-add">
        <button type="button" onClick={() => addBlock("heading")}><Heading size={13} />Título</button>
        <button type="button" onClick={() => addBlock("paragraph")}><Type size={13} />Texto</button>
        <button type="button" onClick={() => addBlock("image")}><ImagePlus size={13} />Imagen</button>
        <button type="button" onClick={() => addBlock("gallery")}><Images size={13} />Galería</button>
        <button type="button" onClick={() => addBlock("video")}><Video size={13} />Vídeo</button>
        <button type="button" onClick={() => addBlock("quote")}><Quote size={13} />Cita</button>
      </div></div>

      {form.blocks.length === 0 ? <div className="news-blocks-empty">Empieza agregando un bloque de texto, imagen, galería o vídeo.</div> : <div className="news-block-list">
        {form.blocks.map((block, index) => <article className="news-block-editor" key={block.id}>
          <div className="news-block-editor-head"><strong>{index + 1}. {block.type === "heading" ? "Título" : block.type === "paragraph" ? "Texto" : block.type === "image" ? "Imagen" : block.type === "gallery" ? "Galería" : block.type === "video" ? "Vídeo" : "Cita"}</strong><button type="button" onClick={() => removeBlock(index)} aria-label="Eliminar bloque"><Trash2 size={14} />Eliminar</button></div>
          {block.type === "heading" && <Field label="Subtítulo" value={block.text} onChange={(value) => updateBlock(index, { text: value })} />}
          {block.type === "paragraph" && <Field label="Párrafo" value={block.text} multiline rows={5} onChange={(value) => updateBlock(index, { text: value })} />}
          {block.type === "quote" && <><Field label="Cita" value={block.text} multiline rows={3} onChange={(value) => updateBlock(index, { text: value })} /><Field label="Autor o atribución (opcional)" value={block.attribution || ""} onChange={(value) => updateBlock(index, { attribution: value })} /></>}
          {block.type === "image" && <><ImageUpload label="Archivo de imagen" value={block.url} onChange={(url) => updateBlock(index, { url })} hint="Admite JPG, PNG, WebP y GIF animado." /><Field label="Texto alternativo" value={block.alt} onChange={(value) => updateBlock(index, { alt: value })} /><Field label="Pie de imagen" value={block.caption || ""} onChange={(value) => updateBlock(index, { caption: value })} /></>}
          {block.type === "gallery" && <div className="news-gallery-editor">{block.images.map((image, imageIndex) => <div className="news-gallery-item" key={`${block.id}-${imageIndex}`}><ImageUpload label={`Imagen ${imageIndex + 1}`} value={image.url} onChange={(url) => updateBlock(index, { images: block.images.map((item, i) => i === imageIndex ? { ...item, url } : item) })} /><Field label="Pie (opcional)" value={image.caption || ""} onChange={(caption) => updateBlock(index, { images: block.images.map((item, i) => i === imageIndex ? { ...item, caption } : item) })} /><button type="button" className="news-gallery-remove" onClick={() => updateBlock(index, { images: block.images.filter((_, i) => i !== imageIndex) })}>Quitar imagen</button></div>)}<button type="button" className="button button-outline" onClick={() => updateBlock(index, { images: [...block.images, { url: "", alt: "", caption: "" }] })} disabled={block.images.length >= 12}><Plus size={13} />Añadir imagen a galería</button></div>}
          {block.type === "video" && <><Field label="Enlace de YouTube o Vimeo" value={block.url} onChange={(value) => updateBlock(index, { url: value })} placeholder="https://www.youtube.com/watch?v=..." hint="Por seguridad, el reproductor admite YouTube y Vimeo mediante HTTPS." /><Field label="Pie del vídeo (opcional)" value={block.caption || ""} onChange={(value) => updateBlock(index, { caption: value })} /></>}
        </article>)}
      </div>}

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="news-admin-notice" role="status">{notice}</p>}
      <div className="news-admin-actions"><span>{form.status === "published" ? "Estado actual: publicado" : "Estado actual: borrador"}</span><button className="button button-outline" type="button" disabled={saving} onClick={() => void save("draft")}><Save size={14} />Guardar borrador</button><button className="button button-primary" type="button" disabled={saving} onClick={() => void save("published")}>{saving ? <LoaderCircle size={14} className="spin" /> : <Send size={14} />}Publicar noticia</button></div>
    </section>
  </div>;
}
