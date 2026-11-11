import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin, isDemoMode } from "@/lib/auth";
import { getResume } from "@/lib/cv-store";
import AdminStudio from "@/components/admin/admin-studio";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Devfolio Studio · Administrar mi CV", robots: { index: false, follow: false } };
export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <AdminStudio initialData={await getResume()} demo={isDemoMode()} />;
}
