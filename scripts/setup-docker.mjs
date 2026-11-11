import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error("Usa Node.js 22 o posterior para preparar Devfolio.");
  process.exit(1);
}
if (process.argv.includes("--help")) {
  console.log("Uso: node scripts/setup-docker.mjs\nPrepara .env.docker con las mismas credenciales PostgreSQL configuradas en .env.local. No crea ni cambia contraseñas de una base existente.");
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error("Opción desconocida. Usa --help para ver las instrucciones.");
  process.exit(1);
}

const envPath = fileURLToPath(new URL("../.env.docker", import.meta.url));
const localPath = fileURLToPath(new URL("../.env.local", import.meta.url));
let existingText = null;
let existingVars = null;
try {
  existingText = await readFile(envPath, "utf8");
  existingVars = parse(existingText);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

// Upgrade an older .env.docker created by previous versions without replacing
// the user's database name, username, password or volume configuration.
if (existingText !== null) {
  const dbName = existingVars.POSTGRES_DB || "cv";
  const dbUser = existingVars.POSTGRES_USER;
  const dbPassword = existingVars.POSTGRES_PASSWORD;
  if (dbName !== "cv") {
    console.error(`.env.docker apunta a '${dbName}', no a la base existente cv. No se ha cambiado el archivo ni el volumen.`);
    process.exit(1);
  }
  if (!dbUser || !dbPassword) {
    console.error(".env.docker existe, pero faltan POSTGRES_USER o POSTGRES_PASSWORD. No se reemplazó el archivo para proteger el volumen.");
    process.exit(1);
  }
  if (!existingVars.DATABASE_URL) {
    const encodeUserInfo = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    const internalDatabaseUrl = `postgresql://${encodeUserInfo(dbUser)}:${encodeUserInfo(dbPassword)}@db:5432/${encodeURIComponent(dbName)}`;
    const updatedText = `${existingText}${existingText.endsWith("\n") ? "" : "\n"}DATABASE_URL=${internalDatabaseUrl}\n`;
    await writeFile(envPath, updatedText, { encoding: "utf8", mode: 0o600 });
    console.log(".env.docker anterior actualizado: se añadió DATABASE_URL interna sin cambiar las credenciales existentes.");
  } else {
    console.log(".env.docker ya existe: se conserva la configuración y las credenciales del volumen.");
  }
  process.exit(0);
}

let local;
try { local = parse(await readFile(localPath, "utf8")); }
catch (error) {
  if (error?.code === "ENOENT") {
    console.error("Primero crea .env.local y configura DATABASE_URL para tu base existente cv.");
    process.exit(1);
  }
  throw error;
}
if (!local.DATABASE_URL) {
  console.error("Falta DATABASE_URL en .env.local. No se generará otra contraseña ni otra base.");
  process.exit(1);
}
let connection;
try { connection = new URL(local.DATABASE_URL); }
catch { console.error("DATABASE_URL no es válida en .env.local."); process.exit(1); }
const dbName = decodeURIComponent(connection.pathname.replace(/^\//, ""));
if (dbName !== "cv") {
  console.error(`DATABASE_URL apunta a '${dbName}', no a cv. No se creó .env.docker.`);
  process.exit(1);
}
if (!local.ADMIN_PASSWORD || !local.ADMIN_SESSION_SECRET) {
  console.error("Configura ADMIN_PASSWORD y ADMIN_SESSION_SECRET en .env.local antes de preparar Docker.");
  process.exit(1);
}

const postgresUser = decodeURIComponent(connection.username);
const postgresPassword = decodeURIComponent(connection.password);
const encodeUserInfo = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
const internalDatabaseUrl = `postgresql://${encodeUserInfo(postgresUser)}:${encodeUserInfo(postgresPassword)}@db:5432/${encodeURIComponent(dbName)}`;
const values = {
  APP_PORT: "3000",
  DATABASE_URL: internalDatabaseUrl,
  POSTGRES_DB: dbName,
  POSTGRES_USER: postgresUser,
  POSTGRES_PASSWORD: postgresPassword,
  POSTGRES_HOST_PORT: connection.port || "5433",
  ADMIN_PASSWORD: local.ADMIN_PASSWORD,
  ADMIN_SESSION_SECRET: local.ADMIN_SESSION_SECRET,
  ADMIN_SECURE_COOKIE: local.ADMIN_SECURE_COOKIE || "false",
};
const content = [
  "# Configuración privada de Docker. Mantiene el usuario y contraseña de la base cv ya existente.",
  "# No subas este archivo a Git ni cambies credenciales después de crear el volumen.",
  ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
  "",
].join("\n");
await writeFile(envPath, content, { flag: "wx", mode: 0o600 });
console.log(".env.docker creado reutilizando las credenciales de DATABASE_URL y ADMIN_PASSWORD de .env.local.");
console.log("No se creó ni se reinició ninguna base de datos.");
console.log("Para iniciar únicamente el PostgreSQL del stack existente:");
console.log("docker compose --env-file .env.docker -f compose.yaml up -d db");
console.log("Luego npm run db:setup y npm run dev para desarrollar desde Windows.");
