import { getStoredMedia } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const asset = await getStoredMedia(id);
  if (!asset) return new Response("Not found", { status: 404 });
  const bytes = Buffer.from(asset.data, "base64");
  const headers = new Headers({
    "Content-Type": asset.contentType,
    "Content-Length": String(bytes.length),
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (new URL(request.url).searchParams.get("download") === "1") {
    const safeName = asset.name.replace(/[\u0000-\u001f\u007f/\\";]/g, "_").slice(0, 150) || "imagen";
    const asciiName = safeName.normalize("NFKD").replace(/[^\x20-\x7E]/g, "_");
    headers.set("Content-Disposition", `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`);
  }
  return new Response(bytes, { headers });
}
