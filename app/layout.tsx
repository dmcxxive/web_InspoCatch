import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppHeader } from "@/components/layout/AppHeader";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "灵感捕手 InspoCatch",
  description: "AI 公众号写作辅助 — 本地优先",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${sans.variable} ${mono.variable} min-h-screen font-sans antialiased`}
      >
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 md:px-8">
            <AppHeader />
            <main className="flex-1 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
