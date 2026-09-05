import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings, ensureSchema } from "./db/client";
import projectsRouter from "./routes/projects";
import shotsRouter from "./routes/shots";
import generationRouter from "./routes/generation";
import exportRouter from "./routes/export";
import settingsRouter from "./routes/settings";
import assetsRouter from "./routes/assets";
import versionsRouter from "./routes/versions";
import authRouter from "./routes/auth";
import charactersRouter from "./routes/characters";
import locationsRouter from "./routes/locations";
import propsRouter from "./routes/props";
import globalAssetsRouter from "./routes/globalAssets";

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend running on localhost / Cloudflare Pages
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Disposition", "Content-Length"],
  })
);

// Global Auto Schema Migration Middleware (Ensures D1 tables exist on all requests)
app.use("*", async (c, next) => {
  if (c.env?.DB) {
    await ensureSchema(c.env.DB);
  }
  await next();
});

// Health check
app.get("/api/health", (c) => {
  return c.json({
    status: "healthy",
    runtime: "cloudflare-workers",
    framework: "hono",
    database: "cloudflare-d1",
    storage: "cloudflare-r2",
    version: "2.1.0",
  });
});

// Mount modular sub-routers
app.route("/api/auth", authRouter);
app.route("/api/projects", projectsRouter);
app.route("/api/projects", versionsRouter); // /api/projects/:projectId/versions...
app.route("/api/shots", shotsRouter);
app.route("/api/characters", charactersRouter);
app.route("/api/locations", locationsRouter);
app.route("/api/props", propsRouter);
app.route("/api/global-assets", globalAssetsRouter);
app.route("/api/generate", generationRouter);
app.route("/api/export", exportRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/assets", assetsRouter);

// Global Exception & Error Handler with Friendly JSON
app.onError((err, c) => {
  console.error("[Worker Global Error]:", err);
  return c.json(
    {
      detail: err?.message || "服务器运行异常，请重试",
      error: String(err),
    },
    500
  );
});

export default app;
