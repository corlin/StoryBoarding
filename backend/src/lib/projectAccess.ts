import { eq } from "drizzle-orm";
import { projects } from "../db/schema";
import { getAuthUser } from "./auth";

export async function authorizeProjectOwner(db: any, authorization: string | undefined, projectId: string) {
  const authUser = await getAuthUser(authorization);
  if (!authUser) return { ok: false as const, status: 401 as const, detail: "请先登录" };

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return { ok: false as const, status: 404 as const, detail: "工程不存在" };
  if (project.userId !== authUser.userId) {
    return { ok: false as const, status: 403 as const, detail: "无权访问该工程" };
  }

  return { ok: true as const, authUser, project };
}
