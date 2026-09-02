// Native Web Crypto API AES-256-GCM Encryption & Key Derivation for Edge / Cloudflare Workers

const DEFAULT_MASTER_SECRET = "storyboarding-vault-master-key-2026-edge-secured";

// Base64 Helpers
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive a unique 256-bit AES-GCM key per user using PBKDF2-SHA256
async function deriveUserKey(userSalt: string, masterSecret?: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secret = masterSecret || DEFAULT_MASTER_SECRET;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(`user-vault-salt:${userSalt || "default-salt"}`),
      iterations: 10000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a user secret (e.g. API Key) using AES-256-GCM
 * Output format: enc:v1:<12-byte-IV-base64>:<ciphertext-with-tag-base64>
 */
export async function encryptUserSecret(
  plaintext: string,
  userSalt: string,
  masterSecret?: string
): Promise<string> {
  if (!plaintext || typeof plaintext !== "string") return "";
  const trimmed = plaintext.trim();
  if (!trimmed) return "";

  // If already encrypted, return as is
  if (trimmed.startsWith("enc:v1:")) return trimmed;

  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit standard AES-GCM IV
  const key = await deriveUserKey(userSalt, masterSecret);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    enc.encode(trimmed)
  );

  const ivB64 = toBase64(iv);
  const cipherB64 = toBase64(new Uint8Array(ciphertextBuffer));

  return `enc:v1:${ivB64}:${cipherB64}`;
}

/**
 * Decrypt a user secret from D1 storage
 * Automatically handles legacy plaintext if not prefixed with enc:v1:
 */
export async function decryptUserSecret(
  storedValue: string | null | undefined,
  userSalt: string,
  masterSecret?: string
): Promise<string> {
  if (!storedValue || typeof storedValue !== "string") return "";
  const trimmed = storedValue.trim();
  if (!trimmed) return "";

  // Legacy compatibility: If not encrypted, return raw string
  if (!trimmed.startsWith("enc:v1:")) {
    return trimmed;
  }

  try {
    const parts = trimmed.split(":");
    if (parts.length !== 4) return ""; // Format: enc : v1 : iv : ciphertext

    const iv = fromBase64(parts[2]);
    const cipherBytes = fromBase64(parts[3]);
    const key = await deriveUserKey(userSalt, masterSecret);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      cipherBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error("[Vault Decryption Error]: Failed to decrypt secret with provided salt", err);
    return "";
  }
}

/**
 * Security Masking Helper: Never send raw API keys to browser
 */
export function maskApiKey(key: string | null | undefined): string {
  if (!key || typeof key !== "string") return "";
  const trimmed = key.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`;
}
