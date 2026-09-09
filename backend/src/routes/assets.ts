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
    const rangeHeader = c.req.header("Range");
    const object = await storage.get(path, rangeHeader ? { range: c.req.raw.headers } : undefined);
    if (!object) {
      return c.json({ detail: "Asset not found" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, ETag");
    headers.set("Accept-Ranges", "bytes");

    if (!headers.get("content-type")) {
      if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
        headers.set("content-type", "image/jpeg");
      } else if (path.endsWith(".png")) {
        headers.set("content-type", "image/png");
      } else if (path.endsWith(".webp")) {
        headers.set("content-type", "image/webp");
      } else if (path.endsWith(".svg")) {
        headers.set("content-type", "image/svg+xml");
      } else if (path.endsWith(".mp3")) {
        headers.set("content-type", "audio/mpeg");
      } else if (path.endsWith(".m4a")) {
        headers.set("content-type", "audio/mp4");
      } else if (path.endsWith(".mp4")) {
        headers.set("content-type", "video/mp4");
      }
    }

    let status = 200;
    if (rangeHeader && object.range) {
      const range = object.range;
      const offset = "offset" in range && range.offset !== undefined
        ? range.offset
        : object.size - (("suffix" in range && range.suffix) || object.size);
      const length = "length" in range && range.length !== undefined
        ? range.length
        : object.size - offset;
      headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
      headers.set("Content-Length", String(length));
      status = 206;
    }

    return new Response(object.body, { status, headers });
  } catch (err: any) {
    console.error(`Failed to fetch asset ${path}:`, err);
    return c.json({ detail: "Failed to fetch asset" }, 500);
  }
});

export default router;
