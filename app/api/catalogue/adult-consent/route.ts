import { NextResponse } from "next/server";

export const runtime = "nodejs";
const COOKIE = "pinflix-adult-age-ack";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  let body: { confirm?: unknown };
  try {
    body = await request.json() as { confirm?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Age confirmation required" }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "private, no-store" },
  });
  response.cookies.set(COOKIE, "confirmed", {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    path: "/catalogue/adult", maxAge: 24 * 60 * 60,
  });
  return response;
}
