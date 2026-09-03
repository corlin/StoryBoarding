// Native Web Crypto API Auth Utilities for Cloudflare Workers & Node.js Edge Environments

const JWT_SECRET = "storyboarding-cinema-secret-key-2026-edge";

// 1. Password Hashing with PBKDF2-SHA256 (100,000 iterations)
export async function hashPassword(password: string, providedSalt?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const salt = providedSalt || crypto.randomUUID().replace(/-/g, "");
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign"]
  );

  const rawKey = (await crypto.subtle.exportKey("raw", derivedKey)) as ArrayBuffer;
  const hashHex = Array.from(new Uint8Array(rawKey))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { hash: hashHex, salt };
}

export async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}

// 2. Base64URL Encoding & Decoding for JWT with full UTF-8 / Unicode support
function base64UrlEncodeString(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToString(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// 3. JWT Signing & Verification (HMAC-SHA256)
export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export async function signJwt(payload: Omit<JwtPayload, "iat" | "exp">, expiresInSeconds: number = 30 * 24 * 3600): Promise<string> {
  const enc = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(fullPayload));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(dataToSign));
  const signatureB64 = base64UrlEncodeBytes(new Uint8Array(signature));

  return `${dataToSign}.${signatureB64}`;
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  if (!token) return null;
  try {
    const enc = new TextEncoder();
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const dataToVerify = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const binarySig = Uint8Array.from(atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify("HMAC", key, binarySig, enc.encode(dataToVerify));
    if (!isValid) return null;

    const payload: JwtPayload = JSON.parse(base64UrlDecodeToString(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}

// Helper to extract JWT payload from Request Authorization Header
export async function getAuthUser(authHeader?: string | null): Promise<JwtPayload | null> {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return null;
  return verifyJwt(match[1].trim());
}

// Single Source of Truth for User API Key & Model Settings (Zero Public Fallback with AES-256-GCM Decryption)
export async function getUserSettings(db: any, userId?: string) {
  let userSettings: any = {};
  let userSalt = "";

  if (userId) {
    try {
      const { users } = await import("../db/schema");
      const { eq } = await import("drizzle-orm");
      const user = await db.select().from(users).where(eq(users.id, userId)).get();
      if (user) {
        userSalt = user.salt;
        if (user.customSettings) {
          userSettings = JSON.parse(user.customSettings);
        }
      }
    } catch (e) {}
  }

  const { decryptUserSecret } = await import("./crypto");

  const rawLlmKey = (userSettings.llmApiKey || "").trim();
  const rawImageKey = (userSettings.imageApiKey || "").trim();

  // Decrypt ciphertext into in-memory plaintext
  const llmApiKey = rawLlmKey ? await decryptUserSecret(rawLlmKey, userSalt) : "";
  const imageApiKey = rawImageKey ? await decryptUserSecret(rawImageKey, userSalt) : llmApiKey;

  return {
    hasKey: !!llmApiKey,
    llmApiKey,
    llmApiBase: userSettings.llmApiBase || "https://openrouter.ai/api/v1",
    llmModel: userSettings.llmModel || "deepseek/deepseek-chat",
    imageApiKey,
    imageApiBase: userSettings.imageApiBase || "https://openrouter.ai/api/v1",
    imageModel: userSettings.imageModel || "google/imagen-3",
  };
}
