import type { SVGProps } from "react";
type IconProps = SVGProps<SVGSVGElement> & { size?: number };
export function Github({ size = 20, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 19c-4.3 1.4-4.3-2.2-6-2.7M15 22v-3.9a3.4 3.4 0 0 0-.9-2.7c3-.3 6.2-1.5 6.2-6.8a5.3 5.3 0 0 0-1.5-3.7 4.9 4.9 0 0 0-.1-3.7s-1.2-.4-3.8 1.4a13 13 0 0 0-6.9 0C5.4.8 4.2 1.2 4.2 1.2a4.9 4.9 0 0 0-.1 3.7 5.3 5.3 0 0 0-1.5 3.7c0 5.3 3.2 6.5 6.2 6.8a3.4 3.4 0 0 0-.9 2.7V22" /></svg>;
}
export function Linkedin({ size = 20, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7.5 10v7M12 17v-7M12 13a3 3 0 0 1 6 0v4" /><circle cx="7.5" cy="7" r=".75" fill="currentColor" stroke="none" /></svg>;
}
