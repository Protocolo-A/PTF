"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, LoaderCircle, LockKeyhole } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo iniciar sesión.");
      router.push("/admin"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo iniciar sesión."); }
    finally { setLoading(false); }
  }
  return <form className="login-form" onSubmit={submit}><span><LockKeyhole size={22} strokeWidth={1.5} /></span><h2>Bienvenido a tu espacio.</h2><p>Accede al administrador para dar forma a tu perfil, compartir tus proyectos y escribir tu próximo capítulo.</p><label className="field"><span>Contraseña del administrador</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" autoFocus placeholder="Tu contraseña" maxLength={500} /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="button button-primary" type="submit" disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <ArrowUpRight size={15} />}{loading ? "Entrando…" : "Entrar a mi panel"}</button><Link href="/" className="login-back"><ArrowLeft size={12} />Volver al portafolio</Link></form>;
}
