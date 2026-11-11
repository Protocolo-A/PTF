import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getResume } from "@/lib/cv-store";
import PreviewResume from "@/components/preview-resume";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vista previa · Devfolio", robots: { index: false, follow: false } };
export default async function PreviewPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <PreviewResume initialData={await getResume()} />;
}
