import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { getResume } from "@/lib/cv-store";
import { getStoredMedia } from "@/lib/data-store";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const clean = (value: string) => value.replace(/\u2013|\u2014/g, "-").replace(/\u2018|\u2019/g, "'").replace(/\u201c|\u201d/g, '"').replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "");

function hexToRgb(value: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return rgb(0.13, 0.30, 0.24);
  const number = Number.parseInt(match[1], 16);
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255);
}

async function readResumeImage(source: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!source) return null;
  if (source.startsWith("/api/media/")) {
    const asset = await getStoredMedia(source.split("/").pop() || "");
    return asset ? { bytes: Buffer.from(asset.data, "base64"), contentType: asset.contentType } : null;
  }
  if (/^\/images\/[a-zA-Z0-9_.-]+$/.test(source)) {
    const bytes = await readFile(join(process.cwd(), "public", source));
    const contentType = source.toLowerCase().endsWith(".png") ? "image/png" : source.toLowerCase().endsWith(".jpg") || source.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "";
    return contentType ? { bytes, contentType } : null;
  }
  return null;
}

function drawCoverImage(page: PDFPage, image: PDFImage | null, coverColor: ReturnType<typeof rgb>) {
  // The PDF is a static document. GIF animation is kept in the web CV; the PDF uses a still image when supported.
  if (!image) {
    page.drawRectangle({ x: 0, y: 690, width: 595.28, height: 151.89, color: coverColor });
    return;
  }
  const pageWidth = 595.28;
  const coverHeight = 151.89;
  const scale = Math.max(pageWidth / image.width, coverHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, { x: (pageWidth - width) / 2, y: 690 + (coverHeight - height) / 2, width, height });
  page.drawRectangle({ x: 0, y: 690, width: pageWidth, height: coverHeight, color: coverColor, opacity: 0.60 });
}


export async function GET() {
  try {
    const resume = await getResume();
    const p = resume.profile;
    const doc = await PDFDocument.create();
    doc.setTitle(`CV - ${p.name}`);
    doc.setAuthor(p.name);
    const normal = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const pdfSettings = resume.settings.pdf ?? { coverColor: resume.settings.theme?.greenDark || "#203e31", coverImage: "" };
    const green = hexToRgb(pdfSettings.coverColor || resume.settings.theme?.greenDark || "#203e31");
    const ink = rgb(0.16, 0.20, 0.19);
    const gray = rgb(0.43, 0.48, 0.46);
    let page: PDFPage = doc.addPage([595.28, 841.89]);
    let y = 658;
    let coverImage = null;
    try {
      const source = pdfSettings.coverImage || p.cover;
      const asset = await readResumeImage(source);
      if (asset?.contentType === "image/jpeg") coverImage = await doc.embedJpg(asset.bytes);
      else if (asset?.contentType === "image/png") coverImage = await doc.embedPng(asset.bytes);
      // WebP and GIF are animated/unsupported by PDF-lib; the PDF uses the editable solid color in that case.
    } catch { coverImage = null; }
    drawCoverImage(page, coverImage, green);
    page.drawText(clean(p.name), { x: 48, y: 785, size: Math.min(26, 365 / Math.max(bold.widthOfTextAtSize(clean(p.name), 1), 1)), font: bold, color: rgb(1, 1, 1) });
    page.drawText(clean(p.role), { x: 48, y: 758, size: 11.5, font: normal, color: rgb(0.86, 0.93, 0.89) });
    page.drawText(clean(`${p.location}  |  ${p.email}`), { x: 48, y: 728, size: 9, font: normal, color: rgb(0.86, 0.93, 0.89) });
    try {
      const avatarAsset = await readResumeImage(p.avatar);
      if (avatarAsset?.contentType === "image/png") {
        const img = await doc.embedPng(avatarAsset.bytes);
        page.drawImage(img, { x: 467, y: 715, width: 74, height: 97 });
      } else if (avatarAsset?.contentType === "image/jpeg") {
        const img = await doc.embedJpg(avatarAsset.bytes);
        page.drawImage(img, { x: 467, y: 715, width: 74, height: 97 });
      }
    } catch { /* An unavailable portrait must not prevent the PDF download. */ }
    const nextPage = () => {
      page = doc.addPage([595.28, 841.89]); y = 779;
      page.drawText(clean(`${p.name} / CURRICULUM VITAE`), { x: 48, y: 810, size: 8, font: bold, color: gray });
    };
    const ensure = (space: number) => { if (y < 60 + space) nextPage(); };
    const wrap = (text: string, font: PDFFont, size: number) => {
      const lines: string[] = [];
      for (const para of clean(text).split("\n")) {
        let line = "";
        for (const word of para.split(/\s+/)) {
          if (!word) continue;
          const candidate = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(candidate, size) > 495 && line) { lines.push(line); line = word; } else line = candidate;
        }
        lines.push(line);
      }
      return lines;
    };
    const text = (value: string, size = 10, font = normal, color = ink) => {
      for (const line of wrap(value, font, size)) {
        ensure(size + 6);
        page.drawText(line, { x: 48, y, size, font, color });
        y -= size + 5;
      }
    };
    const heading = (title: string) => {
      ensure(65); y -= 13;
      page.drawText(title.toUpperCase(), { x: 48, y, size: 10.5, font: bold, color: green });
      page.drawLine({ start: { x: 48, y: y - 9 }, end: { x: 547, y: y - 9 }, thickness: 0.6, color: rgb(0.83, 0.87, 0.84) });
      y -= 27;
    };
    heading("Perfil profesional"); text(p.bio);
    if (resume.settings.sections.experience) {
      heading("Experiencia profesional");
      for (const e of resume.experience) {
        ensure(80); text(`${e.role} | ${e.company}`, 11, bold);
        text(`${e.start} - ${e.current ? "Actualidad" : e.end}  ·  ${e.location}`, 9, normal, gray);
        text(e.description); text(e.technologies.join(" · "), 9, normal, green); y -= 11;
      }
    }
    if (resume.settings.sections.projects) {
      heading("Proyectos");
      for (const project of resume.projects) {
        ensure(70); text(`${project.name} | ${project.category}`, 11, bold); text(project.description);
        text(project.technologies.join(" · "), 9, normal, green);
        if (project.url) text(project.url, 8, normal, gray);
        if (project.github) text(project.github, 8, normal, gray);
        y -= 10;
      }
    }
    if (resume.settings.sections.skills) {
      heading("Habilidades técnicas");
      for (const category of Array.from(new Set(resume.skills.map((s) => s.category)))) {
        text(`${category}: ${resume.skills.filter((s) => s.category === category).map((s) => s.name).join(", ")}`, 10);
      }
    }
    if (resume.settings.sections.education) {
      heading("Formación");
      for (const e of resume.education) { ensure(55); text(e.degree, 11, bold); text(`${e.school} | ${e.start} - ${e.end}`, 9, normal, gray); text(e.description); y -= 8; }
      if (resume.certifications.length) { heading("Certificaciones"); for (const c of resume.certifications) text(`${c.name} - ${c.issuer}, ${c.year}`); }
      if (resume.languages.length) { heading("Idiomas"); text(resume.languages.map((l) => `${l.name}: ${l.level}`).join("  ·  ")); }
    }
    if (p.github || p.linkedin || p.website || p.phone) {
      heading("Contacto y enlaces");
      for (const link of [p.email, p.phone, p.website, p.github, p.linkedin]) if (link) text(link, 9, normal, gray);
    }
    doc.getPages().forEach((pg, i, pages) => {
      pg.drawText(clean(p.name), { x: 48, y: 28, size: 8, font: normal, color: gray });
      pg.drawText(`${i + 1} / ${pages.length}`, { x: 518, y: 28, size: 8, font: normal, color: gray });
    });
    const bytes = await doc.save();
    const filename = p.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]/g, "-");
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="CV-${filename}.pdf"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("PDF generation failed", error);
    return Response.json({ error: "No se pudo generar el PDF. Inténtalo de nuevo." }, { status: 500 });
  }
}
