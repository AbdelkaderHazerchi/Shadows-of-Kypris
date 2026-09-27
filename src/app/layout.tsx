import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource-variable/cairo";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "ظلال كيبريس — لعبة رعب نفسي",
  description:
    "لعبة رعب نفسي بمنظور الشخص الأول: جون، عالم فاقد للذاكرة، يكتشف أن تجاربه العلمية دمرت مدينته. اهرب، انجُ، واكشف الحقيقة.",
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
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-black text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
