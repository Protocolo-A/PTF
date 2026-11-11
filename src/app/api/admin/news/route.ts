import { randomUUID } from "node:crypto";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { createStoredNews, deleteStoredNews, listStoredNews, updateStoredNews } from "@/lib/data-store";
import { safeMediaUrl, safeVideoUrl, slugify, type NewsArticleInput, type NewsBlock } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateNews(input: Record<string, unknown>): NewsArticleInput | null {
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 180) : "";
  const excerpt = typeof input.excerpt === "string" ? input.excerpt.trim().slice(0, 600) : "";
  const slug = slugify(typeof input.slug === "string" && input.slug.trim() ? input.slug : title);
  const coverImage = typeof input.coverImage === "string" ? input.coverImage : "";
  const status = input.status === "published" ? "published" : input.status === "draft" ? "draft" : null;
  if (title.length < 3 || !status || (coverImage && !safeMediaUrl(coverImage))) return null;
  if (!Array.isArray(input.blocks) || input.blocks.length > 40) return null;
  const blocks: NewsBlock[] = [];
  for (const raw of input.blocks) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const block = raw as Record<string, unknown>;
    const id = typeof block.id === "string" && /^[\w-]{1,80}$/.test(block.id) ? block.id : randomUUID();
    if (block.type === "heading" || block.type === "paragraph" || block.type === "quote") {
      const text = typeof block.text === "string" ? block.text.trim().slice(0, 12000) : "";
      if (!text) return null;
      if (block.type === "quote") blocks.push({ id, type: "quote", text, attribution: typeof block.attribution === "string" ? block.attribution.slice(0, 160) : "" });
      else blocks.push({ id, type: block.type, text });
    } else if (block.type === "image") {
      const url = typeof block.url === "string" ? block.url : "";
      if (!safeMediaUrl(url)) return null;
      blocks.push({ id, type: "image", url, alt: typeof block.alt === "string" ? block.alt.slice(0, 180) : "Imagen del artículo", caption: typeof block.caption === "string" ? block.caption.slice(0, 240) : "" });
    } else if (block.type === "gallery") {
      if (!Array.isArray(block.images) || block.images.length < 1 || block.images.length > 12) return null;
      const images = block.images.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const image = item as Record<string, unknown>;
        const url = typeof image.url === "string" ? image.url : "";
        if (!safeMediaUrl(url)) return null;
        return { url, alt: typeof image.alt === "string" ? image.alt.slice(0, 180) : "Imagen de galería", caption: typeof image.caption === "string" ? image.caption.slice(0, 240) : "" };
      });
      if (images.some((image) => image === null)) return null;
      blocks.push({ id, type: "gallery", images: images as Array<{ url: string; alt?: string; caption?: string }> });
    } else if (block.type === "video") {
      const url = typeof block.url === "string" ? block.url : "";
      if (!safeVideoUrl(url)) return null;
      blocks.push({ id, type: "video", url, caption: typeof block.caption === "string" ? block.caption.slice(0, 240) : "" });
    } else return null;
  }
  return { slug, title, excerpt, coverImage, blocks, status };
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  try { return Response.json(await listStoredNews(), { headers: noStore }); }
  catch (error) {
    console.error("[admin/news] Error al listar noticias:", error);
    return Response.json({ error: "No se pudieron cargar las noticias. Comprueba que db:setup se haya ejecutado." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Datos no válidos." }, { status: 400, headers: noStore });
    const input = validateNews(body as Record<string, unknown>);
    if (!input) return Response.json({ error: "Revisa el título, estado, imágenes y bloques del artículo." }, { status: 400, headers: noStore });
    const article = await createStoredNews(input);
    return Response.json(article, { status: 201, headers: noStore });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return Response.json({ error: "Ya existe una noticia con ese enlace. Cambia el slug." }, { status: 409, headers: noStore });
    console.error("[admin/news] Error al crear noticia:", error);
    return Response.json({ error: "No se pudo crear la noticia." }, { status: 500, headers: noStore });
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Datos no válidos." }, { status: 400, headers: noStore });
    const record = body as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const input = validateNews(record);
    if (!uuidPattern.test(id) || !input) return Response.json({ error: "Datos de noticia no válidos." }, { status: 400, headers: noStore });
    const article = await updateStoredNews(id, input);
    if (!article) return Response.json({ error: "La noticia ya no existe." }, { status: 404, headers: noStore });
    return Response.json(article, { headers: noStore });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return Response.json({ error: "Ya existe una noticia con ese enlace. Cambia el slug." }, { status: 409, headers: noStore });
    console.error("[admin/news] Error al actualizar noticia:", error);
    return Response.json({ error: "No se pudo actualizar la noticia." }, { status: 500, headers: noStore });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  try {
    const body: unknown = await request.json();
    const id = body && typeof body === "object" && !Array.isArray(body) && "id" in body && typeof body.id === "string" ? body.id : "";
    if (!uuidPattern.test(id)) return Response.json({ error: "Identificador no válido." }, { status: 400, headers: noStore });
    await deleteStoredNews(id);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("[admin/news] Error al eliminar noticia:", error);
    return Response.json({ error: "No se pudo eliminar la noticia." }, { status: 500, headers: noStore });
  }
}
