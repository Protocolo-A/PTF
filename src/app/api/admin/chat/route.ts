import { listStoredConversations, getStoredAdminConversation, sendStoredAdminChatReply, setStoredConversationStatus, deleteStoredConversation } from "@/lib/data-store";
import { isAdmin, sameOrigin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  try {
    const id = new URL(request.url).searchParams.get("conversationId");
    if (id) {
      if (!uuidPattern.test(id)) return Response.json({ error: "Conversación no válida." }, { status: 400, headers: noStore });
      const result = await getStoredAdminConversation(id);
      if (!result) return Response.json({ error: "La conversación ya no existe." }, { status: 404, headers: noStore });
      return Response.json(result, { headers: noStore });
    }
    const conversations = await listStoredConversations();
    return Response.json(conversations, { headers: noStore });
  } catch (error) {
    console.error("[admin/chat] No se pudo consultar el chat:", error);
    return Response.json({ error: "No se pudieron cargar las conversaciones. Comprueba que el almacenamiento esté disponible y que las migraciones estén aplicadas." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Datos no válidos." }, { status: 400, headers: noStore });
    const input = body as Record<string, unknown>;
    const conversationId = typeof input.conversationId === "string" ? input.conversationId : "";
    const message = typeof input.message === "string" ? input.message.trim() : "";
    if (!uuidPattern.test(conversationId) || !message || message.length > 3000) return Response.json({ error: "Escribe un mensaje de hasta 3000 caracteres." }, { status: 400, headers: noStore });
    const result = await sendStoredAdminChatReply(conversationId, message);
    if (!result) return Response.json({ error: "La conversación ya no existe." }, { status: 404, headers: noStore });
    return Response.json({ ok: true, id: result.id }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("[admin/chat] No se pudo enviar la respuesta:", error);
    return Response.json({ error: "No se pudo enviar la respuesta." }, { status: 500, headers: noStore });
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Datos no válidos." }, { status: 400, headers: noStore });
    const input = body as Record<string, unknown>;
    const id = typeof input.id === "string" ? input.id : "";
    const status = input.status;
    if (!uuidPattern.test(id) || !(status === "open" || status === "closed")) return Response.json({ error: "Estado no válido." }, { status: 400, headers: noStore });
    await setStoredConversationStatus(id, status);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("[admin/chat] No se pudo actualizar la conversación:", error);
    return Response.json({ error: "No se pudo actualizar la conversación." }, { status: 500, headers: noStore });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!uuidPattern.test(id)) return Response.json({ error: "Conversación no válida." }, { status: 400, headers: noStore });
  try {
    await deleteStoredConversation(id);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("[admin/chat] No se pudo eliminar la conversación:", error);
    return Response.json({ error: "No se pudo eliminar la conversación." }, { status: 500, headers: noStore });
  }
}
