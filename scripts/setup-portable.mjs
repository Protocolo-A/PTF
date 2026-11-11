import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { parse } from "dotenv";

if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error("Usa Node.js 22 o posterior para ejecutar Devfolio.");
  process.exit(1);
}

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
process.chdir(projectRoot);
const configPath = join(projectRoot, ".env.development.local");
const sources = [".env", ".env.development", ".env.local", ".env.development.local"];
const effective = {};
for (const file of sources) {
  try { Object.assign(effective, parse(await readFile(join(projectRoot, file), "utf8"))); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
Object.assign(effective, process.env);

function strongSecret(value, minimum) {
  if (typeof value !== "string" || value.length < minimum) return false;
  const normalized = value.toLowerCase();
  return !["password", "cambia-esta-contrasena", "cambia-este-secreto-por-uno-aleatorio-largo", "secreto_aleatorio_generado", "changeme", "secret"].includes(normalized);
}

const values = {
  DEVFOLIO_STORAGE: "file",
  DEVFOLIO_FILE_PATH: ".devfolio-data/store.json",
  ADMIN_PASSWORD: strongSecret(effective.ADMIN_PASSWORD, 16) ? effective.ADMIN_PASSWORD : randomBytes(24).toString("base64url"),
  ADMIN_SESSION_SECRET: strongSecret(effective.ADMIN_SESSION_SECRET, 48) ? effective.ADMIN_SESSION_SECRET : randomBytes(48).toString("hex"),
  ADMIN_SECURE_COOKIE: "false",
};

let existing = "";
try { existing = await readFile(configPath, "utf8"); }
catch (error) { if (error?.code !== "ENOENT") throw error; }
let output = existing;
for (const [key, value] of Object.entries(values)) {
  const assignment = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, "m");
  const line = `${key}=${value}`;
  if (assignment.test(output)) output = output.replace(assignment, line);
  else output += `${output && !output.endsWith("\n") ? "\n" : ""}${line}\n`;
}
await writeFile(configPath, output, { encoding: "utf8", mode: 0o600 });

const dataDirectory = join(projectRoot, ".devfolio-data");
await mkdir(dataDirectory, { recursive: true });
const dataFile = join(dataDirectory, "store.json");
try {
  const parsed = JSON.parse(await readFile(dataFile, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
  console.log("Se conservó el archivo de datos local existente.");
} catch (error) {
  if (error?.code === "ENOENT") {
    const initial = { version: 1, resume: null, mediaAssets: [], contactMessages: [], chatConversations: [], chatMessages: [], siteVisits: [] };
    await writeFile(dataFile, `${JSON.stringify(initial, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    console.log("Se creó el almacenamiento local inicial.");
  } else if (error instanceof SyntaxError || error?.message === "invalid") {
    console.error("El archivo .devfolio-data/store.json existe, pero no tiene JSON válido. No se modificó para evitar pérdida de datos.");
    process.exit(1);
  } else throw error;
}

console.log("\nConfiguración portátil lista.");
console.log("Modo de datos: archivo local persistente (no necesita Docker, WSL ni PostgreSQL).");
console.log("Datos: .devfolio-data/store.json (incluye CV, fotos, mensajes y chats).");
console.log("Administrador: abre .env.development.local y consulta ADMIN_PASSWORD en tu propio equipo.");
console.log("No compartas .env.development.local ni el contenido de .devfolio-data.");
console.log("Ahora ejecuta: npm run dev");
