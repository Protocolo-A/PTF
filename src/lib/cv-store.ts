import { getStoredResume, saveStoredResume } from "@/lib/data-store";
import type { ResumeData } from "@/lib/resume";

export async function getResume(): Promise<ResumeData> {
  return getStoredResume();
}

export async function saveResume(data: ResumeData): Promise<void> {
  await saveStoredResume(data);
}
