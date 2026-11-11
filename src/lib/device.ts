import { isIP } from "node:net";

export type DeviceInfo = {
  deviceLabel: string;
  browserName: string;
  platformName: string;
  deviceType: string;
  deviceModel: string | null;
};

function cleanHint(value: string | null | undefined, max = 100): string {
  return (value || "").replace(/[\r\n\u0000-\u001f]/g, "").trim().slice(0, max);
}

/**
 * Identificación aproximada desde User-Agent y Client Hints.
 * El navegador no expone la MAC, número de serie ni nombre privado del equipo.
 */
export function identifyDevice(
  userAgent: string | null | undefined,
  hints?: { platform?: string | null; model?: string | null; mobile?: string | null },
): DeviceInfo {
  const ua = (userAgent || "").slice(0, 1000);
  const platformHint = cleanHint(hints?.platform).replace(/^"|"$/g, "");
  const modelHint = cleanHint(hints?.model).replace(/^"|"$/g, "");
  const mobileHint = cleanHint(hints?.mobile);
  let platformName = platformHint || "Sistema no identificado";
  let deviceType = "Equipo";
  let deviceName = "Dispositivo";
  let browserName = "Navegador no identificado";

  if (/iPhone/i.test(ua)) { platformName = "iOS"; deviceType = "Móvil"; deviceName = "iPhone"; }
  else if (/iPad/i.test(ua)) { platformName = "iPadOS"; deviceType = "Tablet"; deviceName = "iPad"; }
  else if (/Android/i.test(ua)) {
    platformName = "Android";
    const isTablet = /Tablet|SM-T|Pixel C/i.test(ua) || mobileHint === "?0";
    deviceType = isTablet ? "Tablet" : "Móvil";
    deviceName = isTablet ? "Tablet Android" : "Teléfono Android";
  } else if (/Windows NT/i.test(ua) || /Windows/i.test(platformHint)) { platformName = "Windows"; deviceType = "PC"; deviceName = "PC Windows"; }
  else if (/Macintosh|Mac OS X/i.test(ua) || /macOS/i.test(platformHint)) { platformName = "macOS"; deviceType = /iPad/i.test(ua) ? "Tablet" : "Computadora"; deviceName = "Mac"; }
  else if (/CrOS/i.test(ua) || /Chrome OS/i.test(platformHint)) { platformName = "ChromeOS"; deviceType = "Computadora"; deviceName = "Chromebook"; }
  else if (/Linux/i.test(ua) || /Linux/i.test(platformHint)) { platformName = "Linux"; deviceType = mobileHint === "?1" ? "Móvil" : "PC"; deviceName = mobileHint === "?1" ? "Dispositivo Linux móvil" : "PC Linux"; }

  if (/Edg\//i.test(ua)) browserName = "Microsoft Edge";
  else if (/OPR\//i.test(ua)) browserName = "Opera";
  else if (/Firefox\//i.test(ua)) browserName = "Firefox";
  else if (/CriOS\//i.test(ua)) browserName = "Chrome iOS";
  else if (/Chrome\//i.test(ua)) browserName = "Google Chrome";
  else if (/Safari\//i.test(ua)) browserName = "Safari";

  const deviceModel = modelHint || (/iPhone|iPad/i.test(ua) ? deviceName : null);
  const modelLabel = deviceModel ? ` · ${deviceModel}` : "";
  return {
    deviceLabel: `${deviceName}${modelLabel} · ${browserName}`.slice(0, 160),
    browserName: browserName.slice(0, 80),
    platformName: platformName.slice(0, 80),
    deviceType: deviceType.slice(0, 40),
    deviceModel: deviceModel?.slice(0, 120) ?? null,
  };
}

/** Location is only read from trusted hosting-provider geo headers. No IP address is stored. */
export function approximateLocationFromHeaders(headers: Headers): string {
  const city = cleanHint(headers.get("x-vercel-ip-city") || headers.get("cf-ipcity"), 80);
  const region = cleanHint(headers.get("x-vercel-ip-country-region") || headers.get("cf-region"), 80);
  const country = cleanHint(headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry"), 80);
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Ubicación no disponible (servidor local o sin geolocalización IP)";
}


const geoLocationCache = new Map<string, { label: string; expiresAt: number }>();

function isPublicIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168));
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    return normalized !== "::1" && !normalized.startsWith("fc") && !normalized.startsWith("fd")
      && !normalized.startsWith("fe80:") && !normalized.startsWith("::ffff:127.");
  }
  return false;
}

/**
 * Geolocalización aproximada para sitios publicados. Primero utiliza cabeceras
 * del proxy (Vercel/Cloudflare); opcionalmente consulta IPinfo con IPINFO_TOKEN.
 * La IP se usa solo durante la consulta y NUNCA se guarda en la base de datos.
 */
export async function resolveApproximateLocation(headers: Headers): Promise<string> {
  const fromProxy = approximateLocationFromHeaders(headers);
  if (!fromProxy.startsWith("Ubicación no disponible")) return fromProxy;

  const token = process.env.IPINFO_TOKEN?.trim();
  if (!token) return fromProxy;
  const rawIp = cleanHint(
    headers.get("cf-connecting-ip") || headers.get("x-real-ip") || headers.get("x-vercel-forwarded-for"),
    80,
  ).split(",")[0].trim();
  if (!rawIp || !isPublicIp(rawIp)) return fromProxy;

  const cached = geoLocationCache.get(rawIp);
  if (cached && cached.expiresAt > Date.now()) return cached.label;
  try {
    const response = await fetch(`https://ipinfo.io/${encodeURIComponent(rawIp)}/json?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return fromProxy;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return fromProxy;
    const record = data as Record<string, unknown>;
    const parts = [record.city, record.region, record.country]
      .filter((part): part is string => typeof part === "string")
      .map((part) => cleanHint(part, 80))
      .filter(Boolean);
    if (!parts.length) return fromProxy;
    const label = parts.join(", ");
    geoLocationCache.set(rawIp, { label, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    if (geoLocationCache.size > 1000) {
      for (const [key, value] of geoLocationCache) if (value.expiresAt <= Date.now()) geoLocationCache.delete(key);
    }
    return label;
  } catch {
    return fromProxy;
  }
}
