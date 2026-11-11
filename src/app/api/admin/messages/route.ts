import { listStoredContacts, setStoredContactRead, deleteStoredContact } from "@/lib/data-store";
import { isAdmin, sameOrigin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  }

  try {
    const messages = await listStoredContacts();
    return Response.json(messages, { headers: noStore });
  } catch (error) {
    console.error("[admin/messages] No se pudo consultar la bandeja:", error);
    return Response.json(
      { error: "No se pudieron consultar los mensajes. Comprueba que el almacenamiento local o la base PostgreSQL estén disponibles." },
      { status: 500, headers: noStore },
    );
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) {
    return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  }
  try {
    const { id, read } = await request.json();
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || typeof read !== "boolean") {
      return Response.json({ error: "Datos no válidos." }, { status: 400, headers: noStore });
    }
    await setStoredContactRead(id, read);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("[admin/messages] No se pudo actualizar el mensaje:", error);
    return Response.json({ error: "No se pudo actualizar el mensaje." }, { status: 500, headers: noStore });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin())) {
    return Response.json({ error: "Acceso no autorizado." }, { status: 401, headers: noStore });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Mensaje no válido." }, { status: 400, headers: noStore });
  }
  try {
    await deleteStoredContact(id);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("[admin/messages] No se pudo eliminar el mensaje:", error);
    return Response.json({ error: "No se pudo eliminar el mensaje." }, { status: 500, headers: noStore });
  }
}
