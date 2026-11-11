import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { Brand } from "@/components/brand";
import LoginForm from "@/components/admin/login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acceder · Devfolio Studio", robots: { index: false, follow: false } };
export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <main className="login-page"><section className="login-visual"><Brand studio /><div><h1>Tu código cuenta<br />una historia.<br />Hazla tuya.</h1><p>Un espacio diseñado para presentar lo que sabes, lo que construyes y todo lo que está por venir.</p></div><small>DEVFOLIO STUDIO · HECHO CON INTENCIÓN</small></section><section className="login-form-wrap"><LoginForm /></section></main>;
}
