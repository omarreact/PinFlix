"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
export async function setPublication(form: FormData) {
  const user = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["PUBLISHED", "ARCHIVED"].includes(status)) throw new Error("Invalid publication status");
  await prisma.$transaction([
    prisma.title.update({ where: { id }, data: { status } }),
    prisma.adminAuditLog.create({ data: { actorId: user.id, action: status, entity: "Title", entityId: id } }),
  ]);
  revalidatePath("/", "layout");
}
