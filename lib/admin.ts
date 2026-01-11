// lib/admin.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/role";

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  const u = (session as any)?.user;

  const userId = String(u?.id || "");
  const role = String(u?.role || "user");
  const isAdmin = Boolean(u?.isAdmin) || isAdminRole(role);

  return { session, userId, role, isAdmin };
}

export async function requireAdmin() {
  const { userId, isAdmin } = await getAuthUser();

  if (!userId) return { ok: false as const, status: 401 as const };
  if (!isAdmin) return { ok: false as const, status: 403 as const };

  return { ok: true as const, userId };
}

