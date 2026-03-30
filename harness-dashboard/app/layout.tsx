import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harness Dashboard",
  description: "Monitor harness workflow state",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-sm font-medium tracking-tight text-muted-foreground">
              harness-dashboard
            </h1>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
