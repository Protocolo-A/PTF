import { getStoredVisitorChat, sendStoredVisitorChatMessage } from "@/lib/data-store";
import { sameOrigin } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { resolveApproximateLocation, identifyDevice } from "@/lib/device";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[4-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!tokenPattern.test(token)) return Response.json({ error: "Sesión de chat no válida." }, { status: 400, headers: noStore });
  try {
    const result = await getStoredVisitorChat(token);
    return Response.json(result, { headers: noStore });
  } catch (error) {
    console.error("[chat] No se pudo cargar la conversación:", error);
    return Response.json({ error: "No se pudo cargar el chat. Inténtalo de nuevo." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no válida." }, { status: 403, headers: noStore });
  if (!rateLimit(`chat:${clientKey(request)}`, 35, 60 * 60 * 1000)) {
    return Response.json({ error: "Has enviado muchos mensajes. Inténtalo más tarde." }, { status: 429, headers: noStore });
  }
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Datos no válidos." }, { status: 400, headers: noStore });
    const input = body as Record<string, unknown>;
    const token = typeof input.visitorToken === "string" ? input.visitorToken : "";
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const message = typeof input.message === "string" ? input.message.trim() : "";
    if (!tokenPattern.test(token) || name.length < 2 || name.length > 120 || email.length > 250 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 1 || message.length > 3000) {
      return Response.json({ error: "Escribe tu nombre, un correo válido y un mensaje de hasta 3000 caracteres." }, { status: 400, headers: noStore });
    }
    const device = identifyDevice(request.headers.get("user-agent"), {
      platform: request.headers.get("sec-ch-ua-platform"),
      model: request.headers.get("sec-ch-ua-model"),
      mobile: request.headers.get("sec-ch-ua-mobile"),
    });
    const created = await sendStoredVisitorChatMessage({ visitorToken: token, name, email, message, ...device,
      locationLabel: await resolveApproximateLocation(request.headers) });
    return Response.json({ ok: true, ...created }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("[chat] No se pudo guardar el mensaje del visitante:", error);
    return Response.json({ error: "No se pudo enviar el mensaje. Comprueba el almacenamiento local o la conexión e inténtalo de nuevo." }, { status: 500, headers: noStore });
  }
}
