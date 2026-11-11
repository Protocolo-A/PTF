// Run after building with DEVFOLIO_DOCKER_BUILD=true.
// Requires PostgreSQL's psql utility and a DATABASE_URL user allowed to create
// a temporary test database. Never changes the configured application's data.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { access, cp, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const databaseName = `devfolio_deployment_test_${randomBytes(6).toString("hex")}`;
const sourceUrl = process.env.DATABASE_URL;
assert.ok(sourceUrl, "DATABASE_URL is required for the isolated deployment test");
const testUrl = new URL(sourceUrl);
testUrl.pathname = `/${databaseName}`;
const port = Number(process.env.DEPLOYMENT_TEST_PORT || 3101);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
const base = `http://127.0.0.1:${port}`;
let server;
let serverOutput = "";
let created = false;
const password = randomBytes(24).toString("base64url");

function run(label, file, args, environment = process.env) {
  try { return execFileSync(file, args, { env: environment, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (error) {
    const detail = error && typeof error === "object" && "stderr" in error ? String(error.stderr).slice(-1500) : "";
    throw new Error(`${label} failed. ${detail}`);
  }
}
function sql(statement) {
  return run("Temporary database operation", "psql", [sourceUrl, "-v", "ON_ERROR_STOP=1", "-c", statement]);
}
async function response(path, options = {}) {
  return fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(15000) });
}
async function login(value) {
  return response("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: value }) });
}

try {
  await access(".next/standalone/server.js");
  sql(`CREATE DATABASE "${databaseName}";`);
  created = true;
  const migrationEnv = { ...process.env, DATABASE_URL: testUrl.toString() };
  const migrationArguments = ["node_modules/drizzle-kit/bin.cjs", "migrate", "--config=drizzle.config.ts"];
  run("Initial migration", process.execPath, migrationArguments, migrationEnv);
  run("Repeated migration", process.execPath, migrationArguments, migrationEnv);
  console.log("PASS: initial migration and repeat startup on an isolated PostgreSQL database");

  await cp("public", ".next/standalone/public", { recursive: true });
  await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
  server = spawn(process.execPath, [resolve(".next/standalone/server.js")], {
    env: {
      ...process.env,
      DATABASE_URL: testUrl.toString(),
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      ADMIN_PASSWORD: password,
      ADMIN_SESSION_SECRET: randomBytes(48).toString("hex"),
      ADMIN_SECURE_COOKIE: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (data) => { serverOutput = (serverOutput + data.toString()).slice(-4000); });
  server.stderr.on("data", (data) => { serverOutput = (serverOutput + data.toString()).slice(-4000); });
  let healthy = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error(`Standalone server exited. ${serverOutput}`);
    try {
      const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (health.ok) { healthy = true; break; }
    } catch { /* Wait until the production server listens. */ }
    await sleep(500);
  }
  assert.ok(healthy, "Production server must pass the database healthcheck");
  const home = await response("/");
  assert.equal(home.status, 200);
  assert.ok((await home.text()).includes("Alejandro Martínez"));
  assert.equal((await response("/images/forest-cover.jpg")).status, 200);
  const publicData = await response("/api/resume");
  assert.equal(publicData.status, 200);
  const cv = await publicData.json();
  console.log("PASS: standalone production server, public CV, fonts and photos");

  const locked = await response("/admin", { redirect: "manual" });
  assert.equal(locked.status, 307);
  assert.ok(locked.headers.get("location")?.endsWith("/admin/login"));
  const unauthenticated = await response("/api/resume", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cv),
  });
  assert.equal(unauthenticated.status, 401);
  assert.equal((await response("/api/admin/messages")).status, 401);
  assert.equal((await response("/api/admin/chat")).status, 401);
  const wrong = await login("not-the-password");
  assert.equal(wrong.status, 401);
  const correct = await login(password);
  assert.equal(correct.status, 200);
  const rawCookie = correct.headers.get("set-cookie");
  assert.ok(rawCookie && /httponly/i.test(rawCookie) && /samesite=strict/i.test(rawCookie));
  const cookie = rawCookie.split(";")[0];
  const auth = { Cookie: cookie };
  assert.equal((await response("/admin", { headers: auth })).status, 200);

  const visitorToken = randomUUID();
  const visitorChat = await response("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorToken, name: "Cliente de prueba", email: "chat@example.com", message: "Me interesa conversar sobre una oportunidad frontend." }) });
  assert.equal(visitorChat.status, 201, "Visitor chat message must be stored");
  const visitorChatData = await visitorChat.json();
  const visitorThread = await response(`/api/chat?token=${visitorToken}`);
  assert.equal(visitorThread.status, 200);
  assert.equal((await visitorThread.json()).messages.length, 1);
  const adminChatsResponse = await response("/api/admin/chat", { headers: auth });
  assert.equal(adminChatsResponse.status, 200);
  const adminChats = await adminChatsResponse.json();
  assert.ok(adminChats.some((conversation) => conversation.id === visitorChatData.conversationId));
  const adminReply = await response("/api/admin/chat", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: visitorChatData.conversationId, message: "¡Gracias por escribir! Cuéntame más sobre la oportunidad." }) });
  assert.equal(adminReply.status, 201, "Administrator reply must be stored");
  const visitorAfterReply = await response(`/api/chat?token=${visitorToken}`);
  const visitorAfterReplyData = await visitorAfterReply.json();
  assert.equal(visitorAfterReplyData.messages.length, 2);
  assert.equal(visitorAfterReplyData.messages[1].sender, "admin");
  assert.equal(visitorAfterReplyData.hasUnread, true);
  console.log("PASS: public live chat, persistent conversation, protected administrator inbox and reply round-trip");

  cv.profile.name = "Java Developer · Deployment Test";
  const published = await response("/api/resume", {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(cv),
  });
  assert.equal(published.status, 200);
  assert.equal((await (await response("/api/resume")).json()).profile.name, cv.profile.name);
  console.log("PASS: protected admin, incorrect/correct password, private session and publication");

  const form = new FormData();
  form.append("file", new File([await readFile("public/images/profile.jpg")], "portrait.jpg", { type: "image/jpeg" }));
  const uploaded = await response("/api/upload", { method: "POST", headers: auth, body: form });
  assert.equal(uploaded.status, 201);
  const asset = await uploaded.json();
  const image = await response(asset.url);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/jpeg");
  cv.profile.avatar = asset.url;
  const withPhoto = await response("/api/resume", {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(cv),
  });
  assert.equal(withPhoto.status, 200);
  const pdf = await response("/api/cv");
  assert.equal(pdf.status, 200);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  const contact = await response("/api/contact", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Deployment Test", email: "deployment-test@example.com", message: "Mensaje de prueba en una base de datos aislada." }),
  });
  assert.equal(contact.status, 201);
  const messages = await response("/api/admin/messages", { headers: auth });
  assert.equal(messages.status, 200);
  assert.equal((await messages.json()).length, 1);
  console.log("PASS: persistent image uploads, updated PDF, contact form and protected inbox");
} finally {
  if (server && server.exitCode === null) {
    await new Promise((resolveExit) => {
      const timeout = setTimeout(() => { server.kill("SIGKILL"); }, 8000);
      server.once("exit", () => { clearTimeout(timeout); resolveExit(); });
      server.kill("SIGTERM");
    });
  }
  if (created) sql(`DROP DATABASE "${databaseName}" WITH (FORCE);`);
  console.log("Temporary production server stopped; test database removed.");
}
