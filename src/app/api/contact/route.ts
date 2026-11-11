import { createStoredContact } from "@/lib/data-store";
import { sameOrigin } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  if (!rateLimit(`contact:${clientKey(request)}`, 8, 60 * 60 * 1000)) {
    return Response.json(
      { error: "Has enviado varios mensajes. Vuelve a intentarlo más tarde." },
      { status: 429 },
    );
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "El formulario contiene datos no válidos." }, { status: 400 });
    }

    const data = body as Record<string, unknown>;

    // Honeypot anti-spam. Use a field name that browsers are unlikely to autofill.
    if (typeof data.faxNumber === "string" && data.faxNumber.trim()) {
      return Response.json({ ok: true }, { status: 200 });
    }

    const name = typeof data.name === "string" ? data.name.trim() : "";
    const email = typeof data.email === "string" ? data.email.trim() : "";
    const message = typeof data.message === "string" ? data.message.trim() : "";

    if (
      name.length < 2 || name.length > 120 ||
      email.length > 250 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      message.length < 10 || message.length > 5000
    ) {
      return Response.json(
        { error: "Escribe tu nombre, un email válido y un mensaje de al menos 10 caracteres." },
        { status: 400 },
      );
    }

    const savedMessage = await createStoredContact({ name, email, message });
    if (!savedMessage.id) throw new Error("El almacenamiento no confirmó el guardado del mensaje.");

    return Response.json({ ok: true, id: savedMessage.id }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // Keep sensitive database details out of the public response, but make
    // the actual failure visible in the server terminal for troubleshooting.
    console.error("[contact] No se pudo guardar el mensaje:", error);
    return Response.json(
      { error: "No se pudo guardar el mensaje. Comprueba el almacenamiento local o la conexión a PostgreSQL e inténtalo de nuevo." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
