import type { Metadata } from "next";
import { DirectPlayer } from "@/src/components/direct-player";

export const metadata: Metadata = {
  title: "Direct Play | PinFlix",
  description: "Play a video link directly on your device or open it in VLC.",
};

export default function DirectPlayPage() {
  return <DirectPlayer />;
}
