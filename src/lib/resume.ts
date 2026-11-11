import type { CSSProperties } from "react";

export type Experience = {
  id: string; role: string; company: string; initials: string; location: string;
  start: string; end: string; current: boolean; description: string; technologies: string[];
};
export type Project = {
  id: string; name: string; subtitle: string; description: string; category: string;
  technologies: string[]; url: string; github: string; featured: boolean; style: string; image: string;
};
export type Skill = { id: string; name: string; category: string; level: number };
export type Education = { id: string; degree: string; school: string; start: string; end: string; description: string };
export type Certification = { id: string; name: string; issuer: string; year: string; url: string };
export type Language = { id: string; name: string; level: string };

/** Colores globales configurables desde el panel de administración. */
export type SiteTheme = {
  canvas: string;
  paper: string;
  ink: string;
  muted: string;
  green: string;
  greenDark: string;
  lime: string;
  pale: string;
  border: string;
};

export const defaultTheme: SiteTheme = {
  canvas: "#f7f8f5",
  paper: "#ffffff",
  ink: "#28372f",
  muted: "#7b847c",
  green: "#284f3c",
  greenDark: "#203e31",
  lime: "#c4dfa9",
  pale: "#edf3e8",
  border: "#e7eae3",
};

export const themePresets: { id: string; label: string; theme: SiteTheme }[] = [
  { id: "forest", label: "Bosque", theme: defaultTheme },
  { id: "ocean", label: "Océano", theme: { canvas: "#f3f7fa", paper: "#ffffff", ink: "#1d3342", muted: "#718493", green: "#176b87", greenDark: "#104b65", lime: "#a9e3e8", pale: "#e5f3f6", border: "#dce8ed" } },
  { id: "violet", label: "Violeta", theme: { canvas: "#f8f6fb", paper: "#ffffff", ink: "#30283d", muted: "#81768e", green: "#7050a0", greenDark: "#4e3972", lime: "#ddc9f5", pale: "#f0eafa", border: "#e8e0f0" } },
  { id: "sunset", label: "Coral", theme: { canvas: "#fbf6f3", paper: "#ffffff", ink: "#3e2c2a", muted: "#917d77", green: "#bd5d4b", greenDark: "#8e4036", lime: "#f5c9a9", pale: "#f9e9e1", border: "#eedfd8" } },
  { id: "mono", label: "Minimal", theme: { canvas: "#f5f5f5", paper: "#ffffff", ink: "#202124", muted: "#73777d", green: "#30343b", greenDark: "#191c21", lime: "#d7dce2", pale: "#eceff2", border: "#e2e5e9" } },
];

export function themeCssVariables(theme: SiteTheme = defaultTheme): CSSProperties {
  return {
    "--canvas": theme.canvas,
    "--paper": theme.paper,
    "--ink": theme.ink,
    "--muted": theme.muted,
    "--green": theme.green,
    "--green-dark": theme.greenDark,
    "--lime": theme.lime,
    "--pale": theme.pale,
    "--border": theme.border,
  } as CSSProperties;
}
export type SiteDesign = {
  layout: "classic" | "minimal" | "editorial";
  backgroundMode: "solid" | "gradient" | "image";
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  backgroundImage: string;
  motion: "none" | "fade" | "float" | "gradient";
};

export const defaultDesign: SiteDesign = {
  layout: "classic",
  backgroundMode: "solid",
  backgroundColor: "#f7f8f5",
  gradientFrom: "#f7f8f5",
  gradientTo: "#e9f0e8",
  backgroundImage: "",
  motion: "fade",
};

export type ResumeData = {
  profile: {
    name: string; role: string; location: string; email: string; phone: string;
    bio: string; heroTitle: string; heroSubtitle: string; heroLabel: string;
    avatar: string; cover: string; github: string; linkedin: string; website: string;
    available: boolean; yearsExperience: string; projectCount: string;
  };
  experience: Experience[];
  projects: Project[];
  skills: Skill[];
  education: Education[];
  certifications: Certification[];
  languages: Language[];
  settings: {
    title: string; description: string;
    sections: { experience: boolean; projects: boolean; skills: boolean; education: boolean; contact: boolean };
    theme: SiteTheme;
    design: SiteDesign;
    pdf: { coverColor: string; coverImage: string };
  };
};

export const defaultResume: ResumeData = {
  profile: {
    name: "Tu Nombre",
    role: "Junior Frontend Developer",
    location: "San Salvador, El Salvador",
    email: "hola@tudominio.dev",
    phone: "",
    bio: "Soy desarrollador Frontend Junior y me apasiona convertir ideas en interfaces web claras, modernas y fáciles de usar. Estoy construyendo mi camino en el desarrollo web con HTML, CSS, JavaScript, TypeScript y React.\n\nMe interesa escribir código ordenado, crear experiencias responsive y accesibles, aprender buenas prácticas y colaborar en proyectos donde pueda seguir creciendo. Este portafolio incluye proyectos de práctica que puedes reemplazar por tus trabajos reales.",
    heroTitle: "Diseño interfaces.\nConstruyo experiencias.",
    heroSubtitle: "Desarrollo web responsive, accesible y centrado en las personas.",
    heroLabel: "JUNIOR FRONTEND DEVELOPER",
    avatar: "/images/avatar-placeholder.svg",
    cover: "",
    github: "",
    linkedin: "",
    website: "",
    available: true,
    yearsExperience: "Junior",
    projectCount: "3",
  },
  experience: [],
  projects: [
    {
      id: "project-1", name: "Landing page responsive", subtitle: "Una primera impresión clara y moderna.",
      description: "Proyecto de práctica para construir una landing page adaptable a móviles, tabletas y escritorio. Incluye jerarquía visual, navegación, llamadas a la acción y componentes reutilizables. Reemplaza esta descripción por los objetivos, decisiones técnicas y resultados de tu proyecto real.",
      category: "Landing Page", technologies: ["HTML", "CSS", "JavaScript"], url: "", github: "", featured: true, style: "code", image: "",
    },
    {
      id: "project-2", name: "Tienda online UI", subtitle: "Una experiencia de compra intuitiva.",
      description: "Interfaz de práctica para una tienda online con catálogo, filtros, tarjetas de producto y diseño responsive. Es una base para demostrar componentes, estados de interfaz y atención al detalle visual. Añade aquí el enlace y las funcionalidades que realmente hayas implementado.",
      category: "E-commerce", technologies: ["React", "TypeScript", "CSS"], url: "", github: "", featured: true, style: "commerce", image: "",
    },
    {
      id: "project-3", name: "Dashboard de tareas", subtitle: "Organización simple para el trabajo diario.",
      description: "Dashboard de práctica con tarjetas, estados y una distribución visual pensada para facilitar la lectura de información. Puedes utilizarlo para mostrar manejo de componentes, props, estado y diseño de interfaces. Sustituye este texto por lo que hayas construido.",
      category: "Dashboard", technologies: ["Next.js", "React", "Tailwind CSS"], url: "", github: "", featured: true, style: "finance", image: "",
    },
  ],
  skills: [
    { id: "skill-1", name: "HTML5", category: "Frontend", level: 80 },
    { id: "skill-2", name: "CSS3", category: "Frontend", level: 75 },
    { id: "skill-3", name: "JavaScript", category: "Frontend", level: 65 },
    { id: "skill-4", name: "TypeScript", category: "Frontend", level: 55 },
    { id: "skill-5", name: "React", category: "Frontend", level: 60 },
    { id: "skill-6", name: "Next.js", category: "Frontend", level: 50 },
    { id: "skill-7", name: "Tailwind CSS", category: "Diseño y UI", level: 65 },
    { id: "skill-8", name: "Figma", category: "Diseño y UI", level: 55 },
    { id: "skill-9", name: "Git y GitHub", category: "Herramientas", level: 65 },
  ],
  education: [],
  certifications: [],
  languages: [],
  settings: {
    title: "Tu Nombre · Junior Frontend Developer",
    description: "Portafolio de un desarrollador Frontend Junior. Proyectos web, React, JavaScript, TypeScript y diseño responsive.",
    sections: { experience: false, projects: true, skills: true, education: false, contact: true },
    theme: defaultTheme,
    design: defaultDesign,
    pdf: { coverColor: defaultTheme.greenDark, coverImage: "" },
  },
};

/** Completa los campos nuevos de versiones anteriores sin descartar el contenido guardado. */
export function normalizeResume(value: ResumeData): ResumeData {
  const theme: SiteTheme = { ...defaultTheme };
  for (const key of Object.keys(defaultTheme) as (keyof SiteTheme)[]) {
    const candidate = value.settings?.theme?.[key];
    if (typeof candidate === "string" && /^#[0-9a-fA-F]{6}$/.test(candidate)) theme[key] = candidate;
  }
  const rawDesign = value.settings?.design;
  const design: SiteDesign = {
    ...defaultDesign,
    ...(rawDesign && typeof rawDesign === "object" ? rawDesign : {}),
  };
  if (!["classic", "minimal", "editorial"].includes(design.layout)) design.layout = defaultDesign.layout;
  if (!["solid", "gradient", "image"].includes(design.backgroundMode)) design.backgroundMode = defaultDesign.backgroundMode;
  for (const key of ["backgroundColor", "gradientFrom", "gradientTo"] as const) {
    if (!/^#[0-9a-fA-F]{6}$/.test(design[key])) design[key] = defaultDesign[key];
  }
  if (typeof design.backgroundImage !== "string" || !safeImage(design.backgroundImage)) design.backgroundImage = "";
  if (!["none", "fade", "float", "gradient"].includes(design.motion)) design.motion = defaultDesign.motion;
  const rawPdf = value.settings?.pdf;
  const pdf = {
    coverColor: typeof rawPdf?.coverColor === "string" && /^#[0-9a-fA-F]{6}$/.test(rawPdf.coverColor) ? rawPdf.coverColor : theme.greenDark,
    coverImage: typeof rawPdf?.coverImage === "string" && safeImage(rawPdf.coverImage) ? rawPdf.coverImage : "",
  };
  return { ...value, settings: { ...value.settings, theme, design, pdf } };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const validString = (v: unknown, max = 12000): v is string => typeof v === "string" && v.length <= max;
const stringFields = (v: Record<string, unknown>, fields: string[]) => fields.every((key) => validString(v[key]));
const safeUrl = (v: unknown) => typeof v === "string" && (!v || /^https?:\/\//i.test(v));
const safeImage = (v: unknown) => typeof v === "string" && (!v || /^\/(images|api\/media)\/[a-zA-Z0-9_.\/-]+$/.test(v) || /^https?:\/\//i.test(v));
const stringArray = (v: unknown) => Array.isArray(v) && v.length <= 40 && v.every((s) => validString(s, 100));

export function validateResume(value: unknown): value is ResumeData {
  if (!isRecord(value) || !isRecord(value.profile) || !isRecord(value.settings)) return false;
  const p = value.profile;
  if (!stringFields(p, ["name", "role", "location", "email", "phone", "bio", "heroTitle", "heroSubtitle", "heroLabel", "avatar", "cover", "github", "linkedin", "website", "yearsExperience", "projectCount"])) return false;
  if (!(p.name as string).trim() || !(p.role as string).trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email as string) || typeof p.available !== "boolean") return false;
  if (!safeImage(p.avatar) || !safeImage(p.cover) || ![p.github, p.linkedin, p.website].every(safeUrl)) return false;
  const validators: Record<string, (v: Record<string, unknown>) => boolean> = {
    experience: (e) => stringFields(e, ["id", "role", "company", "initials", "location", "start", "end", "description"]) && typeof e.current === "boolean" && stringArray(e.technologies),
    projects: (e) => stringFields(e, ["id", "name", "subtitle", "description", "category", "url", "github", "style", "image"]) && typeof e.featured === "boolean" && stringArray(e.technologies) && safeUrl(e.url) && safeUrl(e.github) && safeImage(e.image),
    skills: (e) => stringFields(e, ["id", "name", "category"]) && typeof e.level === "number" && Number.isFinite(e.level) && e.level >= 0 && e.level <= 100,
    education: (e) => stringFields(e, ["id", "degree", "school", "start", "end", "description"]),
    certifications: (e) => stringFields(e, ["id", "name", "issuer", "year", "url"]) && safeUrl(e.url),
    languages: (e) => stringFields(e, ["id", "name", "level"]),
  };
  for (const [key, check] of Object.entries(validators)) {
    const arr = value[key];
    if (!Array.isArray(arr) || arr.length > 80 || !arr.every((item) => isRecord(item) && check(item))) return false;
  }
  const s = value.settings;
  const validSections = isRecord(s.sections) && ["experience", "projects", "skills", "education", "contact"].every((key) => typeof (s.sections as Record<string, unknown>)[key] === "boolean");
  const theme = s.theme;
  const validTheme = theme === undefined || (isRecord(theme) && ["canvas", "paper", "ink", "muted", "green", "greenDark", "lime", "pale", "border"].every((key) => typeof theme[key] === "string" && /^#[0-9a-fA-F]{6}$/.test(theme[key] as string)));
  const design = s.design;
  const validDesign = design === undefined || (isRecord(design)
    && ["classic", "minimal", "editorial"].includes(String(design.layout))
    && ["solid", "gradient", "image"].includes(String(design.backgroundMode))
    && ["backgroundColor", "gradientFrom", "gradientTo"].every((key) => typeof design[key] === "string" && /^#[0-9a-fA-F]{6}$/.test(design[key] as string))
    && safeImage(design.backgroundImage)
    && (design.motion === undefined || ["none", "fade", "float", "gradient"].includes(String(design.motion))));
  const pdf = s.pdf;
  const validPdf = pdf === undefined || (isRecord(pdf)
    && typeof pdf.coverColor === "string" && /^#[0-9a-fA-F]{6}$/.test(pdf.coverColor)
    && safeImage(pdf.coverImage));
  return stringFields(s, ["title", "description"]) && validSections && validTheme && validDesign && validPdf;
}
