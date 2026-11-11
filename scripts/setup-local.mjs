import { randomBytes } from "node:crypto";
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { parse } from "dotenv";
import pg from "pg";

const { Pool } = pg;
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const envLocalPath = join(projectRoot, ".env.local");

async function readOptional(path) {
  try { return await readFile(path, "utf8"); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}

function serializeEnvValue(value) {
  return /^[A-Za-z0-9_./:@%+-]+$/.test(value) ? value : JSON.stringify(value);
}

function upsertEnv(source, key, value) {
  const line = `${key}=${serializeEnvValue(value)}`;
  const expression = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, "m");
  if (expression.test(source)) return source.replace(expression, line);
  return `${source}${source && !source.endsWith("\n") ? "\n" : ""}${line}\n`;
}

function isStrong(value, minimum = 16) {
  if (typeof value !== "string" || value.length < minimum) return false;
  return !/^(password|admin|cambia-|change-me|changeme|secreto_aleatorio_generado|secret)$/i.test(value.trim());
}

async function prepareEnvironment() {
  const localText = await readOptional(envLocalPath);
  const baseText = await readOptional(join(projectRoot, ".env"));
  let local = localText ?? "# Configuración privada del portafolio. No compartir ni subir a Git.\n";
  let localVars = parse(local);
  const baseVars = parse(baseText ?? "");

  // An old portable-mode file has higher priority than .env.local in Next.js.
  // Move it to a backup (never delete it) so PostgreSQL is the selected store.
  const devLocalPath = join(projectRoot, ".env.development.local");
  const devLocalText = await readOptional(devLocalPath);
  if (devLocalText !== null) {
    const devVars = parse(devLocalText);
    if (devVars.DEVFOLIO_STORAGE === "file") {
      const backupPath = `${devLocalPath}.respaldo-portable`;
      if ((await readOptional(backupPath)) === null) {
        await rename(devLocalPath, backupPath);
        console.log("Se guardó .env.development.local como respaldo para dejar activa la conexión PostgreSQL de .env.local.");
      } else {
        throw new Error("Existe un modo portátil anterior en .env.development.local y ya hay un respaldo. Renombra manualmente ese archivo para que Next.js utilice .env.local.");
      }
    } else {
      for (const key of ["DATABASE_URL", "DEVFOLIO_STORAGE"]) {
        if (devVars[key] && devVars[key] !== localVars[key]) {
          throw new Error(`${key} también está definida en .env.development.local y tiene prioridad sobre .env.local. Respalda o corrige ese archivo para usar la configuración PostgreSQL de .env.local.`);
        }
      }
    }
  }

  const databaseUrl = (localVars.DATABASE_URL || baseVars.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    throw new Error("Falta DATABASE_URL. Crea .env.local desde .env.local.example y coloca la URL de tu base PostgreSQL cv. No se creará otra base automáticamente.");
  }
  let parsedUrl;
  try { parsedUrl = new URL(databaseUrl); }
  catch { throw new Error("DATABASE_URL no es válida. Usa el formato postgresql://usuario:contraseña@127.0.0.1:5432/cv."); }
  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) throw new Error("DATABASE_URL debe comenzar por postgresql://.");
  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
  if (databaseName !== "cv") throw new Error(`La conexión apunta a '${databaseName}', pero solicitaste conservar la base existente llamada 'cv'. Corrige DATABASE_URL en .env.local. No se ha modificado ninguna base.`);

  // For the native Windows PostgreSQL service, remove stale Docker-only values
  // so they cannot shadow or conflict with the direct 5432 connection. For a
  // Compose-mapped 5433 URL, validate any optional settings instead of deleting them.
  const dockerLocalKeys = ["DEVFOLIO_LOCAL_DB_NAME", "DEVFOLIO_LOCAL_DB_USER", "DEVFOLIO_LOCAL_DB_PASSWORD", "DEVFOLIO_LOCAL_DB_PORT"];
  const isNativeWindowsPostgres = ["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname) && (parsedUrl.port || "5432") === "5432";
  if (isNativeWindowsPostgres) {
    local = local.split(/\r?\n/).filter((line) => {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      return !match || !dockerLocalKeys.includes(match[1]);
    }).join("\n");
    localVars = parse(local);
  } else {
    const decodedUser = decodeURIComponent(parsedUrl.username);
    const decodedPassword = decodeURIComponent(parsedUrl.password);
    const expectedLocalValues = [
      ["DEVFOLIO_LOCAL_DB_NAME", databaseName],
      ["DEVFOLIO_LOCAL_DB_USER", decodedUser],
      ["DEVFOLIO_LOCAL_DB_PASSWORD", decodedPassword],
      ["DEVFOLIO_LOCAL_DB_PORT", parsedUrl.port || "5432"],
    ];
    for (const [key, expected] of expectedLocalValues) {
      if (localVars[key] && localVars[key] !== expected) {
        throw new Error(`${key} no coincide con DATABASE_URL en .env.local. Corrige ambos valores para que el contenedor y Next.js utilicen la misma base cv. No se ha modificado PostgreSQL.`);
      }
    }
  }

  // Put the actual connection in .env.local so Next.js and this setup script use the same value.
  local = upsertEnv(local, "DATABASE_URL", databaseUrl);
  if (!isStrong(localVars.ADMIN_PASSWORD, 16)) {
    const generated = randomBytes(24).toString("base64url");
    local = upsertEnv(local, "ADMIN_PASSWORD", generated);
    console.log("Se generó una contraseña de administrador nueva. Consulta ADMIN_PASSWORD en .env.local y cámbiala por la que prefieras.");
  }
  if (!isStrong(localVars.ADMIN_SESSION_SECRET, 48)) {
    local = upsertEnv(local, "ADMIN_SESSION_SECRET", randomBytes(48).toString("hex"));
  }
  if (!localVars.ADMIN_SECURE_COOKIE) local = upsertEnv(local, "ADMIN_SECURE_COOKIE", "false");
  local = upsertEnv(local, "DEVFOLIO_STORAGE", "postgres");

  // Never silently accept inherited credentials that shadow the .env.local file.
  for (const key of ["DATABASE_URL", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET", "DEVFOLIO_STORAGE"]) {
    const inherited = process.env[key];
    const configured = parse(local)[key];
    if (inherited && configured && inherited !== configured) {
      throw new Error(`${key} está definida también como variable de entorno de Windows y tiene prioridad sobre .env.local. Cierra la terminal, abre una nueva y vuelve a ejecutar el asistente.`);
    }
  }

  await writeFile(envLocalPath, local, { encoding: "utf8", mode: 0o600 });
  return databaseUrl;
}

async function ensureSchema(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 10000, idleTimeoutMillis: 1000 });
  try {
    const current = await pool.query("select current_database() as name");
    if (current.rows[0]?.name !== "cv") throw new Error("La conexión no está apuntando a la base cv. No se aplicaron cambios.");

    // Idempotent, additive DDL only. Existing rows and CV JSON remain intact.
    const statements = [
      `CREATE TABLE IF NOT EXISTS resumes (
        id text PRIMARY KEY,
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS media_assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        content_type text NOT NULL,
        data text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS contact_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text NOT NULL,
        message text NOT NULL,
        read boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS chat_conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        visitor_token text NOT NULL,
        name text NOT NULL,
        email text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        unread_for_admin boolean NOT NULL DEFAULT true,
        unread_for_visitor boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        last_message_at timestamptz NOT NULL DEFAULT now(),
        device_label text NOT NULL DEFAULT 'Dispositivo no identificado',
        browser_name text NOT NULL DEFAULT 'Navegador no identificado',
        platform_name text NOT NULL DEFAULT 'Sistema no identificado',
        device_type text NOT NULL DEFAULT 'Dispositivo no identificado',
        device_model text,
        location_label text NOT NULL DEFAULT 'Ubicación no disponible',
        latitude double precision,
        longitude double precision
      )`,
      `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS device_label text NOT NULL DEFAULT 'Dispositivo no identificado'`,
      `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS browser_name text NOT NULL DEFAULT 'Navegador no identificado'`,
      `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS platform_name text NOT NULL DEFAULT 'Sistema no identificado'`,
      `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS device_type text NOT NULL DEFAULT 'Dispositivo no identificado'`,
      `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS device_model text`,
      `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS location_label text NOT NULL DEFAULT 'Ubicación no disponible'`,
      `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS latitude double precision`,
      `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS longitude double precision`,
      `CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_visitor_token_unique ON chat_conversations (visitor_token)`,
      `CREATE INDEX IF NOT EXISTS chat_conversations_last_message_idx ON chat_conversations (last_message_at)`,
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        sender text NOT NULL,
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx ON chat_messages (conversation_id, created_at)`,
      `CREATE TABLE IF NOT EXISTS site_visits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        visitor_token text NOT NULL,
        device_label text NOT NULL,
        browser_name text NOT NULL,
        platform_name text NOT NULL,
        device_type text NOT NULL DEFAULT 'Dispositivo no identificado',
        device_model text,
        location_label text NOT NULL DEFAULT 'Ubicación no disponible',
        latitude double precision,
        longitude double precision,
        path text NOT NULL DEFAULT '/',
        visited_at timestamptz NOT NULL DEFAULT now()
      )`,
      `ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS device_type text NOT NULL DEFAULT 'Dispositivo no identificado'`,
      `ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS device_model text`,
      `ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS location_label text NOT NULL DEFAULT 'Ubicación no disponible'`,
      `ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS latitude double precision`,
      `ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS longitude double precision`,
      `CREATE UNIQUE INDEX IF NOT EXISTS site_visits_visitor_token_unique ON site_visits (visitor_token)`,
      `CREATE INDEX IF NOT EXISTS site_visits_visited_at_idx ON site_visits (visited_at DESC)`,
      `CREATE TABLE IF NOT EXISTS news_articles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL,
        title text NOT NULL,
        excerpt text NOT NULL DEFAULT '',
        cover_image text NOT NULL DEFAULT '',
        blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
        status text NOT NULL DEFAULT 'draft',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        published_at timestamptz
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS news_articles_slug_unique ON news_articles (slug)`,
      `CREATE INDEX IF NOT EXISTS news_articles_status_published_idx ON news_articles (status, published_at)`,
    ];
    for (const statement of statements) await pool.query(statement);
    const verify = await pool.query(`
      SELECT
        to_regclass('public.resumes') IS NOT NULL AS resumes,
        to_regclass('public.media_assets') IS NOT NULL AS media_assets,
        to_regclass('public.contact_messages') IS NOT NULL AS contact_messages,
        to_regclass('public.chat_conversations') IS NOT NULL AS chat_conversations,
        to_regclass('public.chat_messages') IS NOT NULL AS chat_messages,
        to_regclass('public.site_visits') IS NOT NULL AS site_visits,
        to_regclass('public.news_articles') IS NOT NULL AS news_articles
    `);
    if (Object.values(verify.rows[0] ?? {}).some((value) => value !== true)) throw new Error("No se pudo verificar todo el esquema del portafolio.");
  } catch (error) {
    if (error?.code === "28P01") throw new Error("PostgreSQL rechazó la contraseña. Revisa DATABASE_URL en .env.local; no cambies la contraseña del volumen sin respaldarlo.");
    if (error?.code === "3D000") throw new Error("La base de datos cv no existe en ese servidor. No se creó otra base. Inicia el servidor que contiene tu base cv y vuelve a intentarlo.");
    if (["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(error?.code)) throw new Error("No se puede conectar a PostgreSQL. Comprueba que el servicio que contiene tu base cv esté iniciado y que host/puerto de .env.local sean correctos.");
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Instala Node.js 22 o posterior.");
  process.chdir(projectRoot);
  console.log("Leyendo .env.local y conservando la conexión a tu base cv…");
  const databaseUrl = await prepareEnvironment();
  console.log("Comprobando conexión a PostgreSQL y preparando tablas adicionales…");
  await ensureSchema(databaseUrl);
  console.log("\nListo. La base cv está conectada y el esquema del CV, chat, noticias y visitas está preparado.");
  console.log("No se borraron ni reemplazaron tablas ni registros existentes.");
  console.log("Ahora ejecuta: npm run dev");
  console.log("Administrador: http://localhost:3000/admin");
  console.log("Configura ADMIN_PASSWORD en .env.local. No compartas ese archivo.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`\nNo se pudo completar la preparación: ${error.message}`);
    process.exitCode = 1;
  });
}
