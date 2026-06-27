import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import AppShell from "@/components/layouts/AppShell";
import "@/lib/offline-handler";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "ClassTrack - Classroom Management",
  description: "Classroom and Attendance Management System",
  icons: {
    icon: "/icon-logo-app.png",
    shortcut: "/icon-logo-app.png",
    apple: "/icon-logo-app.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Attendance",
  },
};

export const viewport: Viewport = {
  themeColor: "#414141",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="antialiased font-sans">
        <PWARegister />
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
