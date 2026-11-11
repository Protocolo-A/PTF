"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, Award, BadgeCheck, BriefcaseBusiness,
  CalendarDays, CheckCircle2, ChevronRight, Cloud, CodeXml, Coffee, Container, Database,
  ExternalLink, GitBranch, Globe, GraduationCap, Hexagon, Layers, Leaf,
  Mail, MapPin, Menu, MessageCircle, Send, Settings2, ShieldCheck, Sparkles, UserRound, X, Newspaper,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Github, Linkedin } from "@/components/social-icons";
import { ProjectArtwork } from "@/components/project-artwork";
import { LiveChatWidget } from "@/components/chat/live-chat-widget";
import { VisitTracker } from "@/components/visit-tracker";
import { defaultTheme, themeCssVariables, type Project, type ResumeData } from "@/lib/resume";

type PublicNewsItem = { id: string; slug: string; title: string; excerpt: string; coverImage: string; updatedAt: Date | string; publishedAt: Date | string | null };

const navigation = [
  { id: "sobre-mi", label: "Sobre mí", icon: UserRound },
  { id: "experiencia", label: "Experiencia", icon: BriefcaseBusiness, section: "experience" as const },
  { id: "proyectos", label: "Proyectos", icon: Layers, section: "projects" as const },
  { id: "habilidades", label: "Habilidades", icon: CodeXml, section: "skills" as const },
  { id: "educacion", label: "Educación", icon: GraduationCap, section: "education" as const },
  { id: "contacto", label: "Contacto", icon: Send, section: "contact" as const },
];

export function TechnologyIcon({ name, size = 18 }: { name: string; size?: number }) {
  const lower = name.toLowerCase();
  const props = { size, strokeWidth: 1.9 };
  if (lower.includes("java") && !lower.includes("script")) return <Coffee {...props} className="tech-java" />;
  if (lower.includes("spring")) return <Leaf {...props} className="tech-spring" />;
  if (lower.includes("postgres")) return <Database {...props} className="tech-postgres" />;
  if (lower.includes("docker")) return <Container {...props} className="tech-docker" />;
  if (lower.includes("aws")) return <Cloud {...props} className="tech-aws" />;
  if (lower.includes("git")) return <GitBranch {...props} className="tech-git" />;
  if (lower.includes("kubernetes")) return <Hexagon {...props} className="tech-kubernetes" />;
  if (lower.includes("redis")) return <Database {...props} className="tech-redis" />;
  return <CodeXml {...props} className="tech-default" />;
}

function ContactForm() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(fields.entries())) });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "No se pudo enviar el mensaje.";
        throw new Error(message);
      }
      // Only show success when the API confirms that PostgreSQL stored the row.
      if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string") {
        throw new Error("No se pudo confirmar que el mensaje quedara guardado. Revisa los datos e inténtalo de nuevo.");
      }
      setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Comprueba tu conexión e inténtalo de nuevo."); }
    finally { setSending(false); }
  }
  if (sent) return <div className="contact-success" role="status"><span className="success-icon"><CheckCircle2 size={32} /></span><h3>¡Ya tenemos un comienzo!</h3><p>Tu mensaje se ha recibido correctamente. Gracias por compartir tu idea conmigo.</p><button className="button button-outline" onClick={() => setSent(false)}>Enviar otro mensaje <ArrowRight size={16} /></button></div>;
  return <form className="contact-form" onSubmit={submit}><div className="contact-form-heading"><span className="eyebrow">EL PRIMER PASO ES UN HOLA</span><h3>Cuéntame tu idea.</h3></div><div className="form-two-col"><label>Tu nombre<input name="name" placeholder="¿Cómo te llamas?" required minLength={2} maxLength={120} autoComplete="name" /></label><label>Tu email<input name="email" type="email" placeholder="hola@ejemplo.com" required maxLength={250} autoComplete="email" /></label></div><label>¿Qué tienes en mente?<textarea name="message" placeholder="Un proyecto, una oportunidad o simplemente un hola…" required minLength={10} maxLength={5000} rows={4} /></label><input className="honeypot" name="faxNumber" tabIndex={-1} aria-hidden="true" autoComplete="off" /><div className="contact-form-bottom"><span><ShieldCheck size={14} /> Solo conversaciones, cero spam.</span><button className="button button-primary" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar mensaje"}<ArrowUpRight size={16} /></button></div>{error && <p className="form-error" role="alert">{error}</p>}</form>;
}

export default function PublicResume({ data, trackVisit = true, latestNews = [] }: { data: ResumeData; trackVisit?: boolean; latestNews?: PublicNewsItem[] }) {
  const p = data.profile;
  const [active, setActive] = useState("sobre-mi");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [allProjects, setAllProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const visibleNav = navigation.filter((item) => !item.section || data.settings.sections[item.section]);
  const categories = ["Todos", ...Array.from(new Set(data.projects.map((project) => project.category)))];
  const filteredProjects = data.projects.filter((project) => filter === "Todos" ? (allProjects || project.featured) : project.category === filter);
  const shownProjects = filter === "Todos" && !allProjects && filteredProjects.length === 0 ? data.projects.slice(0, 3) : filteredProjects;

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: "-15% 0px -65% 0px", threshold: 0 });
    document.querySelectorAll("[data-cv-section]").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selectedProject && dialog.current) { dialog.current.showModal(); document.body.style.overflow = "hidden"; }
    else { dialog.current?.close(); document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [selectedProject]);

  function goTo(id: string) { setActive(id); setMobileMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function contact() { if (data.settings.sections.contact) goTo("contacto"); else window.location.href = `mailto:${p.email}`; }

  const design = data.settings.design;
  const pageBackground = design.backgroundMode === "gradient"
    ? `linear-gradient(135deg, ${design.gradientFrom}, ${design.gradientTo})`
    : design.backgroundMode === "image" && design.backgroundImage
      ? `linear-gradient(135deg, rgba(255,255,255,.78), rgba(255,255,255,.88)), url(${JSON.stringify(design.backgroundImage)}) center / cover fixed`
      : design.backgroundColor;
  return <div className={`public-app ${!data.settings.sections.skills ? "hide-skills" : ""}`} data-layout={design.layout} data-motion={design.motion ?? "fade"} style={{ ...themeCssVariables(data.settings.theme ?? defaultTheme), background: pageBackground }}>

    {mobileMenu && <button className="mobile-backdrop" aria-label="Cerrar navegación" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <Link href="/" className="brand-link" aria-label="Devfolio, inicio"><Brand /></Link>
      <div className="sidebar-section-label">MI PORTAFOLIO</div>
      <nav className="sidebar-nav" aria-label="Secciones del CV">{visibleNav.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} className={`nav-item ${active === id ? "active" : ""}`} onClick={(event) => { event.preventDefault(); goTo(id); }}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{active === id && <span className="nav-active-dot" />}</a>)}<Link href="/noticias" className="nav-item"><Newspaper size={19} strokeWidth={1.7} /><span>Noticias</span></Link></nav>
     <div className="sidebar-bottom"><div className="sidebar-callout"><span className="callout-spark"><Sparkles size={23} strokeWidth={1.5} /></span><h3>Las buenas ideas<br />se construyen juntos.</h3><p>¿Tienes una en mente?</p><button onClick={contact}>Hablemos <ArrowUpRight size={16} /></button></div><div className="sidebar-footer"><span className="footer-status-dot" /> Hecho con pasión y código <CodeXml size={13} /><span className="sidebar-version">v.1.0</span></div></div>
    </aside>
    <div className="public-main">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu-toggle" aria-label="Abrir navegación" onClick={() => setMobileMenu(true)}><Menu size={22} /></button><span className="breadcrumb-base">Mi portafolio</span><ChevronRight size={13} /><span className="breadcrumb-current">{visibleNav.find((nav) => nav.id === active)?.label || "Sobre mí"}</span></div><div className="topbar-right"><span className={`availability ${!p.available ? "unavailable" : ""}`}><span />{p.available ? "Abierto a oportunidades" : "Construyendo nuevos retos"}</span><span className="topbar-divider" /><a href="/api/cv" className="button button-outline download-button"><ArrowDownToLine size={16} />Descargar CV</a></div></header>
      <main className="content-wrap">
        <section id="sobre-mi" data-cv-section className="intro-section">
          <div className="profile-card"><div className="cover-banner" style={p.cover ? { backgroundImage: `url("${p.cover}")` } : undefined}><div className="cover-overlay" /><div className="cover-grain" /><div className="hero-copy"><span className="hero-label"><CodeXml size={14} />{p.heroLabel}</span><h1>{p.heroTitle.split("\n").map((line, index) => <span key={index}>{line}</span>)}</h1><p>{p.heroSubtitle}</p></div><div className="hero-side-label"><span className="hero-side-dot" /> DISEÑO. CÓDIGO. APRENDIZAJE.</div><span className="cover-caption"><MapPin size={11} /> {p.location} <span>↗</span></span></div><div className="profile-identity"><div className="profile-avatar-wrap"><img className="profile-avatar" src={p.avatar || "/images/avatar-placeholder.svg"} alt={`Foto de ${p.name}`} /><span className="avatar-status" title={p.available ? "Disponible" : "En activo"} /></div><div className="profile-name-block"><h2>{p.name}<BadgeCheck size={21} className="verified-badge" /></h2><p className="profile-role">{p.role}</p><div className="profile-meta"><span><MapPin size={13} />{p.location}</span><i /><span><BriefcaseBusiness size={13} />Nivel {p.yearsExperience}</span></div></div><div className="profile-actions"><button className="button button-primary" onClick={contact}>Contactar <ArrowUpRight size={17} /></button>{p.github && <a className="icon-button" href={p.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub"><Github size={19} /></a>}{p.linkedin && <a className="icon-button" href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><Linkedin size={18} /></a>}{p.website && <a className="icon-button" href={p.website} target="_blank" rel="noopener noreferrer" aria-label="Sitio web"><Globe size={18} /></a>}</div></div></div>
          <div className="overview-grid"><article className="surface-card about-card"><div className="card-title-row"><h3>Un poco sobre mí</h3><span className="card-icon"><UserRound size={17} /></span></div><div className="about-text">{p.bio.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div><div className="profile-stats"><div><strong>{p.yearsExperience}</strong><span>Nivel profesional</span></div><div><strong>{p.projectCount}</strong><span>Proyectos en portafolio</span></div><div><strong>∞</strong><span>Ganas de aprender</span></div></div></article><article className="surface-card stack-card"><div className="card-title-row"><h3>Mi stack tecnológico</h3><span className="card-icon"><CodeXml size={18} /></span></div><p className="card-description">Las herramientas detrás de mis ideas.</p><div className="stack-chips">{data.skills.slice(0, 8).map((skill) => <span className="stack-chip" key={skill.id}><TechnologyIcon name={skill.name} />{skill.name}</span>)}</div><div className="stack-card-footer"><span><span className="tiny-green-dot" /> Siempre aprendiendo</span>{data.settings.sections.skills && <button onClick={() => goTo("habilidades")} aria-label="Ver todas las habilidades"><ArrowUpRight size={17} /></button>}</div></article></div>
        </section>
        {data.settings.sections.experience && <section id="experiencia" data-cv-section className="cv-section"><div className="section-heading"><div><span className="eyebrow"><span className="section-number">01 /</span> MI RECORRIDO</span><h2>Experiencia que suma.</h2><p>Un camino de aprendizaje, línea a línea.</p></div><span className="section-note"><BriefcaseBusiness size={15} /> Perfil {p.yearsExperience}</span></div><div className="experience-list surface-card">{data.experience.map((experience, i) => <article className="experience-item" key={experience.id}><div className={`company-logo company-${i % 3}`}>{experience.initials || experience.company.substring(0, 1)}</div><div className="experience-content"><div className="experience-top"><div><h3>{experience.role}{experience.current && <span className="current-badge">Actual</span>}</h3><p className="experience-company">{experience.company}<span>·</span>{experience.location}</p></div><span className="experience-date"><CalendarDays size={13} />{experience.start} — {experience.current ? "Actualidad" : experience.end}</span></div><p className="experience-description">{experience.description}</p><div className="small-tags">{experience.technologies.map((tech, idx) => <span key={`${tech}-${idx}`}>{tech}</span>)}</div></div></article>)}{data.experience.length === 0 && <p className="empty-public">Las próximas experiencias están por escribir.</p>}</div></section>}
        {data.settings.sections.projects && <section id="proyectos" data-cv-section className="cv-section"><div className="section-heading"><div><span className="eyebrow"><span className="section-number">02 /</span> DEL CÓDIGO AL MUNDO</span><h2>Ideas que se hicieron realidad.</h2><p>Una selección de lo que me gusta construir.</p></div><span className="section-note"><Layers size={15} />{data.projects.length} proyectos seleccionados</span></div><div className="project-filters" aria-label="Filtrar proyectos">{categories.map((category) => <button key={category} onClick={() => setFilter(category)} className={filter === category ? "selected" : ""} aria-pressed={filter === category}>{category}{category === "Todos" && <span>{data.projects.length}</span>}</button>)}</div><div className="projects-grid">{shownProjects.map((project) => <article className="project-card" key={project.id}><button className="project-art-button" onClick={() => setSelectedProject(project)} aria-label={`Ver proyecto ${project.name}`}><ProjectArtwork project={project} /><span className="project-open-icon"><ArrowUpRight size={18} /></span></button><div className="project-card-content"><div className="project-card-title"><button onClick={() => setSelectedProject(project)}><h3>{project.name}</h3></button><span>{project.category}</span></div><p>{project.subtitle}</p><div className="small-tags">{project.technologies.map((tech, idx) => <span key={`${tech}-${idx}`}>{tech}</span>)}</div><button className="project-link" onClick={() => setSelectedProject(project)}>Explorar proyecto <ArrowRight size={15} /></button></div></article>)}</div>{data.projects.length === 0 && <p className="empty-public surface-card">Nuevas ideas en construcción.</p>}{filter === "Todos" && !allProjects && data.projects.length > shownProjects.length && <div className="projects-more"><button className="button button-outline" onClick={() => setAllProjects(true)}>Ver todos los proyectos <ArrowDown size={15} /></button></div>}</section>}
        {data.settings.sections.skills && <section id="habilidades" data-cv-section className="cv-section"><div className="section-heading"><div><span className="eyebrow"><span className="section-number">03 /</span> MI CAJA DE HERRAMIENTAS</span><h2>La tecnología es el medio.</h2><p>Resolver problemas es lo que realmente me mueve.</p></div><span className="section-note"><Sparkles size={15} />En constante evolución</span></div><div className="skills-grid">{Array.from(new Set(data.skills.map((skill) => skill.category))).map((category) => <div className="surface-card skill-group" key={category}><h3>{category}</h3>{data.skills.filter((s) => s.category === category).map((skill) => <div className="skill-item" key={skill.id}><div className="skill-label"><span><TechnologyIcon name={skill.name} size={16} />{skill.name}</span><small>{skill.level}%</small></div><div className="skill-track" role="progressbar" aria-label={skill.name} aria-valuenow={skill.level} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${skill.level}%` }} /></div></div>)}</div>)}</div></section>}
        {data.settings.sections.education && <section id="educacion" data-cv-section className="cv-section"><div className="section-heading"><div><span className="eyebrow"><span className="section-number">04 /</span> NUNCA DEJAR DE APRENDER</span><h2>Una base sólida. Una mente abierta.</h2><p>La formación no termina con un diploma.</p></div></div><div className="education-grid"><div className="surface-card education-card"><div className="card-title-row"><h3>Formación académica</h3><span className="card-icon"><GraduationCap size={19} /></span></div>{data.education.map((education) => <article className="education-item" key={education.id}><span className="education-timeline-dot" /><div><span className="education-years">{education.start} — {education.end}</span><h4>{education.degree}</h4><p className="education-school">{education.school}</p><p>{education.description}</p></div></article>)}</div><div className="education-side"><div className="surface-card certification-card"><div className="card-title-row"><h3>Certificaciones</h3><span className="card-icon"><Award size={18} /></span></div>{data.certifications.map((certification) => <article className="certification-item" key={certification.id}><span className="certification-icon"><Award size={22} /></span><div><h4>{certification.name}</h4><p>{certification.issuer} <span>·</span> {certification.year}</p></div>{certification.url && <a href={certification.url} target="_blank" rel="noopener noreferrer" className="certification-link" aria-label={`Ver certificación ${certification.name}`}><ArrowUpRight size={17} /></a>}</article>)}</div><div className="languages-card"><Globe size={20} /><div className="languages-content"><h3>Sin barreras para conectar.</h3><div>{data.languages.map((language) => <span key={language.id}><b>{language.name}</b> {language.level}</span>)}</div></div></div></div></div></section>}
        <section id="noticias" data-cv-section className="cv-section public-home-news">
          <div className="section-heading"><div><span className="eyebrow"><span className="section-number">05 /</span> NOTICIAS Y RECURSOS</span><h2>Ideas para seguir explorando.</h2><p>Notas, novedades y contenido de interés compartido desde este portafolio.</p></div><span className="section-note"><Newspaper size={15} /> Actualidad</span></div>
          {latestNews.length ? <div className="news-public-grid">{latestNews.slice(0, 3).map((article) => <article className="news-public-card" key={article.id}>
            <Link href={`/noticias/${article.slug}`} className="news-public-card-image">{article.coverImage ? <img src={article.coverImage} alt="" /> : <span><Newspaper size={30} /></span>}</Link>
            <div className="news-public-card-body"><time><CalendarDays size={13} />{new Date(article.publishedAt ?? article.updatedAt).toLocaleDateString("es-SV", { dateStyle: "medium" })}</time><h2><Link href={`/noticias/${article.slug}`}>{article.title}</Link></h2><p>{article.excerpt || "Lee el artículo completo."}</p><Link className="news-read-link" href={`/noticias/${article.slug}`}>Leer noticia <ArrowUpRight size={15} /></Link></div>
          </article>)}</div> : <div className="news-public-empty"><Newspaper size={30} /><h3>Pronto habrá novedades.</h3><p>Estoy preparando artículos, ideas y recursos para compartir.</p></div>}
          <div className="projects-more"><Link className="button button-outline" href="/noticias">Ver todas las noticias <ArrowRight size={15} /></Link></div>
        </section>
        {data.settings.sections.contact && <section id="contacto" data-cv-section className="cv-section"><div className="contact-grid"><div className="contact-intro"><span className="contact-eyebrow"><span className="tiny-green-dot" /> HAGAMOS ALGO BUENO</span><h2>Tu próxima idea.<br />Nuestro próximo<br /><span>gran proyecto.</span></h2><p>Busco retos que me hagan crecer y personas con las que construir algo que importe.</p><a className="contact-email" href={`mailto:${p.email}`}><Mail size={17} />{p.email}<ArrowUpRight size={16} /></a>{p.phone && <a className="contact-email contact-phone" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} aria-label={`Llamar al ${p.phone}`}>Tel. {p.phone}<ArrowUpRight size={15} /></a>}<div className="contact-status"><span />{p.available ? "Disponible para nuevos proyectos" : "Siempre abierto a una buena conversación"}</div><span className="contact-decoration"><CodeXml size={138} strokeWidth={.6} /></span></div><ContactForm /></div></section>}
        <footer className="page-footer"><span>© {new Date().getFullYear()} {p.name}. Hecho con intención.</span><span>Código limpio. Interfaces claras. <CodeXml size={14} /></span><button onClick={() => goTo("sobre-mi")} aria-label="Volver al inicio"><ArrowUpRight size={16} /></button></footer>
      </main>
    </div>
    {trackVisit && <VisitTracker />}
    <LiveChatWidget developerName={p.name} />
    <dialog ref={dialog} className="project-dialog" onCancel={() => setSelectedProject(null)} onClick={(event) => { if (event.target === event.currentTarget) setSelectedProject(null); }}>{selectedProject && <><button className="dialog-close" aria-label="Cerrar proyecto" onClick={() => setSelectedProject(null)}><X size={20} /></button><ProjectArtwork project={selectedProject} /><div className="project-dialog-content"><span className="eyebrow">{selectedProject.category} · PROYECTO</span><h2>{selectedProject.name}</h2><h3>{selectedProject.subtitle}</h3><p>{selectedProject.description}</p><div className="dialog-technologies">{selectedProject.technologies.map((tech, idx) => <span className="stack-chip" key={`${tech}-${idx}`}><TechnologyIcon name={tech} size={16} />{tech}</span>)}</div><div className="dialog-actions">{selectedProject.url && <a href={selectedProject.url} target="_blank" rel="noopener noreferrer" className="button button-primary">Ver proyecto <ExternalLink size={15} /></a>}{selectedProject.github && <a href={selectedProject.github} target="_blank" rel="noopener noreferrer" className="button button-outline"><Github size={16} /> Ver código</a>}<button className={`button ${selectedProject.url ? "button-outline" : "button-primary"}`} onClick={() => { setSelectedProject(null); setTimeout(contact, 50); }}>Hablemos del proyecto <MessageCircle size={16} /></button></div></div></>}</dialog>
  </div>;
}
