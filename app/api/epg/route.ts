import { findChannel } from "@/src/lib/iptv/catalog";
export async function GET(request: Request) { const id = new URL(request.url).searchParams.get("channelId"); const channel = id ? findChannel(id) : undefined; return channel ? Response.json({ channelId: channel.id, ...channel.epg }) : Response.json({ error: "Channel not found" }, { status: 404 }); }
