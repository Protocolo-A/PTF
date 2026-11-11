import { recordStoredVisit } from "@/lib/data-store";
import { resolveApproximateLocation, identifyDevice } from "@/lib/device";
import { sameOrigin } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no válida." }, { status: 403, headers: noStore });
  if (!rateLimit(`visits:${clientKey(request)}`, 90, 60 * 60 * 1000)) return Response.json({ ok: true }, { headers: noStore });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Datos no válidos." }, { status: 400, headers: noStore });
    const input = body as Record<string, unknown>;
    const visitorToken = typeof input.visitorToken === "string" ? input.visitorToken : "";
    const requestedPath = typeof input.path === "string" ? input.path : "/";
    if (!tokenPattern.test(visitorToken)) return Response.json({ error: "Sesión no válida." }, { status: 400, headers: noStore });
    const path = requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath.slice(0, 300) : "/";
    const device = identifyDevice(request.headers.get("user-agent"), {
      platform: request.headers.get("sec-ch-ua-platform"),
      model: request.headers.get("sec-ch-ua-model"),
      mobile: request.headers.get("sec-ch-ua-mobile"),
    });
    const locationConsent = input.locationConsent === true;
    const rawLatitude = typeof input.latitude === "number" ? input.latitude : null;
    const rawLongitude = typeof input.longitude === "number" ? input.longitude : null;
    const validCoordinates = locationConsent && rawLatitude !== null && rawLongitude !== null
      && Number.isFinite(rawLatitude) && Number.isFinite(rawLongitude)
      && Math.abs(rawLatitude) <= 90 && Math.abs(rawLongitude) <= 180;
    const latitude = validCoordinates ? Math.round(rawLatitude! * 100) / 100 : null;
    const longitude = validCoordinates ? Math.round(rawLongitude! * 100) / 100 : null;
    const locationLabel = validCoordinates
      ? "Ubicación aproximada compartida por el visitante"
      : await resolveApproximateLocation(request.headers);
    await recordStoredVisit({ visitorToken, ...device, path, locationLabel, latitude, longitude });
    return Response.json({ ok: true }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("[visits] No se pudo registrar la visita:", error);
    return Response.json({ error: "No se pudo registrar la visita." }, { status: 500, headers: noStore });
  }
}
