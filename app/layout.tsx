import type { Metadata } from "next";
import "@/src/styles.css";
import { AppShell } from "@/src/components/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://pinflix.pincodeit.com"),
  title: { default: "PinFlix — A world of stories", template: "%s · PinFlix" },
  description:
    "Discover movies and series. Keep your favourites close. Your next story starts here.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "PinFlix — A world of stories",
    description: "A world of stories. A space of your own.",
    type: "website",
    siteName: "PinFlix",
  },
  referrer: "no-referrer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
