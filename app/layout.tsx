import type { Metadata } from "next";
import "@/src/styles.css";
import { AppShell } from "@/src/components/app-shell";

export const metadata: Metadata = {
  title: "PinFlix — Movies & Web Series",
  description: "Discover movies and web series in a cinematic PinFlix experience.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
