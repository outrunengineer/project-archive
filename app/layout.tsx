import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Project Archive",
  description: "Historical project timeline tool for executive stakeholders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface">
        <NavBar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
