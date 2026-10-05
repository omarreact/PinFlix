import { cookies } from "next/headers";
import { env } from "@/src/lib/env";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(env.SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  return Response.json({ ok: true });
}
