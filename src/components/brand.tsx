import { CodeXml } from "lucide-react";

export function Brand({ studio = false }: { studio?: boolean }) {
  return <div className="brand"><span className="brand-mark"><CodeXml size={22} strokeWidth={2.4} /></span><span>devfolio<span className="brand-dot">.</span>{studio && <small>STUDIO</small>}</span></div>;
}
