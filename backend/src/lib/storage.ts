// Shared Cloudflare R2 image persistence & Base64 decoding utilities

export function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function saveImageToR2(
  imageSource: string,
  r2Key: string,
  storage?: R2Bucket
): Promise<string | null> {
  if (!storage) {
    console.warn(`[R2 Storage] storage binding is undefined, cannot save ${r2Key}`);
    return null;
  }

  try {
    if (imageSource.startsWith("data:image/")) {
      const bytes = base64ToUint8Array(imageSource);
      await storage.put(r2Key, bytes, {
        httpMetadata: { contentType: "image/jpeg" },
      });
      console.log(`[R2 Storage] Successfully stored base64 image to R2: ${r2Key} (${bytes.length} bytes)`);
      return `/api/assets/${r2Key}`;
    }

    if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(imageSource, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "image/*,*/*",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "image/jpeg";
          await storage.put(r2Key, buffer, {
            httpMetadata: { contentType },
          });
          console.log(`[R2 Storage] Successfully stored external image to R2: ${r2Key} (${buffer.byteLength} bytes)`);
          return `/api/assets/${r2Key}`;
        } else {
          console.warn(`[R2 Storage] Upstream fetch image failed: HTTP ${res.status} for ${imageSource.slice(0, 80)}`);
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        console.warn(`[R2 Storage] Upstream fetch timed out or failed:`, fetchErr?.message || fetchErr);
      }
    }
  } catch (err) {
    console.warn(`[R2 Storage] Failed to persist image to R2 (${r2Key}):`, err);
  }

  return null;
}
