import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, Bindings } from "../db/client";
import { projects, sequences, shots } from "../db/schema";
import {
  generateShotScriptMarkdown,
  generateDirectorGlobalPrompt,
  generateGenerationPackageZip,
} from "../services/export";

const router = new Hono<{ Bindings: Bindings }>();

async function getProjectAndShots(db: any, projectId: string) {
  const proj = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!proj) {
    return { proj: null, shotList: [], seqs: [] };
  }

  const seqs = await db.select().from(sequences).where(eq(sequences.projectId, proj.id)).orderBy(sequences.order).all();
  const shotList: any[] = [];

  for (const seq of seqs) {
    const list = await db.select().from(shots).where(eq(shots.sequenceId, seq.id)).orderBy(shots.order).all();
    shotList.push(...list);
  }

  return { proj, shotList, seqs };
}

// GET /api/export/script-markdown/:projectId
router.get("/script-markdown/:projectId", async (c) => {
  const db = getDb(c.env.DB);
  const projectId = c.req.param("projectId");
  const { proj, shotList, seqs } = await getProjectAndShots(db, projectId);

  if (!proj) return c.text("Project not found", 404);

  const md = generateShotScriptMarkdown(proj, shotList, seqs);
  return c.text(md, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="shot_script_${projectId}.md"`,
  });
});

// GET /api/export/director-global-prompt/:projectId
router.get("/director-global-prompt/:projectId", async (c) => {
  const db = getDb(c.env.DB);
  const projectId = c.req.param("projectId");
  const { proj, shotList } = await getProjectAndShots(db, projectId);

  if (!proj) return c.text("Project not found", 404);

  const md = generateDirectorGlobalPrompt(proj, shotList);
  return c.text(md, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="director_global_prompt_${projectId}.md"`,
  });
});

async function handleZipExport(c: any, filenamePrefix: string) {
  const db = getDb(c.env.DB);
  const projectId = c.req.param("projectId");
  const { proj, shotList } = await getProjectAndShots(db, projectId);

  if (!proj) return c.text("Project not found", 404);

  const zipBytes = await generateGenerationPackageZip(proj, shotList);
  return new Response(zipBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filenamePrefix}_${projectId}.zip"`,
    },
  });
}

// GET /api/export/package-zip/:projectId
router.get("/package-zip/:projectId", (c) => handleZipExport(c, "generation_package"));

// GET /api/export/images-zip/:projectId
router.get("/images-zip/:projectId", (c) => handleZipExport(c, "storyboard_images"));

export default router;
