import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in the server environment.");
const prisma = new PrismaClient();
try {
  await prisma.user.upsert({ where: { email }, update: { passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", status: "ACTIVE" }, create: { email, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", name: "Administrator" } });
  console.log("Administrator account configured.");
} finally { await prisma.$disconnect(); }
