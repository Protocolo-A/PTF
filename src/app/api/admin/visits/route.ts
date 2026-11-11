import { isAdmin, sameOrigin } from "@/lib/auth";
import { clearStoredVisits, listStoredVisits } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  try {
    return Response.json(await listStoredVisits(), { headers: noStore });
  } catch (error) {
    console.error("[admin/visits] No se pudieron consultar las visitas:", error);
    return Response.json({ error: "No se pudieron cargar las visitas." }, { status: 500, headers: noStore });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  try {
    await clearStoredVisits();
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("[admin/visits] No se pudo limpiar el historial:", error);
    return Response.json({ error: "No se pudo limpiar el registro de dispositivos." }, { status: 500, headers: noStore });
  }
}
