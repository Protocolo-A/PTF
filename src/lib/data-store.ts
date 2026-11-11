import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { asc, desc, eq, sql } from "drizzle-orm";
import { resumes, mediaAssets, contactMessages, chatConversations, chatMessages, siteVisits, newsArticles } from "../db/schema";
import type { NewsArticleInput } from "./news";
import { defaultResume, normalizeResume, type ResumeData } from "./resume";

type ResumeRow = typeof resumes.$inferSelect;
type MediaRow = typeof mediaAssets.$inferSelect;
type ContactRow = typeof contactMessages.$inferSelect;
type ConversationRow = typeof chatConversations.$inferSelect;
type ChatMessageRow = typeof chatMessages.$inferSelect;
type SiteVisitRow = typeof siteVisits.$inferSelect;
type NewsArticleRow = typeof newsArticles.$inferSelect;

type FileState = {
  version: 1;
  resume: ResumeData | null;
  mediaAssets: MediaRow[];
  contactMessages: ContactRow[];
  chatConversations: ConversationRow[];
  chatMessages: ChatMessageRow[];
  siteVisits: SiteVisitRow[];
  newsArticles: NewsArticleRow[];
};

const isFileMode = () => process.env.DEVFOLIO_STORAGE === "file";
const filePath = () => resolve(process.cwd(), process.env.DEVFOLIO_FILE_PATH || ".devfolio-data/store.json");
const emptyState = (): FileState => ({ version: 1, resume: null, mediaAssets: [], contactMessages: [], chatConversations: [], chatMessages: [], siteVisits: [], newsArticles: [] });

const globalStore = globalThis as typeof globalThis & { __devfolioFileStoreQueue?: Promise<void> };

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function normalizeFileState(input: unknown): FileState {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("El archivo local de datos no tiene un formato válido. Se conserva intacto para evitar perder información.");
  }
  const raw = input as Partial<FileState>;
  return {
    version: 1,
    resume: raw.resume ?? null,
    mediaAssets: Array.isArray(raw.mediaAssets) ? raw.mediaAssets : [],
    contactMessages: Array.isArray(raw.contactMessages) ? raw.contactMessages : [],
    chatConversations: Array.isArray(raw.chatConversations) ? raw.chatConversations : [],
    chatMessages: Array.isArray(raw.chatMessages) ? raw.chatMessages : [],
    siteVisits: Array.isArray(raw.siteVisits) ? raw.siteVisits : [],
    newsArticles: Array.isArray(raw.newsArticles) ? raw.newsArticles : [],
  };
}

async function readFileState(): Promise<FileState> {
  try {
    return normalizeFileState(JSON.parse(await readFile(filePath(), "utf8")));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return emptyState();
    throw error;
  }
}

async function persistFileState(state: FileState): Promise<void> {
  const destination = filePath();
  await mkdir(dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await rename(temporary, destination);
}

async function readLocal<T>(reader: (state: FileState) => T | Promise<T>): Promise<T> {
  await (globalStore.__devfolioFileStoreQueue ?? Promise.resolve());
  return reader(await readFileState());
}

async function mutateLocal<T>(mutator: (state: FileState) => T | Promise<T>): Promise<T> {
  const previous = globalStore.__devfolioFileStoreQueue ?? Promise.resolve();
  const operation = previous.then(async () => {
    const state = await readFileState();
    const result = await mutator(state);
    await persistFileState(state);
    return result;
  });
  globalStore.__devfolioFileStoreQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

async function postgres() {
  const { db } = await import("../db/index");
  if (!db) throw new Error("La conexión PostgreSQL no está inicializada. Revisa DATABASE_URL.");
  return db;
}

export async function getStoredResume(): Promise<ResumeData> {
  if (isFileMode()) {
    const existing = await readLocal((state) => state.resume);
    if (existing) return normalizeResume(existing);
    return mutateLocal((state) => {
      if (!state.resume) state.resume = defaultResume;
      return normalizeResume(state.resume);
    });
  }
  const db = await postgres();
  const [resume] = await db.select().from(resumes).where(eq(resumes.id, "main")).limit(1);
  if (resume) return normalizeResume(resume.data);
  await db.insert(resumes).values({ id: "main", data: defaultResume }).onConflictDoNothing();
  return defaultResume;
}

export async function saveStoredResume(data: ResumeData): Promise<void> {
  const normalized = normalizeResume(data);
  if (isFileMode()) {
    await mutateLocal((state) => { state.resume = normalized; });
    return;
  }
  const db = await postgres();
  await db.insert(resumes).values({ id: "main", data: normalized, updatedAt: new Date() }).onConflictDoUpdate({
    target: resumes.id, set: { data: normalized, updatedAt: new Date() },
  });
}

export async function getStoredMedia(id: string): Promise<MediaRow | null> {
  if (isFileMode()) return readLocal((state) => {
    const row = state.mediaAssets.find((asset) => asset.id === id);
    return row ? { ...row, createdAt: asDate(row.createdAt) } : null;
  });
  const db = await postgres();
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  return asset ?? null;
}

export async function createStoredMedia(input: Pick<MediaRow, "name" | "contentType" | "data">): Promise<{ id: string }> {
  if (isFileMode()) return mutateLocal((state) => {
    const id = randomUUID();
    state.mediaAssets.push({ id, ...input, createdAt: new Date() });
    return { id };
  });
  const db = await postgres();
  const [asset] = await db.insert(mediaAssets).values(input).returning({ id: mediaAssets.id });
  if (!asset) throw new Error("No se pudo confirmar el almacenamiento de la imagen.");
  return asset;
}

export async function createStoredContact(input: Pick<ContactRow, "name" | "email" | "message">): Promise<{ id: string }> {
  if (isFileMode()) return mutateLocal((state) => {
    const id = randomUUID();
    state.contactMessages.push({ id, ...input, read: false, createdAt: new Date() });
    return { id };
  });
  const db = await postgres();
  const [saved] = await db.insert(contactMessages).values(input).returning({ id: contactMessages.id });
  if (!saved) throw new Error("PostgreSQL no confirmó el guardado del mensaje.");
  return saved;
}

export async function listStoredContacts(): Promise<ContactRow[]> {
  if (isFileMode()) return readLocal((state) => state.contactMessages
    .slice().sort((a, b) => asDate(b.createdAt).getTime() - asDate(a.createdAt).getTime()).slice(0, 200)
    .map((row) => ({ ...row, createdAt: asDate(row.createdAt) })));
  const db = await postgres();
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(200);
}

export async function setStoredContactRead(id: string, read: boolean): Promise<void> {
  if (isFileMode()) return mutateLocal((state) => {
    const row = state.contactMessages.find((item) => item.id === id);
    if (row) row.read = read;
  });
  const db = await postgres();
  await db.update(contactMessages).set({ read }).where(eq(contactMessages.id, id));
}

export async function deleteStoredContact(id: string): Promise<void> {
  if (isFileMode()) return mutateLocal((state) => {
    state.contactMessages = state.contactMessages.filter((item) => item.id !== id);
  });
  const db = await postgres();
  await db.delete(contactMessages).where(eq(contactMessages.id, id));
}

export async function listStoredConversations(): Promise<ConversationRow[]> {
  if (isFileMode()) return readLocal((state) => state.chatConversations
    .slice().sort((a, b) => asDate(b.lastMessageAt).getTime() - asDate(a.lastMessageAt).getTime()).slice(0, 100)
    .map((row) => ({ ...row, createdAt: asDate(row.createdAt), updatedAt: asDate(row.updatedAt), lastMessageAt: asDate(row.lastMessageAt) })));
  const db = await postgres();
  return db.select().from(chatConversations).orderBy(desc(chatConversations.lastMessageAt)).limit(100);
}

export async function getStoredAdminConversation(id: string): Promise<{ conversation: ConversationRow; messages: ChatMessageRow[] } | null> {
  if (isFileMode()) return mutateLocal((state) => {
    const row = state.chatConversations.find((item) => item.id === id);
    if (!row) return null;
    row.unreadForAdmin = false;
    const messages = state.chatMessages.filter((item) => item.conversationId === id)
      .slice().sort((a, b) => asDate(a.createdAt).getTime() - asDate(b.createdAt).getTime()).slice(0, 200)
      .map((item) => ({ ...item, createdAt: asDate(item.createdAt) }));
    return {
      conversation: { ...row, createdAt: asDate(row.createdAt), updatedAt: asDate(row.updatedAt), lastMessageAt: asDate(row.lastMessageAt) },
      messages,
    };
  });
  const db = await postgres();
  const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.id, id)).limit(1);
  if (!conversation) return null;
  await db.update(chatConversations).set({ unreadForAdmin: false }).where(eq(chatConversations.id, id));
  const messages = await db.select().from(chatMessages).where(eq(chatMessages.conversationId, id)).orderBy(asc(chatMessages.createdAt)).limit(200);
  return { conversation, messages };
}

export async function sendStoredAdminChatReply(conversationId: string, message: string): Promise<{ id: string } | null> {
  if (isFileMode()) return mutateLocal((state) => {
    const conversation = state.chatConversations.find((item) => item.id === conversationId);
    if (!conversation) return null;
    const now = new Date();
    const id = randomUUID();
    state.chatMessages.push({ id, conversationId, sender: "admin", message, createdAt: now });
    conversation.unreadForVisitor = true;
    conversation.unreadForAdmin = false;
    conversation.updatedAt = now;
    conversation.lastMessageAt = now;
    conversation.status = "open";
    return { id };
  });
  const db = await postgres();
  return db.transaction(async (tx) => {
    const [conversation] = await tx.select({ id: chatConversations.id }).from(chatConversations).where(eq(chatConversations.id, conversationId)).limit(1);
    if (!conversation) return null;
    const now = new Date();
    const [saved] = await tx.insert(chatMessages).values({ conversationId, sender: "admin", message, createdAt: now }).returning({ id: chatMessages.id });
    await tx.update(chatConversations).set({ unreadForVisitor: true, unreadForAdmin: false, updatedAt: now, lastMessageAt: now, status: "open" }).where(eq(chatConversations.id, conversationId));
    return saved ?? null;
  });
}

export async function setStoredConversationStatus(id: string, status: "open" | "closed"): Promise<void> {
  if (isFileMode()) return mutateLocal((state) => {
    const row = state.chatConversations.find((item) => item.id === id);
    if (row) { row.status = status; row.updatedAt = new Date(); }
  });
  const db = await postgres();
  await db.update(chatConversations).set({ status, updatedAt: new Date() }).where(eq(chatConversations.id, id));
}

/** Elimina una conversación y sus mensajes asociados sin afectar otras conversaciones. */
export async function deleteStoredConversation(id: string): Promise<void> {
  if (isFileMode()) return mutateLocal((state) => {
    state.chatConversations = state.chatConversations.filter((item) => item.id !== id);
    state.chatMessages = state.chatMessages.filter((item) => item.conversationId !== id);
  });
  const db = await postgres();
  // chat_messages has ON DELETE CASCADE, so the thread history is removed atomically.
  await db.delete(chatConversations).where(eq(chatConversations.id, id));
}

export async function getStoredVisitorChat(token: string): Promise<{ conversation: { id: string; name: string; email: string; status: string } | null; hasUnread: boolean; messages: Pick<ChatMessageRow, "id" | "sender" | "message" | "createdAt">[] }> {
  if (isFileMode()) return mutateLocal((state) => {
    const conversation = state.chatConversations.find((item) => item.visitorToken === token);
    if (!conversation) return { conversation: null, hasUnread: false, messages: [] };
    const hasUnread = conversation.unreadForVisitor;
    conversation.unreadForVisitor = false;
    const messages = state.chatMessages.filter((item) => item.conversationId === conversation.id)
      .slice().sort((a, b) => asDate(a.createdAt).getTime() - asDate(b.createdAt).getTime()).slice(0, 150)
      .map(({ id, sender, message, createdAt }) => ({ id, sender, message, createdAt: asDate(createdAt) }));
    return { conversation: { id: conversation.id, name: conversation.name, email: conversation.email, status: conversation.status }, hasUnread, messages };
  });
  const db = await postgres();
  const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.visitorToken, token)).limit(1);
  if (!conversation) return { conversation: null, hasUnread: false, messages: [] };
  const hasUnread = conversation.unreadForVisitor;
  await db.update(chatConversations).set({ unreadForVisitor: false }).where(eq(chatConversations.id, conversation.id));
  const messages = await db.select({ id: chatMessages.id, sender: chatMessages.sender, message: chatMessages.message, createdAt: chatMessages.createdAt })
    .from(chatMessages).where(eq(chatMessages.conversationId, conversation.id)).orderBy(asc(chatMessages.createdAt)).limit(150);
  return { conversation: { id: conversation.id, name: conversation.name, email: conversation.email, status: conversation.status }, hasUnread, messages };
}

export async function sendStoredVisitorChatMessage(input: { visitorToken: string; name: string; email: string; message: string; deviceLabel: string; browserName: string; platformName: string; deviceType?: string; deviceModel?: string | null; locationLabel?: string; latitude?: number | null; longitude?: number | null }): Promise<{ conversationId: string; messageId: string }> {
  if (isFileMode()) return mutateLocal((state) => {
    const now = new Date();
    let conversation = state.chatConversations.find((item) => item.visitorToken === input.visitorToken);
    if (!conversation) {
      conversation = {
        id: randomUUID(), visitorToken: input.visitorToken, name: input.name, email: input.email,
        status: "open", unreadForAdmin: true, unreadForVisitor: false,
        deviceLabel: input.deviceLabel, browserName: input.browserName, platformName: input.platformName,
        deviceType: input.deviceType || input.deviceLabel.split(" · ")[0] || "Dispositivo no identificado",
        deviceModel: input.deviceModel ?? null, locationLabel: input.locationLabel || "Ubicación no disponible",
        latitude: input.latitude ?? null, longitude: input.longitude ?? null,
        createdAt: now, updatedAt: now, lastMessageAt: now,
      };
      state.chatConversations.push(conversation);
    } else {
      conversation.name = input.name;
      conversation.email = input.email;
      conversation.deviceLabel = input.deviceLabel;
      conversation.browserName = input.browserName;
      conversation.platformName = input.platformName;
      conversation.deviceType = input.deviceType || input.deviceLabel.split(" · ")[0] || "Dispositivo no identificado";
      conversation.deviceModel = input.deviceModel ?? conversation.deviceModel ?? null;
      conversation.locationLabel = input.locationLabel && !input.locationLabel.startsWith("Ubicación no disponible")
        ? input.locationLabel
        : conversation.locationLabel || "Ubicación no disponible";
      conversation.latitude = input.latitude ?? conversation.latitude ?? null;
      conversation.longitude = input.longitude ?? conversation.longitude ?? null;
      conversation.status = "open";
      conversation.unreadForAdmin = true;
      conversation.updatedAt = now;
      conversation.lastMessageAt = now;
    }
    const messageId = randomUUID();
    state.chatMessages.push({ id: messageId, conversationId: conversation.id, sender: "visitor", message: input.message, createdAt: now });
    return { conversationId: conversation.id, messageId };
  });
  const db = await postgres();
  return db.transaction(async (tx) => {
    const now = new Date();
    const [conversation] = await tx.insert(chatConversations).values({
      visitorToken: input.visitorToken, name: input.name, email: input.email, status: "open", unreadForAdmin: true,
      unreadForVisitor: false, deviceLabel: input.deviceLabel, browserName: input.browserName, platformName: input.platformName,
      deviceType: input.deviceType || input.deviceLabel.split(" · ")[0] || "Dispositivo no identificado",
      deviceModel: input.deviceModel ?? null,
      locationLabel: input.locationLabel || "Ubicación no disponible",
      latitude: input.latitude ?? null, longitude: input.longitude ?? null,
      createdAt: now, updatedAt: now, lastMessageAt: now,
    }).onConflictDoUpdate({
      target: chatConversations.visitorToken,
      set: {
        name: input.name, email: input.email, deviceLabel: input.deviceLabel, browserName: input.browserName,
        platformName: input.platformName,
        deviceType: input.deviceType || input.deviceLabel.split(" · ")[0] || "Dispositivo no identificado",
        deviceModel: input.deviceModel ?? sql`${chatConversations.deviceModel}`,
        locationLabel: input.locationLabel && !input.locationLabel.startsWith("Ubicación no disponible") ? input.locationLabel : sql`${chatConversations.locationLabel}`,
        latitude: input.latitude ?? sql`${chatConversations.latitude}`,
        longitude: input.longitude ?? sql`${chatConversations.longitude}`,
        status: "open", unreadForAdmin: true, updatedAt: now, lastMessageAt: now,
      },
    }).returning({ id: chatConversations.id });
    if (!conversation) throw new Error("No se pudo crear la conversación.");
    const [saved] = await tx.insert(chatMessages).values({ conversationId: conversation.id, sender: "visitor", message: input.message, createdAt: now }).returning({ id: chatMessages.id });
    if (!saved) throw new Error("No se pudo guardar el mensaje.");
    return { conversationId: conversation.id, messageId: saved.id };
  });
}

export async function checkStoredHealth(): Promise<void> {
  if (isFileMode()) {
    await readLocal((state) => state.version);
    return;
  }
  const db = await postgres();
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`select 1`);
}

export function isFileStorageEnabled(): boolean {
  return isFileMode();
}


export async function recordStoredVisit(input: {
  visitorToken: string; deviceLabel: string; browserName: string; platformName: string; path: string;
  deviceType?: string; deviceModel?: string | null; locationLabel?: string; latitude?: number | null; longitude?: number | null;
}): Promise<void> {
  const values = {
    ...input,
    deviceType: input.deviceType || input.deviceLabel.split(" · ")[0] || "Dispositivo no identificado",
    deviceModel: input.deviceModel ?? null,
    locationLabel: input.locationLabel || "Ubicación no disponible",
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };
  if (isFileMode()) {
    await mutateLocal((state) => {
      const existing = state.siteVisits.find((visit) => visit.visitorToken === values.visitorToken);
      if (existing) {
        const savedLocation = existing.locationLabel;
        const savedLatitude = existing.latitude;
        const savedLongitude = existing.longitude;
        const savedModel = existing.deviceModel;
        Object.assign(existing, values, { visitedAt: new Date() });
        if (!input.deviceModel) existing.deviceModel = savedModel ?? null;
        if (input.latitude == null || input.longitude == null) {
          existing.latitude = savedLatitude ?? null;
          existing.longitude = savedLongitude ?? null;
          if (!input.locationLabel || input.locationLabel.startsWith("Ubicación no disponible")) {
            existing.locationLabel = savedLocation || "Ubicación no disponible";
          }
        }
      } else {
        state.siteVisits.push({ id: randomUUID(), ...values, visitedAt: new Date() });
        if (state.siteVisits.length > 2000) state.siteVisits.splice(0, state.siteVisits.length - 2000);
      }
      const chat = state.chatConversations.find((item) => item.visitorToken === values.visitorToken);
      if (chat) {
        if (input.locationLabel && !input.locationLabel.startsWith("Ubicación no disponible")) chat.locationLabel = input.locationLabel;
        if (input.latitude != null && input.longitude != null) {
          chat.latitude = input.latitude;
          chat.longitude = input.longitude;
        }
        if (input.deviceModel) chat.deviceModel = input.deviceModel;
      }
    });
    return;
  }
  const db = await postgres();
  await db.insert(siteVisits).values(values).onConflictDoUpdate({
    target: siteVisits.visitorToken,
    set: {
      deviceLabel: values.deviceLabel, browserName: values.browserName, platformName: values.platformName,
      deviceType: values.deviceType,
      deviceModel: values.deviceModel ?? sql`${siteVisits.deviceModel}`,
      locationLabel: values.locationLabel.startsWith("Ubicación no disponible") ? sql`${siteVisits.locationLabel}` : values.locationLabel,
      latitude: values.latitude ?? sql`${siteVisits.latitude}`,
      longitude: values.longitude ?? sql`${siteVisits.longitude}`,
      path: values.path, visitedAt: new Date(),
    },
  });
  // If the visitor shares a coarse location from the visit banner, mirror it
  // to the corresponding chat so the admin sees the same consented context.
  if (values.latitude !== null && values.longitude !== null) {
    await db.update(chatConversations).set({
      locationLabel: values.locationLabel,
      latitude: values.latitude,
      longitude: values.longitude,
    }).where(eq(chatConversations.visitorToken, values.visitorToken));
  }
}

export async function listStoredVisits(): Promise<SiteVisitRow[]> {
  if (isFileMode()) return readLocal((state) => state.siteVisits.slice()
    .sort((a, b) => asDate(b.visitedAt).getTime() - asDate(a.visitedAt).getTime()).slice(0, 250)
    .map((row) => ({ ...row, visitedAt: asDate(row.visitedAt) })));
  const db = await postgres();
  return db.select().from(siteVisits).orderBy(desc(siteVisits.visitedAt)).limit(250);
}

/** Limpia únicamente el registro de visitas/dispositivos; no toca conversaciones ni mensajes. */
export async function clearStoredVisits(): Promise<void> {
  if (isFileMode()) return mutateLocal((state) => { state.siteVisits = []; });
  const db = await postgres();
  await db.delete(siteVisits);
}


function normalizeNewsRow(row: NewsArticleRow): NewsArticleRow {
  return { ...row, createdAt: asDate(row.createdAt), updatedAt: asDate(row.updatedAt), publishedAt: row.publishedAt ? asDate(row.publishedAt) : null };
}

export async function listStoredNews(): Promise<NewsArticleRow[]> {
  if (isFileMode()) return readLocal((state) => state.newsArticles.slice()
    .sort((a, b) => asDate(b.updatedAt).getTime() - asDate(a.updatedAt).getTime()).map(normalizeNewsRow));
  const db = await postgres();
  return (await db.select().from(newsArticles).orderBy(desc(newsArticles.updatedAt)).limit(300)).map(normalizeNewsRow);
}

export async function listPublishedNews(): Promise<NewsArticleRow[]> {
  if (isFileMode()) return readLocal((state) => state.newsArticles.filter((article) => article.status === "published")
    .slice().sort((a, b) => asDate(b.publishedAt ?? b.updatedAt).getTime() - asDate(a.publishedAt ?? a.updatedAt).getTime()).map(normalizeNewsRow));
  const db = await postgres();
  return (await db.select().from(newsArticles).where(eq(newsArticles.status, "published")).orderBy(desc(newsArticles.publishedAt)).limit(100)).map(normalizeNewsRow);
}

export async function getPublishedNewsBySlug(slug: string): Promise<NewsArticleRow | null> {
  if (isFileMode()) return readLocal((state) => {
    const row = state.newsArticles.find((article) => article.slug === slug && article.status === "published");
    return row ? normalizeNewsRow(row) : null;
  });
  const db = await postgres();
  const [row] = await db.select().from(newsArticles).where(eq(newsArticles.slug, slug)).limit(1);
  return row?.status === "published" ? normalizeNewsRow(row) : null;
}

export async function createStoredNews(input: NewsArticleInput): Promise<NewsArticleRow> {
  const now = new Date();
  const values = { slug: input.slug, title: input.title, excerpt: input.excerpt, coverImage: input.coverImage, blocks: input.blocks,
    status: input.status, updatedAt: now, publishedAt: input.status === "published" ? now : null };
  if (isFileMode()) return mutateLocal((state) => {
    const row: NewsArticleRow = { id: randomUUID(), ...values, createdAt: now };
    state.newsArticles.push(row);
    return normalizeNewsRow(row);
  });
  const db = await postgres();
  const [row] = await db.insert(newsArticles).values(values).returning();
  if (!row) throw new Error("No se pudo guardar la noticia.");
  return normalizeNewsRow(row);
}

export async function updateStoredNews(id: string, input: NewsArticleInput): Promise<NewsArticleRow | null> {
  const now = new Date();
  if (isFileMode()) return mutateLocal((state) => {
    const index = state.newsArticles.findIndex((article) => article.id === id);
    if (index < 0) return null;
    const current = state.newsArticles[index];
    const row: NewsArticleRow = { ...current, slug: input.slug, title: input.title, excerpt: input.excerpt, coverImage: input.coverImage,
      blocks: input.blocks, status: input.status, updatedAt: now, publishedAt: input.status === "published" ? (current.publishedAt ?? now) : null };
    state.newsArticles[index] = row;
    return normalizeNewsRow(row);
  });
  const db = await postgres();
  const [row] = await db.update(newsArticles).set({ slug: input.slug, title: input.title, excerpt: input.excerpt,
    coverImage: input.coverImage, blocks: input.blocks, status: input.status, updatedAt: now,
    publishedAt: input.status === "published" ? now : null }).where(eq(newsArticles.id, id)).returning();
  return row ? normalizeNewsRow(row) : null;
}

export async function deleteStoredNews(id: string): Promise<void> {
  if (isFileMode()) return mutateLocal((state) => { state.newsArticles = state.newsArticles.filter((article) => article.id !== id); });
  const db = await postgres();
  await db.delete(newsArticles).where(eq(newsArticles.id, id));
}
