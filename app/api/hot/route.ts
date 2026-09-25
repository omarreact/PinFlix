import { channels, entertainment } from "@/src/lib/iptv/catalog";
export function GET() { return Response.json({ channels: channels.slice(0, 4), entertainment: entertainment.slice(0, 4) }); }
