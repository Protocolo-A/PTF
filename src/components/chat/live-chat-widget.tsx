"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X, Headset, CheckCircle2, Circle, LoaderCircle, Minimize2, BellRing } from "lucide-react";
import { createClientUuid } from "@/lib/client-id";

type ChatMessage = { id: string; sender: "visitor" | "admin"; message: string; createdAt: string };
type Conversation = { id: string; name: string; email: string; status: string };
const tokenKey = "devfolio_live_chat_token_v1";
const identityKey = "devfolio_live_chat_identity_v1";
const alertsKey = "devfolio_live_chat_alerts_v1";

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
}

export function LiveChatWidget({ developerName }: { developerName: string }) {
  const [open, setOpen] = useState(false);
  const [visitorToken, setVisitorToken] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const lastRenderedMessageId = useRef<string | null>(null);
  const shouldStickToBottom = useRef(true);
  const requestBusy = useRef(false);
  const openRef = useRef(false);
  const knownMessageIds = useRef<Set<string> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // LAN HTTP origins (for example http://192.168.x.x) are not secure
    // contexts, so crypto.randomUUID() may be unavailable there. The shared
    // helper falls back to a cryptographically-random RFC 4122 UUID v4.
    let token = "";
    try {
      token = window.localStorage.getItem(tokenKey) || "";
    } catch {
      // Some privacy settings block localStorage; sessionStorage is tried below.
    }
    if (!token) {
      try {
        token = window.sessionStorage.getItem(tokenKey) || "";
      } catch {
        // Continue with an in-memory token if browser storage is disabled.
      }
    }
    try {
      if (!token) token = createClientUuid();
    } catch (cause) {
      console.error("[chat] No se pudo crear una sesión segura:", cause);
      const message = cause instanceof Error ? cause.message : "No se pudo iniciar una sesión segura de chat.";
      window.setTimeout(() => setError(message), 0);
      return;
    }

    try {
      window.localStorage.setItem(tokenKey, token);
    } catch {
      try {
        window.sessionStorage.setItem(tokenKey, token);
      } catch {
        // The conversation can still be used in this tab; the token will not
        // survive a reload when both browser storage mechanisms are blocked.
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-only visitor state after mount.
    setVisitorToken(token);
    try { setAlertsEnabled(window.localStorage.getItem(alertsKey) === "1"); } catch { /* Optional notification preference. */ }

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(identityKey);
    } catch {
      try { stored = window.sessionStorage.getItem(identityKey); } catch { /* optional identity cache */ }
    }
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { name?: unknown; email?: unknown };
        if (typeof parsed.name === "string") setName(parsed.name);
        if (typeof parsed.email === "string") setEmail(parsed.email);
      } catch {
        try { window.localStorage.removeItem(identityKey); } catch { /* optional cache */ }
        try { window.sessionStorage.removeItem(identityKey); } catch { /* optional cache */ }
      }
    }
  }, []);

  const playVisitorAlert = useCallback((message: string) => {
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
          oscillator.frequency.setValueAtTime(740, context.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.14);
          gain.gain.setValueAtTime(0.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
          oscillator.connect(gain); gain.connect(context.destination);
          oscillator.start(); oscillator.stop(context.currentTime + 0.25);
        }).catch(() => undefined);
      }
    } catch { /* Audio is optional. */ }
    try {
      if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(`${developerName} te respondió`, { body: message.slice(0, 150), icon: "/icon.svg", tag: "devfolio-admin-reply" });
        notification.onclick = () => { window.focus(); setOpen(true); notification.close(); };
      }
    } catch { /* Browser notifications are optional. */ }
  }, [alertsEnabled, developerName]);

  async function enableVisitorAlerts() {
    try {
      if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
      const AudioContextCtor = window.AudioContext;
      if (AudioContextCtor) {
        const context = audioContextRef.current ?? new AudioContextCtor();
        audioContextRef.current = context;
        await context.resume();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 760;
        gain.gain.value = 0.06;
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(); oscillator.stop(context.currentTime + 0.1);
      }
      setAlertsEnabled(true);
      try { window.localStorage.setItem(alertsKey, "1"); } catch { /* Preference is optional. */ }
    } catch {
      setError("El navegador no permitió activar el sonido. Puedes continuar usando el chat con el indicador de mensajes.");
    }
  }

  const refresh = useCallback(async (silent = false) => {
    if (!visitorToken || requestBusy.current) return;
    requestBusy.current = true;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/chat?token=${encodeURIComponent(visitorToken)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cargar el chat.");
      if (result.conversation) {
        setConversation(result.conversation as Conversation);
        setName((current) => current || result.conversation.name || "");
        setEmail((current) => current || result.conversation.email || "");
        if (result.hasUnread && !openRef.current) setUnread(true);
      }
      const nextMessages = Array.isArray(result.messages) ? result.messages as ChatMessage[] : [];
      if (knownMessageIds.current === null) {
        knownMessageIds.current = new Set(nextMessages.map((message) => message.id));
      } else {
        const incoming = nextMessages.filter((message) => message.sender === "admin" && !knownMessageIds.current?.has(message.id));
        if (incoming.length) {
          setUnread(!openRef.current);
          playVisitorAlert(incoming[incoming.length - 1].message);
        }
        nextMessages.forEach((message) => knownMessageIds.current?.add(message.id));
      }
      setMessages(nextMessages);
      setError("");
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "No se pudo conectar con el chat.");
    } finally {
      requestBusy.current = false;
      if (!silent) setLoading(false);
    }
  }, [visitorToken, playVisitorAlert]);

  useEffect(() => {
    if (!visitorToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch persisted server messages when the visitor session becomes available.
    void refresh(true);
    const interval = window.setInterval(() => void refresh(true), open ? 2500 : 12000);
    return () => window.clearInterval(interval);
  }, [visitorToken, open, refresh]);

  useEffect(() => {
    if (!open) return;
    // On opening an existing conversation, show its latest messages once.
    // This only scrolls the chat's own pane, never the document or page.
    const container = messagesScrollRef.current;
    if (!container) return;
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  }, [open]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.id === lastRenderedMessageId.current) return;
    const firstLoad = lastRenderedMessageId.current === null;
    lastRenderedMessageId.current = lastMessage.id;
    if (!open || (!firstLoad && !shouldStickToBottom.current)) return;
    const container = messagesScrollRef.current;
    if (!container) return;
    // Scroll only the chat's own message pane; scrollIntoView would also move the page.
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  }, [open, messages]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanMessage = draft.trim();
    if (!visitorToken || sending || cleanMessage.length < 1) return;
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Completa tu nombre y un correo válido para iniciar la conversación.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const identity = JSON.stringify({ name: name.trim(), email: email.trim() });
      try {
        window.localStorage.setItem(identityKey, identity);
      } catch {
        try { window.sessionStorage.setItem(identityKey, identity); } catch { /* sending does not depend on identity caching */ }
      }
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorToken, name: name.trim(), email: email.trim(), message: cleanMessage }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo enviar el mensaje.");
      setDraft("");
      await refresh(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  return <div className="live-chat-root">
    {open && <section className="live-chat-panel" aria-label="Chat con el desarrollador">
      <header className="live-chat-header">
        <span className="live-chat-header-icon"><Headset size={20} /></span>
        <div className="live-chat-header-copy"><strong>Hablemos de tu proyecto</strong><span><i /> {developerName} · Atención directa</span></div>
        <button type="button" className={`live-chat-alert-toggle ${alertsEnabled ? "enabled" : ""}`} aria-label={alertsEnabled ? "Avisos activados" : "Activar avisos de respuesta"} title={alertsEnabled ? "Avisos activados" : "Activar sonido y notificaciones"} onClick={() => void enableVisitorAlerts()}><BellRing size={16} /></button>
        <button type="button" className="live-chat-close" aria-label="Minimizar chat" onClick={() => setOpen(false)}><Minimize2 size={17} /></button>
      </header>
      <div className="live-chat-welcome"><span>¡Hola! 👋</span><p>¿Te interesa trabajar conmigo o tienes una oportunidad? Escríbeme y conversemos.</p></div>
      <div
        ref={messagesScrollRef}
        className="live-chat-messages"
        aria-live="polite"
        onScroll={(event) => {
          const element = event.currentTarget;
          shouldStickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
        }}
      >
        {loading && messages.length === 0 && <div className="live-chat-loading"><LoaderCircle size={17} className="spin" /> Conectando…</div>}
        {messages.map((message) => <div className={`live-chat-bubble ${message.sender === "visitor" ? "mine" : "theirs"}`} key={message.id}><p>{message.message}</p><time>{timeLabel(message.createdAt)}</time></div>)}
        {!messages.length && !loading && <div className="live-chat-empty"><MessageCircle size={22} /><span>Este es el inicio de tu conversación.</span></div>}
        <div aria-hidden="true" />
      </div>
      <form className="live-chat-form" onSubmit={send}>
        {!conversation && <div className="live-chat-identity"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" aria-label="Tu nombre" maxLength={120} required /><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu correo electrónico" aria-label="Tu correo electrónico" type="email" maxLength={250} required /></div>}
        {conversation && <div className="live-chat-returning"><CheckCircle2 size={14} /> Conversación privada · {conversation.name}</div>}
        <div className="live-chat-compose"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe tu mensaje…" rows={2} maxLength={3000} aria-label="Escribe tu mensaje" required /><button type="submit" aria-label="Enviar mensaje" disabled={sending || !draft.trim()}>{sending ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}</button></div>
        {error && <p className="live-chat-error" role="alert">{error}</p>}
        <small className="live-chat-privacy">Tus datos se usan únicamente para responder esta conversación.</small>
      </form>
    </section>}
    <button type="button" className={`live-chat-launcher ${open ? "is-open" : ""}`} onClick={() => { if (open) { openRef.current = false; setOpen(false); } else { openRef.current = true; setUnread(false); setOpen(true); void refresh(); } }} aria-label={open ? "Cerrar chat" : "Abrir chat en vivo"}>
      {open ? <X size={22} /> : <><MessageCircle size={23} /><span>Hablemos</span>{unread && <i className="live-chat-unread" />}</>}
    </button>
  </div>;
}
