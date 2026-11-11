import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Devfolio · Junior Frontend Developer",
  description: "Un espacio para el código, las ideas y las personas. Portafolio profesional de un desarrollador Frontend Junior.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
