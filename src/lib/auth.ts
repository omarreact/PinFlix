import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/src/lib/db";
import { env } from "@/src/lib/env";
import type { User } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "EDITOR" | "ADMIN";
};

function sessionSecret() {
  if (env.NODE_ENV === "production" && /^(streamflix-demo-secret|change-this)/.test(env.AUTH_SECRET)) {
    throw new Error("Set a unique AUTH_SECRET before enabling production authentication.");
  }
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function createSessionToken(user: Pick<User, "id" | "email" | "name" | "role">) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;

    return {
      id: String(payload.sub),
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : null,
      role: (payload.role as SessionUser["role"]) ?? "USER",
    };
  } catch {
    return null;
  }
}

export function getCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [cookieName, ...rest] = part.trim().split("=");
    if (cookieName === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function getCurrentUserFromRequest(request: Request): Promise<SessionUser | null> {
  const token = getCookieValue(request.headers.get("cookie"), env.SESSION_COOKIE_NAME);
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role as SessionUser["role"] };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role as SessionUser["role"] };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export function setSessionCookie(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }, token: string) {
  response.cookies.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }) {
  response.cookies.set(env.SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
