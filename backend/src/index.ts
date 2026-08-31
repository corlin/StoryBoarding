import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bindings } from "./db/client";
import projectsRouter from "./routes/projects";
import shotsRouter from "./routes/shots";
import generationRouter from "./routes/generation";
import exportRouter from "./routes/export";
import settingsRouter from "./routes/settings";
import assetsRouter from "./routes/assets";
import versionsRouter from "./routes/versions";

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

// Health check
app.get("/api/health", (c) => {
  return c.json({
    status: "healthy",
    runtime: "cloudflare-workers",
    framework: "hono",
    database: "cloudflare-d1",
    storage: "cloudflare-r2",
    version: "2.0.0",
  });
});

// Mount modular sub-routers
app.route("/api/projects", projectsRouter);
app.route("/api/projects", versionsRouter); // /api/projects/:projectId/versions...
app.route("/api/shots", shotsRouter);
app.route("/api/generate", generationRouter);
app.route("/api/export", exportRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/assets", assetsRouter);

export default app;
