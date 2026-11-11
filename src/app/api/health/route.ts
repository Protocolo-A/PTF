import { checkStoredHealth, isFileStorageEnabled } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await checkStoredHealth();
    return Response.json({ ok: true, storage: isFileStorageEnabled() ? "file" : "postgres" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[health] Storage is unavailable:", error);
    return Response.json({ ok: false, storage: isFileStorageEnabled() ? "file" : "postgres" }, { status: 500 });
  }
}
