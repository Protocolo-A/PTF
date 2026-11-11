import { listPublishedNews } from "@/lib/data-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const articles = await listPublishedNews();
    return Response.json(articles, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (error) {
    console.error("[news] No se pudieron cargar las noticias:", error);
    return Response.json({ error: "Noticias no disponibles." }, { status: 500 });
  }
}
