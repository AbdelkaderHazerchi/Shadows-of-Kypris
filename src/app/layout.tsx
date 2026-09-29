import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource-variable/cairo";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Shadows of Kypris — Psychological Survival Horror",
  description:
    "A first-person psychological survival horror game: John, an amnesiac scientist, discovers his experiments destroyed his city. Escape, survive, and uncover the truth.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="antialiased bg-black text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
