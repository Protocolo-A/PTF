import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const cookieName = "devfolio_admin";
export const isDemoMode = () => process.env.DEVFOLIO_DEMO_MODE === "true" && process.env.NODE_ENV !== "production";

function signature(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Admin authentication is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function isAdmin() {
  if (isDemoMode()) return true;
  // Fail closed: an absent administrator password must never expose /admin.
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) return false;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiry, nonce, sig] = parts;
  const expected = signature(`${expiry}.${nonce}`);
  if (!/^[a-f0-9]{64}$/.test(sig) || !/^\d{13}$/.test(expiry) || !/^[a-f0-9]{32}$/.test(nonce) || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(expiry) > Date.now();
}

export function verifyPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return false;
  const hash = (s: string) => createHmac("sha256", configured).update(s).digest();
  return timingSafeEqual(hash(password), hash(configured));
}

export async function createSession() {
  if (isDemoMode()) return;
  const expiry = Date.now() + 8 * 60 * 60 * 1000;
  const value = `${expiry}.${randomBytes(16).toString("hex")}`;
  (await cookies()).set(cookieName, `${value}.${signature(value)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" && process.env.ADMIN_SECURE_COOKIE === "true", path: "/", maxAge: 8 * 60 * 60,
  });
}

export async function clearSession() {
  (await cookies()).delete(cookieName);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
    return originHost === requestHost;
  } catch { return false; }
}
