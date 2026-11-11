import { createStoredMedia } from "@/lib/data-store";
import { isAdmin, sameOrigin } from "@/lib/auth";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Selecciona una imagen." }, { status: 400 });
    if (file.size === 0 || file.size > 5 * 1024 * 1024) return Response.json({ error: "La imagen debe pesar menos de 5 MB." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isWebp = buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    const gifSignature = buffer.toString("ascii", 0, 6);
    const isGif = gifSignature === "GIF87a" || gifSignature === "GIF89a";
    const contentType = isJpg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : isGif ? "image/gif" : "";
    if (!contentType) return Response.json({ error: "Formato no válido. Usa JPG, PNG, WebP o GIF animado." }, { status: 400 });
    const asset = await createStoredMedia({ name: file.name.slice(0, 180), contentType, data: buffer.toString("base64") });
    return Response.json({ url: `/api/media/${asset.id}` }, { status: 201 });
  } catch { return Response.json({ error: "No se pudo subir la imagen." }, { status: 500 }); }
}
