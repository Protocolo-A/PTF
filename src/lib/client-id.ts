/**
 * Generates a cryptographically-random UUID v4 in browsers that expose
 * crypto.randomUUID() and in plain-HTTP LAN origins where that method is
 * unavailable. Crypto.getRandomValues() is available in insecure contexts.
 */
export function createClientUuid(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new Error(
      "Este navegador no permite generar una sesión segura. Abre el portafolio mediante HTTPS o localhost.",
    );
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  // RFC 4122 version 4 and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
