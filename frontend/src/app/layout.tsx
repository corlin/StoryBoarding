import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastNotification";

export const metadata: Metadata = {
  title: "AI Director Workspace",
  description: "Bilateral Coordinated AI Storyboard & Shot Script Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
