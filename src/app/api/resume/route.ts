import { getResume, saveResume } from "@/lib/cv-store";
import { normalizeResume, validateResume } from "@/lib/resume";
import { isAdmin, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await getResume()); }
  catch { return Response.json({ error: "No se ha podido cargar el CV." }, { status: 500 }); }
}
export async function PUT(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401 });
  try {
    const text = await request.text();
    if (text.length > 500000) return Response.json({ error: "El contenido es demasiado grande." }, { status: 413 });
    const data: unknown = JSON.parse(text);
    if (!validateResume(data)) return Response.json({ error: "Revisa los datos: nombre, cargo y email son obligatorios. Los enlaces deben empezar por https:// y las habilidades estar entre 0 y 100." }, { status: 400 });
    await saveResume(normalizeResume(data));
    return Response.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch { return Response.json({ error: "No se pudieron guardar los cambios. Inténtalo de nuevo." }, { status: 500 }); }
}
