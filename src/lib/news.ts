export type NewsBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "quote"; text: string; attribution?: string }
  | { id: string; type: "image"; url: string; alt: string; caption?: string }
  | { id: string; type: "gallery"; images: Array<{ url: string; alt?: string; caption?: string }> }
  | { id: string; type: "video"; url: string; caption?: string };

export type NewsStatus = "draft" | "published";

export type NewsArticleInput = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  blocks: NewsBlock[];
  status: NewsStatus;
};

export function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "noticia";
}

export function safeMediaUrl(value: string): boolean {
  if (!value || value.length > 2000) return false;
  if (value.startsWith("/api/media/")) return /^\/api\/media\/[0-9a-f-]{36}$/i.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

export function safeVideoUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "vimeo.com" || host === "www.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch { return null; }
}
