import { Hono } from "hono";
import { Bindings } from "../db/client";

const router = new Hono<{ Bindings: Bindings }>();

// GET /api/assets/*
router.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/assets\/?/, "");
  if (!path) {
    return c.json({ detail: "Asset key required" }, 400);
  }

  const storage = c.env.STORAGE;
  if (!storage) {
    return c.json({ detail: "Storage not configured" }, 503);
  }

  try {
    const object = await storage.get(path);
    if (!object) {
      return c.json({ detail: "Asset not found" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    if (!headers.get("content-type")) {
      if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
        headers.set("content-type", "image/jpeg");
      } else if (path.endsWith(".png")) {
        headers.set("content-type", "image/png");
      } else if (path.endsWith(".webp")) {
        headers.set("content-type", "image/webp");
      } else if (path.endsWith(".svg")) {
        headers.set("content-type", "image/svg+xml");
      }
    }

    return new Response(object.body, { headers });
  } catch (err: any) {
    console.error(`Failed to fetch asset ${path}:`, err);
    return c.json({ detail: "Failed to fetch asset" }, 500);
  }
});

export default router;
