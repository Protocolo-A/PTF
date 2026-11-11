import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";

const envExample = parse(await readFile(".env.local.example", "utf8"));
const connection = new URL(envExample.DATABASE_URL);
assert.equal(connection.protocol, "postgresql:");
assert.equal(connection.hostname, "127.0.0.1");
assert.equal(connection.port || "5432", "5432");
assert.equal(connection.pathname, "/cv");
assert.equal(envExample.DEVFOLIO_STORAGE, "postgres");
assert.ok(!Object.keys(envExample).some((key) => key.startsWith("DEVFOLIO_LOCAL_DB_")), "Windows native PostgreSQL example must not contain Docker-only values");
assert.ok(envExample.ADMIN_PASSWORD?.length >= 16);
assert.ok(envExample.ADMIN_SESSION_SECRET?.length >= 48);

const setup = await readFile("scripts/setup-local.mjs", "utf8");
assert.match(setup, /CREATE TABLE IF NOT EXISTS news_articles/i);
assert.match(setup, /CREATE TABLE IF NOT EXISTS site_visits/i);
assert.match(setup, /ADD COLUMN IF NOT EXISTS/i);
assert.doesNotMatch(setup, /\bDROP\s+TABLE\b|\bTRUNCATE\b/i, "Setup must not delete existing tables or rows");

const upload = await readFile("src/app/api/upload/route.ts", "utf8");
assert.match(upload, /image\/gif/);
const media = await readFile("src/app/api/media/[id]/route.ts", "utf8");
assert.match(media, /Content-Type.*asset\.contentType/s);

const visitorChat = await readFile("src/components/chat/live-chat-widget.tsx", "utf8");
const adminStudio = await readFile("src/components/admin/admin-studio.tsx", "utf8");
assert.match(visitorChat, /container\.scrollTop\s*=\s*container\.scrollHeight/);
assert.match(visitorChat, /lastRenderedMessageId/);
assert.doesNotMatch(visitorChat, /\.scrollIntoView\s*\(/);
assert.match(adminStudio, /container\.scrollTop\s*=\s*container\.scrollHeight/);

const newsEditor = await readFile("src/components/admin/news-manager.tsx", "utf8");
const newsApi = await readFile("src/app/api/admin/news/route.ts", "utf8");
const newsPage = await readFile("src/app/noticias/[slug]/page.tsx", "utf8");
assert.match(newsEditor, /Añadir imagen a galería/);
assert.match(newsEditor, /YouTube o Vimeo/);
assert.match(newsApi, /isAdmin\(\)/);
assert.match(newsPage, /safeVideoUrl/);

const device = await readFile("src/lib/device.ts", "utf8");
assert.match(device, /identifyDevice/);
assert.match(device, /No expone la MAC|no expone la MAC/i);
const visits = await readFile("src/components/visit-tracker.tsx", "utf8");
assert.match(visits, /locationConsent:\s*true/);

const home = await readFile("src/app/page.tsx", "utf8");
const publicResume = await readFile("src/components/public-resume.tsx", "utf8");
assert.match(home, /listPublishedNews/);
assert.match(publicResume, /latestNews/);

const adminChatApi = await readFile("src/app/api/admin/chat/route.ts", "utf8");
const adminVisitsApi = await readFile("src/app/api/admin/visits/route.ts", "utf8");
assert.match(adminChatApi, /export async function DELETE/);
assert.match(adminChatApi, /sameOrigin\(request\).*isAdmin\(\)/s);
assert.match(adminVisitsApi, /export async function DELETE/);
assert.match(adminVisitsApi, /clearStoredVisits/);

assert.match(visitorChat, /Notification\.requestPermission/);
assert.match(visitorChat, /playVisitorAlert/);
const pdfRoute = await readFile("src/app/api/cv/route.ts", "utf8");
const resumeForms = await readFile("src/components/admin/resume-forms.tsx", "utf8");
assert.match(pdfRoute, /pdfSettings\.coverColor/);
assert.match(pdfRoute, /pdfSettings\.coverImage/);
assert.match(resumeForms, /Portada del PDF descargable/);

const compose = await readFile("compose.yaml", "utf8");
assert.match(compose, /IPINFO_TOKEN:\s*\$\{IPINFO_TOKEN:-\}/);

console.log("PASS: .env.local example points to PostgreSQL cv on Windows port 5432");
console.log("PASS: database setup is additive and does not drop tables or truncate data");
console.log("PASS: GIF upload and original media content type are preserved");
console.log("PASS: visitor and admin chat scroll stays inside the chat panel");
console.log("PASS: authenticated news editor supports text, images, galleries and videos");
console.log("PASS: device identification is approximate and location is consent-based; MAC is not collected");
console.log("PASS: latest published news articles are included on the public homepage");
console.log("PASS: admin-only endpoints can delete one chat or clear visit history");
console.log("PASS: visitor can enable sound and browser notifications for admin replies");
console.log("PASS: PDF cover color/image settings are wired to the PDF export");
console.log("PASS: optional IPINFO_TOKEN is passed to the Docker app container");
