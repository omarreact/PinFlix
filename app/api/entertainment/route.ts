import { entertainment } from "@/src/lib/iptv/catalog";
export function GET() { return Response.json(entertainment); }
