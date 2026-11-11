"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, CircleAlert, ImagePlus, LoaderCircle, Trash2, Upload, X, Download } from "lucide-react";

export function Field({ label, value, onChange, type = "text", multiline = false, rows = 4, wide = false, hint, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; multiline?: boolean; rows?: number; wide?: boolean; hint?: string; placeholder?: string;
}) {
  return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}</span>{multiline ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} maxLength={12000} placeholder={placeholder} /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={12000} placeholder={placeholder} />}{hint && <small>{hint}</small>}</label>;
}
export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
export function ListField({ label, value, onChange, wide = false }: { label: string; value: string[]; onChange: (v: string[]) => void; wide?: boolean }) {
  const [text, setText] = useState(value.join(", "));
  return <Field label={label} value={text} wide={wide} hint="Separa cada tecnología con una coma." onChange={(v) => { setText(v); onChange(v.split(",").map((s) => s.trim()).filter(Boolean)); }} />;
}
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className={`toggle ${value ? "checked" : ""}`} role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} />;
}
export function ImageUpload({ label, value, onChange, avatar = false, hint, acceptTypes = "image/jpeg,image/png,image/webp,image/gif" }: { label: string; value: string; onChange: (v: string) => void; avatar?: boolean; hint?: string; acceptTypes?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  async function upload(file?: File) {
    if (!file || busy) return;
    setError("");
    const allowedTypes = acceptTypes.split(",").map((type) => type.trim()).filter(Boolean);
    if (allowedTypes.length && !allowedTypes.includes(file.type)) { setError(`Formato no válido. Usa ${allowedTypes.map((type) => type.replace("image/", "").toUpperCase()).join(", ")}.`); return; }
    if (file.size > 5 * 1024 * 1024) { setError("La imagen debe pesar menos de 5 MB."); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo subir la imagen.");
      onChange(result.url);
    } catch (err) { setError(err instanceof Error ? err.message : "Error al subir la imagen."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <div className="upload-field"><label>{label}</label><div className={`image-dropzone ${value ? "has-image" : ""} ${avatar ? "avatar-dropzone" : ""} ${dragging ? "dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files[0]); }}>{value ? <img src={value} alt={label} /> : <ImagePlus size={27} strokeWidth={1.3} />}<button type="button" className="upload-action" onClick={() => input.current?.click()} disabled={busy}><Upload size={13} />{value ? "Cambiar imagen" : "Subir imagen"}</button>{value && <><a className="upload-download" href={value.startsWith("/api/media/") ? `${value}?download=1` : value} download aria-label={`Descargar ${label.toLowerCase()}`}><Download size={13} />Descargar</a><button type="button" className="upload-remove" aria-label={`Eliminar ${label.toLowerCase()}`} onClick={() => onChange("")} disabled={busy}><X size={13} /></button></>}{busy && <div className="upload-busy" role="status"><LoaderCircle size={24} className="spin" />Subiendo imagen…</div>}</div><input ref={input} type="file" accept={acceptTypes} className="honeypot" onChange={(e) => void upload(e.target.files?.[0])} /><p>{hint || "JPG, PNG, WebP o GIF animado. Máximo 5 MB. También puedes arrastrar la imagen."}</p>{error && <div className="form-error" role="alert">{error}</div>}</div>;
}
export function EditorSection({ title, description, icon, children }: { title: string; description?: string; icon?: ReactNode; children: ReactNode }) {
  return <section className="editor-section"><div className="editor-section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{icon}</div>{children}</section>;
}
export function ItemHeader({ title, subtitle, index, count, onMove, onDelete }: { title: string; subtitle?: string; index: number; count: number; onMove: (delta: number) => void; onDelete: () => void }) {
  return <div className="editor-item-head"><div className="editor-item-title"><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{title || "Sin título"}</strong>{subtitle && <small>{subtitle}</small>}</div></div><div className="editor-item-actions"><button type="button" aria-label={`Subir ${title}`} disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp size={14} /></button><button type="button" aria-label={`Bajar ${title}`} disabled={index === count - 1} onClick={() => onMove(1)}><ChevronDown size={14} /></button><button type="button" className="delete-action" aria-label={`Eliminar ${title}`} onClick={onDelete}><Trash2 size={13} /></button></div></div>;
}
export type Confirmation = { title: string; message: string; confirmLabel?: string; onConfirm: () => void };
export function ConfirmDialog({ value, close }: { value: Confirmation | null; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (value) dialog.current?.showModal(); else dialog.current?.close(); }, [value]);
  return <dialog ref={dialog} className="confirm-dialog" onCancel={close} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>{value && <><CircleAlert size={29} strokeWidth={1.5} /><h3>{value.title}</h3><p>{value.message}</p><div className="confirm-dialog-actions"><button className="button button-outline" onClick={close}>Cancelar</button><button className="button button-danger" onClick={() => { value.onConfirm(); close(); }}>{value.confirmLabel || "Eliminar"}</button></div></>}</dialog>;
}
export function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const result = [...items]; const target = index + delta;
  if (target < 0 || target >= items.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
