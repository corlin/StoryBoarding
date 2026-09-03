import { Hono } from "hono";
import { eq, or } from "drizzle-orm";
import { getDb, ensureSchema, Bindings } from "../db/client";
import { users } from "../db/schema";
import { hashPassword, verifyPassword, signJwt, getAuthUser } from "../lib/auth";
import { maskApiKey, encryptUserSecret } from "../lib/crypto";

const router = new Hono<{ Bindings: Bindings }>();

// POST /api/auth/register
router.post("/register", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const body = await c.req.json();
    const email = (body.email || "").trim().toLowerCase();
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!email || !email.includes("@")) {
      return c.json({ detail: "请输入有效的电子邮箱地址" }, 400);
    }
    if (!username || username.length < 2) {
      return c.json({ detail: "昵称长度不能少于 2 个字符" }, 400);
    }
    if (!password || password.length < 6) {
      return c.json({ detail: "密码长度不能少于 6 个字符" }, 400);
    }

    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))
      .get();

    if (existing) {
      if (existing.email === email) {
        return c.json({ detail: "该邮箱已被注册，请直接登录" }, 400);
      }
      return c.json({ detail: "该昵称已被使用，请更换其他昵称" }, 400);
    }

    // Hash password with Web Crypto PBKDF2
    const { hash, salt } = await hashPassword(password);
    const userId = crypto.randomUUID();

    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        username,
        passwordHash: hash,
        salt,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
        customSettings: JSON.stringify({
          imageModel: "bytedance-seed/seedream-5-0-lite",
        }),
      })
      .returning();

    const token = await signJwt({
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username,
    });

    return c.json(
      {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          avatar_url: newUser.avatarUrl,
          custom_settings: JSON.parse(newUser.customSettings || "{}"),
          created_at: newUser.createdAt,
        },
      },
      201
    );
  } catch (err: any) {
    console.error("[Auth Register Error]:", err);
    return c.json({ detail: `注册服务异常: ${err?.message || err}` }, 500);
  }
});

// POST /api/auth/login
router.post("/login", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const body = await c.req.json();
    const account = (body.account || body.email || body.username || "").trim();
    const password = body.password || "";

    if (!account || !password) {
      return c.json({ detail: "请输入账号与密码" }, 400);
    }

    const user = await db
      .select()
      .from(users)
      .where(or(eq(users.email, account.toLowerCase()), eq(users.username, account)))
      .get();

    if (!user) {
      return c.json({ detail: "账号或密码错误，请重试" }, 401);
    }

    const isValid = await verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return c.json({ detail: "账号或密码错误，请重试" }, 401);
    }

    const token = await signJwt({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatarUrl,
        custom_settings: JSON.parse(user.customSettings || "{}"),
        created_at: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error("[Auth Login Error]:", err);
    return c.json({ detail: `登录服务异常: ${err?.message || err}` }, 500);
  }
});

// Masked custom settings helper for safe API responses
function getSafeCustomSettings(customSettingsStr: string | null | undefined) {
  let parsed: any = {};
  try {
    if (customSettingsStr) parsed = JSON.parse(customSettingsStr);
  } catch (e) {}

  const hasLlmKey = Boolean(parsed.llmApiKey && parsed.llmApiKey.trim());
  const hasImageKey = Boolean(parsed.imageApiKey && parsed.imageApiKey.trim());

  return {
    ...parsed,
    has_llm_key: hasLlmKey,
    has_image_key: hasImageKey,
    llmApiKey: hasLlmKey ? "••••••••" : "",
    imageApiKey: hasImageKey ? "••••••••" : "",
  };
}

// GET /api/auth/me
router.get("/me", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);

    if (!authUser) {
      return c.json({ detail: "未登录或登录已过期" }, 401);
    }

    const user = await db.select().from(users).where(eq(users.id, authUser.userId)).get();
    if (!user) {
      return c.json({ detail: "用户不存在" }, 404);
    }

    return c.json({
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatarUrl,
      custom_settings: getSafeCustomSettings(user.customSettings),
      created_at: user.createdAt,
    });
  } catch (err: any) {
    console.error("[Auth Me Error]:", err);
    return c.json({ detail: "获取用户状态失败" }, 500);
  }
});

// PUT /api/auth/profile
router.put("/profile", async (c) => {
  try {
    await ensureSchema(c.env.DB);
    const db = getDb(c.env.DB);
    const authHeader = c.req.header("Authorization");
    const authUser = await getAuthUser(authHeader);

    if (!authUser) {
      return c.json({ detail: "未登录或登录已过期" }, 401);
    }

    const body = await c.req.json();
    const updates: any = {};

    if (body.username !== undefined) {
      const nextName = body.username.trim();
      if (nextName.length >= 2) updates.username = nextName;
    }
    if (body.avatar_url !== undefined) {
      updates.avatarUrl = body.avatar_url;
    }
    updates.updatedAt = new Date().toISOString();

    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, authUser.userId)).returning();

    return c.json({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      avatar_url: updatedUser.avatarUrl,
      custom_settings: getSafeCustomSettings(updatedUser.customSettings),
      created_at: updatedUser.createdAt,
    });
  } catch (err: any) {
    console.error("[Auth Profile Error]:", err);
    return c.json({ detail: "更新个人设置失败" }, 500);
  }
});

export default router;
