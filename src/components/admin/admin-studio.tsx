"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, CheckCheck, CheckCircle2, ChevronDown,
  ChevronRight, ChevronUp, CircleAlert, CodeXml, Eye, GraduationCap, Inbox, Layers,
  LayoutDashboard, LoaderCircle, LogOut, Mail, Menu, RefreshCw, Save, Settings2, ShieldCheck,
  Trash2, UserRound, X, MessageCircle, Send, Headset, Search, CircleDot, CheckCircle,
  Bell, BellRing, Download, Monitor, Smartphone, Newspaper, MapPin,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ConfirmDialog, type Confirmation } from "@/components/admin/fields";
import { EducationForm, ExperienceForm, ProfileForm, ProjectsForm, SettingsForm, SkillsForm } from "@/components/admin/resume-forms";
import { defaultTheme, normalizeResume, themeCssVariables, validateResume, type ResumeData } from "@/lib/resume";
import NewsManager from "@/components/admin/news-manager";

type Tab = "dashboard" | "profile" | "experience" | "projects" | "skills" | "education" | "messages" | "chat" | "visits" | "news" | "settings";
type Message = { id: string; name: string; email: string; message: string; read: boolean; createdAt: string };
type ChatConversation = { id: string; name: string; email: string; status: "open" | "closed"; unreadForAdmin: boolean; unreadForVisitor: boolean; lastMessageAt: string; deviceLabel?: string; browserName?: string; platformName?: string; deviceType?: string; deviceModel?: string | null; locationLabel?: string; latitude?: number | null; longitude?: number | null };
type SiteVisit = { id: string; deviceLabel: string; browserName: string; platformName: string; deviceType?: string; deviceModel?: string | null; locationLabel?: string; latitude?: number | null; longitude?: number | null; path: string; visitedAt: string };
type ChatMessageRecord = { id: string; conversationId: string; sender: "visitor" | "admin"; message: string; createdAt: string };
const tabs = [
  { id: "dashboard" as const, label: "Resumen", icon: LayoutDashboard },
  { id: "profile" as const, label: "Perfil e imágenes", icon: UserRound },
  { id: "experience" as const, label: "Experiencia", icon: BriefcaseBusiness },
  { id: "projects" as const, label: "Proyectos", icon: Layers },
  { id: "skills" as const, label: "Habilidades", icon: CodeXml },
  { id: "education" as const, label: "Formación e idiomas", icon: GraduationCap },
  { id: "messages" as const, label: "Mensajes", icon: Inbox },
  { id: "chat" as const, label: "Chat en vivo", icon: MessageCircle },
  { id: "visits" as const, label: "Dispositivos y visitas", icon: Monitor },
  { id: "news" as const, label: "Noticias", icon: Newspaper },
  { id: "settings" as const, label: "Configuración", icon: Settings2 },
];
const headings: Record<Tab, { title: string; description: string; kicker: string }> = {
  dashboard: { title: "Tu historia, en tus manos.", description: "Todo lo que necesitas para presentar tu mejor versión.", kicker: "BIENVENIDO A TU ESPACIO" },
  profile: { title: "Lo que te hace único.", description: "Tu foto, tu presentación y las formas de conectar contigo.", kicker: "PERFIL E IMÁGENES" },
  experience: { title: "Un recorrido que cuenta.", description: "Comparte tus puestos, responsabilidades y logros.", kicker: "EXPERIENCIA PROFESIONAL" },
  projects: { title: "Dale espacio a tus ideas.", description: "Muestra tus proyectos, tecnologías, imágenes y enlaces.", kicker: "PORTAFOLIO DE PROYECTOS" },
  skills: { title: "Tus herramientas, tu potencial.", description: "Organiza tus tecnologías y personaliza tu nivel de dominio.", kicker: "HABILIDADES TÉCNICAS" },
  education: { title: "Siempre hay algo por aprender.", description: "Gestiona estudios, certificaciones e idiomas.", kicker: "FORMACIÓN Y CRECIMIENTO" },
  messages: { title: "El comienzo de algo bueno.", description: "Las conversaciones que llegan desde tu portafolio.", kicker: "TU BANDEJA DE ENTRADA" },
  chat: { title: "Conversa en directo.", description: "Responde a las personas interesadas en trabajar contigo desde tu portafolio.", kicker: "CHAT EN VIVO" },
  visits: { title: "Quién visita tu portafolio.", description: "Consulta dispositivo, sistema, navegador y ubicación aproximada cuando el visitante la comparte.", kicker: "ACTIVIDAD DEL PORTAFOLIO" },
  news: { title: "Noticias para tus visitantes.", description: "Publica artículos con texto, imágenes, galerías y vídeos para compartir información de interés.", kicker: "CONTENIDO Y NOTICIAS" },
  settings: { title: "Cada detalle, a tu manera.", description: "Visibilidad, buscadores y copias de tu contenido.", kicker: "CONFIGURACIÓN DEL CV" },
};
const draftKey = "devfolio_admin_draft_v1";

export default function AdminStudio({ initialData, demo }: { initialData: ResumeData; demo: boolean }) {
  const [data, setData] = useState<ResumeData>(initialData);
  const [saved, setSaved] = useState<ResumeData>(initialData);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messageBusy, setMessageBusy] = useState("");
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [chatConversationsLoading, setChatConversationsLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessageRecord[]>([]);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatFilter, setChatFilter] = useState("all");
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const router = useRouter();
  const initialized = useRef(false);
  const knownMessageIds = useRef<Set<string> | null>(null);
  const knownChatActivity = useRef<Map<string, string> | null>(null);
  const knownThreadMessages = useRef<Map<string, Set<string>>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const dirty = JSON.stringify(data) !== JSON.stringify(saved);
  const unread = messages.filter((message) => !message.read).length;
  const chatUnread = chatConversations.filter((conversation) => conversation.unreadForAdmin).length;
  const notify = useCallback((message: string, error = false) => setToast({ message, error }), []);
  const playAdminAlert = useCallback((title: string, body: string, target: "messages" | "chat" = "chat") => {
    if (!alertsEnabled) return;
    try {
      const AudioContextCtor = window.AudioContext;
      if (AudioContextCtor) {
        const context = audioContextRef.current ?? new AudioContextCtor();
        audioContextRef.current = context;
        void context.resume().then(() => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, context.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.16);
          gain.gain.setValueAtTime(0.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
          oscillator.connect(gain); gain.connect(context.destination);
          oscillator.start(); oscillator.stop(context.currentTime + 0.23);
        }).catch(() => undefined);
      }
    } catch { /* Sound is optional when the browser blocks audio. */ }
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(title, { body, icon: "/icon.svg", tag: `devfolio-${Date.now()}` });
        notification.onclick = () => { window.focus(); window.location.assign(`/admin?tab=${target}`); notification.close(); };
      }
    } catch { /* Desktop notifications are optional. */ }
    notify(body);
  }, [alertsEnabled, notify]);
  async function toggleAdminAlerts() {
    if (alertsEnabled) {
      setAlertsEnabled(false);
      notify("Avisos desactivados.");
      return;
    }
    await enableAdminAlerts();
  }
  async function enableAdminAlerts() {
    try {
      if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
      const AudioContextCtor = window.AudioContext;
      if (AudioContextCtor) {
        const context = audioContextRef.current ?? new AudioContextCtor();
        audioContextRef.current = context;
        await context.resume();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 740;
        gain.gain.value = 0.08;
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(); oscillator.stop(context.currentTime + 0.12);
      }
      setAlertsEnabled(true);
      notify("Avisos activados: sonido y notificaciones del navegador cuando estén permitidas.");
    } catch {
      notify("El navegador no permitió activar el sonido. Revisa los permisos del sitio.", true);
    }
  }
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const requested = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the requested admin tab after client hydration.
    if (tabs.some((t) => t.id === requested)) setTab(requested as Tab);
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const draft: unknown = JSON.parse(stored);
        if (validateResume(draft) && JSON.stringify(draft) !== JSON.stringify(initialData)) { setData(normalizeResume(draft)); notify("Tu borrador se ha recuperado. Guarda para publicarlo."); }
      }
    } catch { /* A browser without storage can still edit and publish. */ }
  }, [initialData, notify]);

  useEffect(() => {
    try { if (dirty) localStorage.setItem(draftKey, JSON.stringify(data)); else localStorage.removeItem(draftKey); } catch { /* Storage is optional. */ }
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [data, dirty]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 6000); return () => clearTimeout(timer); }, [toast]);

  const messagesRequestInFlight = useRef(false);
  const refreshMessages = useCallback(async (silent = false) => {
    if (messagesRequestInFlight.current) return;
    messagesRequestInFlight.current = true;
    if (!silent) setMessagesLoading(true);
    try {
      const response = await fetch("/api/admin/messages", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "No se pudo cargar la bandeja de entrada.";
        throw new Error(message);
      }
      if (!Array.isArray(result)) throw new Error("El servidor devolvió una respuesta no válida para la bandeja de entrada.");
      const nextMessages = result as Message[];
      if (knownMessageIds.current === null) {
        knownMessageIds.current = new Set(nextMessages.map((message) => message.id));
      } else {
        const fresh = nextMessages.filter((message) => !message.read && !knownMessageIds.current?.has(message.id));
        if (fresh.length) playAdminAlert("Nuevo mensaje del portafolio", `${fresh[0].name}: ${fresh[0].message.slice(0, 110)}`, "messages");
        const ids = new Set(knownMessageIds.current);
        nextMessages.forEach((message) => ids.add(message.id));
        knownMessageIds.current = ids;
      }
      setMessages(nextMessages);
    } catch (err) {
      if (!silent) notify(err instanceof Error ? err.message : "No se pudieron cargar los mensajes.", true);
    } finally {
      messagesRequestInFlight.current = false;
      if (!silent) setMessagesLoading(false);
    }
  }, [notify, playAdminAlert]);

  // Load once, then keep the unread badge and inbox in sync while the admin is open.
  // Refresh again when the admin returns to the browser tab after switching apps.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch results synchronize the inbox with the server.
    void refreshMessages();
    const interval = window.setInterval(() => { void refreshMessages(true); }, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshMessages(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshMessages]);

  const chatListInFlight = useRef(false);
  const refreshChatList = useCallback(async (silent = false) => {
    if (chatListInFlight.current) return;
    chatListInFlight.current = true;
    if (!silent) setChatConversationsLoading(true);
    try {
      const response = await fetch("/api/admin/chat", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) throw new Error(result?.error || "No se pudieron cargar las conversaciones.");
      const next = result as ChatConversation[];
      if (knownChatActivity.current === null) {
        knownChatActivity.current = new Map(next.map((item) => [item.id, item.lastMessageAt]));
      } else {
        let newest: ChatConversation | null = null;
        for (const item of next) {
          const previous = knownChatActivity.current.get(item.id);
          if (item.id !== selectedChatId && item.unreadForAdmin && (!previous || previous !== item.lastMessageAt)) newest = item;
        }
        if (newest) playAdminAlert("Nuevo mensaje en el chat", `${newest.name} · ${newest.deviceLabel || "Dispositivo no identificado"}`);
        knownChatActivity.current = new Map(next.map((item) => [item.id, item.lastMessageAt]));
      }
      setChatConversations(next);
    } catch (err) {
      if (!silent) notify(err instanceof Error ? err.message : "No se pudo cargar el chat.", true);
    } finally {
      chatListInFlight.current = false;
      if (!silent) setChatConversationsLoading(false);
    }
  }, [notify, playAdminAlert, selectedChatId]);

  const refreshChatThread = useCallback(async (id: string, silent = false) => {
    if (!id) return;
    if (!silent) setChatMessagesLoading(true);
    try {
      const response = await fetch(`/api/admin/chat?conversationId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo abrir la conversación.");
      if (id !== selectedChatId) return;
      const nextMessages = Array.isArray(result.messages) ? result.messages as ChatMessageRecord[] : [];
      const known = knownThreadMessages.current.get(id);
      if (!known) knownThreadMessages.current.set(id, new Set(nextMessages.map((message) => message.id)));
      else {
        const incoming = nextMessages.filter((message) => message.sender === "visitor" && !known.has(message.id));
        if (incoming.length) playAdminAlert("Nuevo mensaje de visitante", incoming[incoming.length - 1].message.slice(0, 120));
        nextMessages.forEach((message) => known.add(message.id));
      }
      setChatMessages(nextMessages);
      setChatConversations((items) => items.map((item) => item.id === id ? { ...item, unreadForAdmin: false } : item));
    } catch (err) {
      if (!silent) notify(err instanceof Error ? err.message : "No se pudo abrir la conversación.", true);
    } finally {
      if (!silent) setChatMessagesLoading(false);
    }
  }, [notify, playAdminAlert, selectedChatId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize the live inbox with persisted server conversations.
    void refreshChatList();
    const interval = window.setInterval(() => { void refreshChatList(true); }, 4000);
    const handleVisibility = () => { if (document.visibilityState === "visible") void refreshChatList(true); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [refreshChatList]);

  useEffect(() => {
    if (!selectedChatId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load the selected persisted conversation.
    void refreshChatThread(selectedChatId);
    const interval = window.setInterval(() => { void refreshChatThread(selectedChatId, true); }, 2300);
    return () => window.clearInterval(interval);
  }, [selectedChatId, refreshChatThread]);


  const visitsInFlight = useRef(false);
  const refreshVisits = useCallback(async (silent = false) => {
    if (visitsInFlight.current) return;
    visitsInFlight.current = true;
    if (!silent) setVisitsLoading(true);
    try {
      const response = await fetch("/api/admin/visits", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) throw new Error(result?.error || "No se pudieron cargar las visitas.");
      setVisits(result as SiteVisit[]);
    } catch (err) {
      if (!silent) notify(err instanceof Error ? err.message : "No se pudieron cargar las visitas.", true);
    } finally {
      visitsInFlight.current = false;
      if (!silent) setVisitsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (tab !== "visits") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load visits only when their admin tab is opened.
    void refreshVisits();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshVisits(true);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [tab, refreshVisits]);

  async function sendChatReply(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const message = chatDraft.trim();
    if (!selectedChatId || !message || chatSending) return;
    setChatSending(true);
    try {
      const response = await fetch("/api/admin/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selectedChatId, message }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo enviar la respuesta.");
      setChatDraft("");
      await Promise.all([refreshChatThread(selectedChatId, true), refreshChatList(true)]);
    } catch (err) { notify(err instanceof Error ? err.message : "No se pudo enviar la respuesta.", true); }
    finally { setChatSending(false); }
  }

  async function setChatStatus(id: string, status: "open" | "closed") {
    try {
      const response = await fetch("/api/admin/chat", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar el estado.");
      setChatConversations((items) => items.map((item) => item.id === id ? { ...item, status } : item));
      notify(status === "closed" ? "Conversación cerrada." : "Conversación reabierta.");
    } catch (err) { notify(err instanceof Error ? err.message : "No se pudo actualizar el estado.", true); }
  }

  function deleteChatConversation(id: string) {
    const conversation = chatConversations.find((item) => item.id === id);
    if (!conversation) return;
    setConfirmation({
      title: "¿Eliminar esta conversación?",
      message: `Se eliminarán permanentemente el chat de ${conversation.name} y todos sus mensajes. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar conversación",
      onConfirm: () => { void (async () => {
        try {
          const response = await fetch(`/api/admin/chat?id=${encodeURIComponent(id)}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "No se pudo eliminar la conversación.");
          setChatConversations((items) => items.filter((item) => item.id !== id));
          knownThreadMessages.current.delete(id);
          if (selectedChatId === id) { setSelectedChatId(""); setChatMessages([]); setChatDraft(""); }
          notify("Conversación y mensajes eliminados.");
        } catch (err) { notify(err instanceof Error ? err.message : "No se pudo eliminar la conversación.", true); }
      })(); },
    });
  }

  function clearVisitHistory() {
    if (!visits.length) return;
    setConfirmation({
      title: "¿Limpiar el registro de dispositivos?",
      message: `Se eliminarán ${visits.length} registros de visitas del panel. No se borrarán conversaciones ni mensajes del chat.`,
      confirmLabel: "Limpiar visitas",
      onConfirm: () => { void (async () => {
        try {
          const response = await fetch("/api/admin/visits", { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "No se pudo limpiar el registro.");
          setVisits([]);
          notify("Registro de visitas limpiado. Las próximas visitas volverán a registrarse.");
        } catch (err) { notify(err instanceof Error ? err.message : "No se pudo limpiar el registro.", true); }
      })(); },
    });
  }

  function goTab(next: Tab) {
    setTab(next);
    setMobileMenu(false);
    if (next === "messages") void refreshMessages();
    if (next === "chat") void refreshChatList();
    if (next === "visits") void refreshVisits();
    window.history.replaceState(null, "", `/admin${next === "dashboard" ? "" : `?tab=${next}`}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save() {
    if (!validateResume(data)) { notify("Revisa nombre, cargo, email, enlaces HTTPS y colores HEX (#RRGGBB).", true); return; }
    const snapshot = structuredClone(data);
    setSaving(true);
    try {
      const response = await fetch("/api/resume", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el CV.");
      setSaved(snapshot); setLastSaved(new Date()); notify("Cambios publicados. Tu CV y tu PDF ya están actualizados."); router.refresh();
    } catch (err) { notify(err instanceof Error ? err.message : "No se pudieron guardar los cambios.", true); }
    finally { setSaving(false); }
  }
  function preview() {
    if (!validateResume(data)) { notify("Completa nombre, cargo, email y enlaces antes de abrir la vista previa.", true); return; }
    try { localStorage.setItem("devfolio_preview", JSON.stringify(data)); window.open("/preview", "_blank", "noopener,noreferrer"); }
    catch { notify("Tu navegador no permite guardar la vista previa. Puedes consultar el CV publicado.", true); }
  }
  async function logout() { await fetch("/api/auth", { method: "DELETE" }); router.push("/admin/login"); router.refresh(); }
  async function markRead(id: string, read: boolean) {
    setMessageBusy(id);
    try {
      const response = await fetch("/api/admin/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, read }) });
      if (!response.ok) throw new Error("No se pudo actualizar el mensaje.");
      setMessages((items) => items.map((m) => m.id === id ? { ...m, read } : m));
    } catch (err) { notify(err instanceof Error ? err.message : "No se pudo actualizar el mensaje.", true); }
    finally { setMessageBusy(""); }
  }
  function removeMessage(id: string) {
    setConfirmation({ title: "¿Eliminar este mensaje?", message: "Esta acción es permanente. Si quieres conservar la conversación, responde por email antes de eliminarla.", onConfirm: () => { void (async () => {
      setMessageBusy(id);
      try {
        const response = await fetch(`/api/admin/messages?id=${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("No se pudo eliminar el mensaje.");
        setMessages((items) => items.filter((m) => m.id !== id)); notify("Mensaje eliminado.");
      } catch (err) { notify(err instanceof Error ? err.message : "No se pudo eliminar el mensaje.", true); }
      finally { setMessageBusy(""); }
    })(); } });
  }
  function discard() { setConfirmation({ title: "¿Descartar el borrador?", message: "Volverás a la última versión publicada. Los cambios que no hayas guardado se perderán.", confirmLabel: "Descartar", onConfirm: () => { setData(structuredClone(saved)); setFormVersion((v) => v + 1); notify("Borrador descartado. Estás viendo tu última versión publicada."); } }); }
  const formProps = { data, setData, ask: setConfirmation, notify };
  const heading = headings[tab];

  return <div className="admin-app" style={themeCssVariables(data.settings.theme ?? defaultTheme)}>
    {mobileMenu && <button className="mobile-backdrop" aria-label="Cerrar navegación" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar admin-sidebar ${mobileMenu ? "sidebar-open" : ""}`}><Link href="/admin" className="brand-link"><Brand studio /></Link><div className="sidebar-section-label">TU CV, BAJO CONTROL</div><nav className="sidebar-nav" aria-label="Panel de administración">{tabs.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} className={`nav-item ${tab === id ? "active" : ""}`} onClick={() => goTab(id)}><Icon size={17} strokeWidth={1.65} /><span>{label}</span>{id === "messages" && unread > 0 ? <span className="admin-nav-count">{unread}</span> : id === "chat" && chatUnread > 0 ? <span className="admin-nav-count">{chatUnread}</span> : tab === id && <span className="nav-active-dot" />}</button>)}</nav><div className="admin-sidebar-bottom"><Link className="public-link" href="/" target="_blank">Ver mi portafolio <ArrowUpRight size={15} /></Link><div className="admin-owner"><img src={data.profile.avatar || "/images/avatar-placeholder.svg"} alt="Tu perfil" /><div><strong>{data.profile.name}</strong><span>{demo ? "Administrador · Modo demo" : "Administrador"}</span></div>{!demo && <button aria-label="Cerrar sesión" onClick={() => void logout()}><LogOut size={16} /></button>}</div></div></aside>
    <div className="admin-main"><header className="topbar admin-topbar"><div className="topbar-left"><button className="mobile-menu-toggle" aria-label="Abrir navegación" onClick={() => setMobileMenu(true)}><Menu size={21} /></button><span className="breadcrumb-base">Mi espacio</span><ChevronRight size={12} /><span className="breadcrumb-current">{tabs.find((t) => t.id === tab)?.label}</span></div><div className="topbar-right"><span className="save-status">{dirty ? <CircleAlert size={12} /> : <Check size={12} />}{dirty ? "Cambios sin publicar" : lastSaved ? `Guardado ${lastSaved.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : "Todo al día"}</span><button className="button button-outline preview-button" onClick={preview}><Eye size={14} />Vista previa</button><a className="button button-outline preview-button" href="/api/cv" download><Download size={14} />Descargar PDF</a><button className="button button-outline preview-button" onClick={() => void toggleAdminAlerts()} title={alertsEnabled ? "Desactivar avisos" : "Activar avisos de sonido y escritorio"}><BellRing size={14} />{alertsEnabled ? "Desactivar avisos" : "Activar avisos"}</button><button className="button button-primary" disabled={saving || !dirty} onClick={() => void save()}>{saving ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}{saving ? "Guardando…" : "Guardar cambios"}</button></div></header><main className="admin-content"><div className="admin-page-heading"><div><span className="eyebrow">{heading.kicker}</span><h1>{tab === "dashboard" ? `Hola, ${data.profile.name.split(" ")[0] || "developer"}.` : heading.title}</h1><p>{heading.description}</p></div>{demo && <span className="demo-badge">MODO DEMO</span>}</div>
      {tab === "dashboard" && <Dashboard data={data} goTab={goTab} preview={preview} unread={unread} chatUnread={chatUnread} loading={messagesLoading} />}
      <div key={`${tab}-${formVersion}`}>
        {tab === "profile" && <ProfileForm {...formProps} />}
        {tab === "experience" && <ExperienceForm {...formProps} />}
        {tab === "projects" && <ProjectsForm {...formProps} />}
        {tab === "skills" && <SkillsForm {...formProps} />}
        {tab === "education" && <EducationForm {...formProps} />}
        {tab === "settings" && <SettingsForm {...formProps} demo={demo} />}
      </div>
      {tab === "messages" && <Messages messages={messages} loading={messagesLoading} busy={messageBusy} refresh={refreshMessages} onRead={markRead} onDelete={removeMessage} />}
      {tab === "visits" && <VisitsPanel visits={visits} loading={visitsLoading} refresh={() => refreshVisits()} onClear={clearVisitHistory} />}
      {tab === "news" && <NewsManager />}
      {tab === "chat" && <ChatInbox conversations={chatConversations} loading={chatConversationsLoading} selectedId={selectedChatId} select={(id) => { setSelectedChatId(id); void refreshChatThread(id); }} messages={chatMessages} messagesLoading={chatMessagesLoading} draft={chatDraft} setDraft={setChatDraft} sending={chatSending} send={sendChatReply} refresh={() => refreshChatList()} setStatus={setChatStatus} filter={chatFilter} setFilter={setChatFilter} onDelete={deleteChatConversation} />}
      {dirty && tab !== "dashboard" && tab !== "messages" && tab !== "chat" && <div className="draft-footer"><span><CircleAlert size={13} /> Tienes cambios pendientes de publicar.</span><button onClick={discard}>Descartar borrador</button><button className="button button-primary" disabled={saving} onClick={() => void save()}><Save size={14} />{saving ? "Guardando…" : "Guardar cambios"}</button></div>}
    </main></div>
    <ConfirmDialog value={confirmation} close={() => setConfirmation(null)} />
    {toast && <div className={`toast ${toast.error ? "error" : ""}`} role={toast.error ? "alert" : "status"}>{toast.error ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}<span>{toast.message}</span><button aria-label="Cerrar notificación" onClick={() => setToast(null)}><X size={14} /></button></div>}
  </div>;
}

function Dashboard({ data, goTab, preview, unread, chatUnread, loading }: { data: ResumeData; goTab: (tab: Tab) => void; preview: () => void; unread: number; chatUnread: number; loading: boolean }) {
  const stats = [
    { label: "Experiencias", count: data.experience.length, detail: "Etapas de tu trayectoria", icon: BriefcaseBusiness, tab: "experience" as Tab },
    { label: "Proyectos", count: data.projects.length, detail: "Ideas hechas realidad", icon: Layers, tab: "projects" as Tab },
    { label: "Habilidades", count: data.skills.length, detail: "Herramientas para crear", icon: CodeXml, tab: "skills" as Tab },
    { label: "Mensajes nuevos", count: loading ? "…" : unread, detail: "Formulario de contacto", icon: Inbox, tab: "messages" as Tab },
    { label: "Chats por responder", count: chatUnread, detail: "Chat en vivo", icon: MessageCircle, tab: "chat" as Tab },
  ];
  const cards = [
    { id: "profile" as Tab, title: "Mi perfil", detail: "Foto, portada y presentación", icon: UserRound },
    { id: "experience" as Tab, title: "Experiencia", detail: `${data.experience.length} etapas profesionales`, icon: BriefcaseBusiness },
    { id: "projects" as Tab, title: "Proyectos", detail: `${data.projects.length} ideas construidas`, icon: Layers },
    { id: "skills" as Tab, title: "Habilidades", detail: `${data.skills.length} tecnologías`, icon: CodeXml },
    { id: "education" as Tab, title: "Formación", detail: "Estudios, certificados e idiomas", icon: GraduationCap },
    { id: "chat" as Tab, title: "Chat en vivo", detail: `${chatUnread} conversaciones pendientes`, icon: MessageCircle },
    { id: "news" as Tab, title: "Noticias", detail: "Artículos, fotos, galerías y vídeos", icon: Newspaper },
    { id: "settings" as Tab, title: "Configuración", detail: "Secciones y preferencias", icon: Settings2 },
  ];
  return <><div className="welcome-banner"><div><span className="eyebrow"><span className="tiny-green-dot" /> TU CÓDIGO. TU HISTORIA.</span><h2>Buen código merece<br />una buena presentación.</h2><p>Tu siguiente oportunidad empieza con un CV que habla por ti.</p><button className="button button-light" onClick={() => goTab("profile")}>Personalizar mi perfil <ArrowUpRight size={14} /></button></div><div className="welcome-code"><CodeXml size={120} strokeWidth={.8} /></div></div><div className="admin-stats">{stats.map(({ label, count, detail, icon: Icon, tab }) => <button className="admin-stat" key={label} onClick={() => goTab(tab)} style={{ textAlign: "left", color: "inherit" }}><span className="admin-stat-icon"><Icon size={16} strokeWidth={1.5} /></span><span>{label}</span><strong>{count}</strong><small>{detail}</small></button>)}</div><div className="admin-dashboard-grid"><div><div className="admin-section-header"><h3>Todo lo que te hace único.</h3><span>LISTO PARA EDITAR</span></div><div className="management-grid">{cards.map(({ id, title, detail, icon: Icon }) => <button key={id} className="management-card" onClick={() => goTab(id)}><span className="management-icon"><Icon size={19} strokeWidth={1.5} /></span><div><strong>{title}</strong><small>{detail}</small></div><ChevronRight size={14} /></button>)}</div><div className="dashboard-note"><ShieldCheck size={16} /><span>Tú editas. Devfolio se encarga del resto. Guarda los cambios para actualizar tu portafolio y tu PDF al mismo tiempo.</span></div></div><div><div className="admin-section-header"><h3>Así te ve el mundo.</h3><span>TU PORTAFOLIO</span></div><div className="admin-preview-card"><div className="admin-mini-cover" style={{ backgroundImage: `url("${data.profile.cover}")` }} /><div className="admin-mini-profile"><img src={data.profile.avatar || "/images/avatar-placeholder.svg"} alt={`Perfil de ${data.profile.name}`} /><h3>{data.profile.name}</h3><p>{data.profile.role}</p><span className="availability"><span />{data.profile.available ? "Abierto a oportunidades" : "Construyendo nuevos retos"}</span><button className="button button-outline" onClick={preview}>Explorar mi CV <ArrowUpRight size={14} /></button></div></div></div></div></>;
}


function VisitsPanel({ visits, loading, refresh, onClear }: { visits: SiteVisit[]; loading: boolean; refresh: () => Promise<void>; onClear: () => void }) {
  return <section className="visits-panel">
    <div className="messages-toolbar"><div><strong>{visits.length} visitas registradas</strong><p className="visits-privacy-note">El sistema identifica tipo de equipo, sistema y navegador por los datos que el navegador permite compartir. La ubicación por IP es aproximada y depende de las cabeceras del hosting o de IPINFO_TOKEN; las coordenadas GPS solo se guardan si el visitante las autoriza. No se recopilan direcciones MAC ni se guarda la IP.</p></div><div className="visits-toolbar-actions"><button className="button button-outline" onClick={() => void refresh()} disabled={loading}><RefreshCw size={13} className={loading ? "spin" : ""} />Actualizar</button><button className="button button-danger" onClick={onClear} disabled={loading || !visits.length}><Trash2 size={13} />Limpiar registro</button></div></div>
    {loading && !visits.length ? <div className="admin-empty"><LoaderCircle size={25} className="spin" /><p>Cargando actividad…</p></div> : !visits.length ? <div className="admin-empty"><Monitor size={32} /><h3>Aún no hay visitas registradas.</h3><p>Las sesiones nuevas del portafolio aparecerán aquí cuando un visitante abra tu CV.</p></div> : <div className="visits-table-wrap"><table className="visits-table"><thead><tr><th>Dispositivo</th><th>Sistema / navegador</th><th>Ubicación aproximada</th><th>MAC</th><th>Página</th><th>Fecha</th></tr></thead><tbody>{visits.map((visit) => <tr key={visit.id}><td><strong><Monitor size={14} /> {visit.deviceLabel}</strong><small>{visit.deviceType || "Tipo no identificado"}{visit.deviceModel ? ` · ${visit.deviceModel}` : ""}</small></td><td>{visit.platformName}<small>{visit.browserName}</small></td><td>{visit.latitude !== null && visit.latitude !== undefined && visit.longitude !== null && visit.longitude !== undefined ? <a href={`https://www.openstreetmap.org/?mlat=${visit.latitude}&mlon=${visit.longitude}#map=13/${visit.latitude}/${visit.longitude}`} target="_blank" rel="noreferrer">GPS aprox. ↗</a> : <span>{visit.locationLabel || "No disponible"}</span>}</td><td><span title="Los navegadores no exponen la dirección MAC">No accesible</span></td><td><code>{visit.path}</code></td><td>{new Date(visit.visitedAt).toLocaleString("es-SV", { dateStyle: "medium", timeStyle: "short" })}</td></tr>)}</tbody></table></div>}
  </section>;
}

function Messages({ messages, loading, busy, refresh, onRead, onDelete }: { messages: Message[]; loading: boolean; busy: string; refresh: () => Promise<void>; onRead: (id: string, read: boolean) => Promise<void>; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState("Todos");
  const [expanded, setExpanded] = useState("");
  const visible = messages.filter((m) => filter === "Todos" || !m.read);
  return <><div className="messages-toolbar"><div className="project-filters">{["Todos", "No leídos"].map((label) => <button className={filter === label ? "selected" : ""} key={label} onClick={() => setFilter(label)}>{label}<span>{label === "Todos" ? messages.length : messages.filter((m) => !m.read).length}</span></button>)}</div><span className="messages-auto-refresh">Actualización automática cada 15 s</span><button className="button button-outline" onClick={() => void refresh()} disabled={loading}><RefreshCw size={13} className={loading ? "spin" : ""} />Actualizar</button></div>{loading ? <div className="admin-empty"><LoaderCircle size={25} className="spin" /><p>Cargando conversaciones…</p></div> : !visible.length ? <div className="admin-empty"><Inbox size={34} strokeWidth={1.15} /><h3>{filter === "Todos" ? "Las buenas conversaciones están por llegar." : "Todo al día."}</h3><p>{filter === "Todos" ? "Los mensajes enviados desde tu CV aparecerán aquí. Comparte tu portafolio y empieza a conectar." : "No tienes mensajes pendientes de leer."}</p><Link href="/" target="_blank" className="button button-outline">Ver mi portafolio <ArrowUpRight size={14} /></Link></div> : visible.map((message) => <article className={`message-card ${!message.read ? "unread" : ""}`} key={message.id}><button className="message-summary" aria-expanded={expanded === message.id} onClick={() => setExpanded(expanded === message.id ? "" : message.id)}><span className="message-avatar">{message.name.slice(0, 1).toUpperCase()}</span><div><div className="message-name-row"><strong>{message.name}</strong>{!message.read && <span className="message-new">NUEVO</span>}</div><p>{message.message}</p></div><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}</time>{expanded === message.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>{expanded === message.id && <div className="message-detail"><a href={`mailto:${message.email}`} className="message-email"><Mail size={13} />{message.email}</a><p>{message.message}</p><div className="message-actions"><a href={`mailto:${message.email}?subject=${encodeURIComponent("Sobre tu mensaje en mi portafolio")}`} className="button button-primary">Responder <ArrowUpRight size={13} /></a><button className="button button-outline" disabled={busy === message.id} onClick={() => void onRead(message.id, !message.read)}>{busy === message.id ? <LoaderCircle size={13} className="spin" /> : <CheckCheck size={13} />}{message.read ? "Marcar no leído" : "Marcar leído"}</button><button className="icon-button" aria-label="Eliminar mensaje" disabled={busy === message.id} onClick={() => onDelete(message.id)}><Trash2 size={13} /></button></div></div>}</article>)}</>;
}


function ChatInbox({ conversations, loading, selectedId, select, messages, messagesLoading, draft, setDraft, sending, send, refresh, setStatus, filter, setFilter, onDelete }: {
  conversations: ChatConversation[]; loading: boolean; selectedId: string; select: (id: string) => void;
  messages: ChatMessageRecord[]; messagesLoading: boolean; draft: string; setDraft: (value: string) => void;
  sending: boolean; send: (event?: React.FormEvent<HTMLFormElement>) => Promise<void>; refresh: () => Promise<void>;
  setStatus: (id: string, status: "open" | "closed") => Promise<void>;
  filter: string; setFilter: (value: string) => void; onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastConversationRef = useRef(selectedId);
  const shouldStickToBottom = useRef(true);
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastConversationRef.current !== selectedId) {
      lastConversationRef.current = selectedId;
      lastMessageIdRef.current = null;
      shouldStickToBottom.current = true;
    }
    if (!lastMessage || lastMessage.id === lastMessageIdRef.current) return;
    const firstLoad = lastMessageIdRef.current === null;
    lastMessageIdRef.current = lastMessage.id;
    if (!firstLoad && !shouldStickToBottom.current) return;
    const container = messageAreaRef.current;
    if (container) requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  }, [messages, selectedId]);
  const filtered = conversations.filter((item) => {
    const matches = `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase());
    return matches && (filter === "all" || (filter === "open" ? item.status === "open" : item.unreadForAdmin));
  });
  const selected = conversations.find((item) => item.id === selectedId);
  return <div className="admin-chat-layout">
    <aside className="admin-chat-list">
      <div className="admin-chat-list-head"><div><strong>Conversaciones</strong><span>{conversations.length} en total</span></div><button className="icon-button" aria-label="Actualizar chats" onClick={() => void refresh()}><RefreshCw size={15} className={loading ? "spin" : ""} /></button></div>
      <label className="admin-chat-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar persona o correo" /></label>
      <div className="admin-chat-filters"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Todas</button><button className={filter === "open" ? "selected" : ""} onClick={() => setFilter("open")}>Abiertas</button><button className={filter === "unread" ? "selected" : ""} onClick={() => setFilter("unread")}>Nuevas</button></div>
      <div className="admin-chat-items">{loading && !conversations.length ? <div className="admin-chat-placeholder"><LoaderCircle className="spin" size={22} />Cargando conversaciones…</div> : !filtered.length ? <div className="admin-chat-placeholder"><MessageCircle size={25} /><span>Aún no hay chats. Cuando alguien escriba desde el CV, aparecerá aquí.</span></div> : filtered.map((item) => <button key={item.id} className={`admin-chat-person ${selectedId === item.id ? "active" : ""} ${item.unreadForAdmin ? "unread" : ""}`} onClick={() => select(item.id)}><span className="admin-chat-avatar">{item.name.slice(0, 1).toUpperCase()}</span><span className="admin-chat-person-text"><span><strong>{item.name}</strong><time>{new Date(item.lastMessageAt).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" })}</time></span><small>{item.email}</small><small className="chat-device-label"><Monitor size={11} /> {item.deviceLabel || "Dispositivo no identificado"} · {item.platformName || "Sistema no identificado"}</small><em>{item.status === "closed" ? "Cerrada" : "En conversación"}</em></span>{item.unreadForAdmin && <i className="admin-chat-unread-dot" />}</button>)}</div>
    </aside>
    <section className="admin-chat-thread">
      {!selected ? <div className="admin-chat-no-selection"><Headset size={38} /><h3>Tu canal directo de oportunidades.</h3><p>Selecciona una conversación para responder en tiempo real. Mantén este panel abierto mientras atiendes a tus visitantes.</p></div> : <>
        <header className="admin-chat-thread-head"><span className="admin-chat-avatar large">{selected.name.slice(0, 1).toUpperCase()}</span><div><strong>{selected.name}</strong><a href={`mailto:${selected.email}`}>{selected.email}</a><small className="chat-device-label"><Monitor size={11} /> {selected.deviceLabel || "Dispositivo no identificado"} · {selected.platformName || "Sistema no identificado"}</small><small className="chat-device-label"><MapPin size={11} /> {selected.locationLabel || "Ubicación no disponible"}{selected.deviceModel ? ` · ${selected.deviceModel}` : ""}</small><small className="chat-device-label">MAC: no accesible desde el navegador</small></div><span className={`admin-chat-status ${selected.status}`}>{selected.status === "open" ? <><CircleDot size={11} /> Abierta</> : "Cerrada"}</span><div className="admin-chat-thread-actions"><button className="button button-outline" onClick={() => void setStatus(selected.id, selected.status === "open" ? "closed" : "open")}>{selected.status === "open" ? "Cerrar chat" : "Reabrir chat"}</button><button type="button" className="button button-danger" onClick={() => onDelete(selected.id)}><Trash2 size={13} />Eliminar chat</button></div></header>
        <div ref={messageAreaRef} className="admin-chat-message-area" onScroll={(event) => { const element = event.currentTarget; shouldStickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96; }}>{messagesLoading && !messages.length ? <div className="admin-chat-placeholder"><LoaderCircle className="spin" size={22} />Cargando mensajes…</div> : messages.map((message) => <article className={`admin-chat-message ${message.sender === "admin" ? "outgoing" : "incoming"}`} key={message.id}><span>{message.sender === "admin" ? "Tú" : selected.name}</span><p>{message.message}</p><time>{new Date(message.createdAt).toLocaleDateString("es-SV", { day: "2-digit", month: "short" })} · {new Date(message.createdAt).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" })}</time></article>)}</div>
        <form className="admin-chat-reply" onSubmit={(event) => void send(event)}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribe tu respuesta…" rows={2} maxLength={3000} disabled={selected.status === "closed"} /><button className="button button-primary" type="submit" disabled={sending || !draft.trim() || selected.status === "closed"}>{sending ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}Enviar</button><small>{selected.status === "closed" ? "Reabre la conversación para responder." : "La respuesta aparecerá en el chat del visitante en unos segundos."}</small></form>
      </>}
    </section>
  </div>;
}
