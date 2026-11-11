"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import PublicResume from "@/components/public-resume";
import { normalizeResume, validateResume, type ResumeData } from "@/lib/resume";

export default function PreviewResume({ initialData }: { initialData: ResumeData }) {
  const [data, setData] = useState(initialData);
  const [draft, setDraft] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("devfolio_preview");
      if (stored) {
        const value: unknown = JSON.parse(stored);
        if (validateResume(value)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the browser-only preview draft after hydration.
          setData(normalizeResume(value));
          setDraft(JSON.stringify(value) !== JSON.stringify(initialData));
        }
      }
    } catch { /* The published version remains available when storage is blocked. */ }
  }, [initialData]);
  return <div className="preview-mode"><div className="preview-banner"><Eye size={13} /><span>Vista previa · {draft ? "Estos cambios todavía no están publicados" : "Tu versión publicada"}</span><Link href="/admin">Volver al panel ↗</Link></div><PublicResume data={data} trackVisit={false} /></div>;
}
