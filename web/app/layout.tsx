import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RITMO — Focus personale",
  description: "Pomodoro personale con sincronizzazione privata per account.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "RITMO" },
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#111522" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it" suppressHydrationWarning><body>{children}</body></html>;
}
