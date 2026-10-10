import type { Metadata } from "next";
import "@/src/styles.css";
import { AppShell } from "@/src/components/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://pinflix.pincodeit.com"),
  title: {default:"PinFlix — A little more cinema",template:"%s · PinFlix"},
  description:"Discover movies and series worth watching. Film-first browsing, rich metadata and a focused player.",
  icons:{icon:"/icon.svg"},
  openGraph:{title:"PinFlix — A little more cinema",description:"A little less scrolling. A little more cinema.",type:"website",siteName:"PinFlix"},
  referrer:"no-referrer",
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
