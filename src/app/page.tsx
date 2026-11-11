import type { Metadata } from "next";
import PublicResume from "@/components/public-resume";
import { getResume } from "@/lib/cv-store";
import { listPublishedNews } from "@/lib/data-store";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const data = await getResume();
  return { title: data.settings.title, description: data.settings.description, openGraph: { title: data.settings.title, description: data.settings.description, type: "profile" } };
}
export default async function HomePage() {
  const [data, articles] = await Promise.all([getResume(), listPublishedNews()]);
  return <PublicResume data={data} latestNews={articles.slice(0, 3)} />;
}
