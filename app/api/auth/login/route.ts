import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSessionToken, getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { env } from "@/src/lib/env";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: { code: "INVALID_INPUT", message: "Email and password are required." } }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || user.status !== "ACTIVE") {
    return Response.json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } }, { status: 401 });
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const token = await createSessionToken(sessionUser);
  const cookieStore = await cookies();
  cookieStore.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  const current = await getCurrentUser();
  return Response.json({ user: current }, { status: 200 });
}
