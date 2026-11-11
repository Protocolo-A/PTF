import { createSession, clearSession, verifyPassword, sameOrigin } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  if (!rateLimit(`login:${clientKey(request)}`, 6, 5 * 60 * 1000)) return Response.json({ error: "Demasiados intentos. Espera cinco minutos." }, { status: 429 });
  try {
    const { password } = await request.json();
    if (typeof password !== "string" || !verifyPassword(password)) return Response.json({ error: "La contraseña no es correcta." }, { status: 401 });
    await createSession();
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "No se pudo iniciar sesión." }, { status: 500 }); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  await clearSession();
  return Response.json({ ok: true });
}
