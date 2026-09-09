import { eq } from "drizzle-orm";
import { projects, sequences, shots } from "../db/schema";
import { getAuthUser } from "./auth";
import type { JwtPayload } from "./auth";

type AccessFailure = {
  ok: false;
  status: 401 | 403 | 404;
  detail: string;
};

export async function authorizeProjectForUser(
  db: any,
  authUser: JwtPayload,
  projectId: string,
): Promise<AccessFailure | { ok: true; authUser: JwtPayload; project: typeof projects.$inferSelect }> {
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return { ok: false, status: 404, detail: "工程不存在" };
  if (project.userId !== authUser.userId) {
    return { ok: false, status: 403, detail: "无权访问该工程" };
  }

  return { ok: true, authUser, project };
}

export async function authorizeProjectOwner(db: any, authorization: string | undefined, projectId: string) {
  const authUser = await getAuthUser(authorization);
  if (!authUser) return { ok: false as const, status: 401 as const, detail: "请先登录" };

  return authorizeProjectForUser(db, authUser, projectId);
}

export async function authorizeSequenceOwner(db: any, authorization: string | undefined, sequenceId: string) {
  const authUser = await getAuthUser(authorization);
  if (!authUser) return { ok: false as const, status: 401 as const, detail: "请先登录" };

  const sequence = await db.select().from(sequences).where(eq(sequences.id, sequenceId)).get();
  if (!sequence) return { ok: false as const, status: 404 as const, detail: "Sequence not found" };

  const access = await authorizeProjectForUser(db, authUser, sequence.projectId);
  return access.ok ? { ...access, sequence } : access;
}

export async function authorizeShotOwner(db: any, authorization: string | undefined, shotId: string) {
  const authUser = await getAuthUser(authorization);
  if (!authUser) return { ok: false as const, status: 401 as const, detail: "请先登录" };

  return authorizeShotForUser(db, authUser, shotId);
}

export async function authorizeShotForUser(db: any, authUser: JwtPayload, shotId: string) {
  const shot = await db.select().from(shots).where(eq(shots.id, shotId)).get();
  if (!shot) return { ok: false as const, status: 404 as const, detail: "Shot not found" };

  const sequence = await db.select().from(sequences).where(eq(sequences.id, shot.sequenceId)).get();
  if (!sequence) return { ok: false as const, status: 404 as const, detail: "Sequence not found" };

  const access = await authorizeProjectForUser(db, authUser, sequence.projectId);
  return access.ok ? { ...access, sequence, shot } : access;
}
