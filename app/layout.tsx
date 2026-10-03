import type { Metadata } from "next";
import "@/src/styles.css";
import { AppShell } from "@/src/components/app-shell";

export const metadata: Metadata = {
  title: "PinFlix — Movies & Web Series",
  description: "Discover movies and web series in a fast, modern PinFlix experience.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
