// Shared Cloudflare R2 image persistence & Base64 decoding utilities

export function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "").trim();
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function detectBase64MimeType(base64: string): string {
  const clean = base64.replace(/^data:[^;]+;base64,/, "").trim();
  if (clean.startsWith("/9j/")) return "image/jpeg";
  if (clean.startsWith("iVBOR")) return "image/png";
  if (clean.startsWith("R0lGOD")) return "image/gif";
  if (clean.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

/**
 * Download an external HTTP(S) media file (image / video / audio) and persist to R2.
 * Returns the public asset URL on success, null on failure.
 * @param mediaSource  HTTP(S) URL of the source media
 * @param r2Key        Destination key in the R2 bucket
 * @param storage      R2 bucket binding
 * @param timeoutMs    Fetch timeout in milliseconds (default 60s for larger files)
 * @param acceptHeader Accept header for the upstream fetch
 */
export async function saveMediaToR2(
  mediaSource: string,
  r2Key: string,
  storage?: R2Bucket,
  timeoutMs: number = 60000,
  acceptHeader: string = "*/*"
): Promise<string | null> {
  if (!storage) {
    console.warn(`[R2 Storage] storage binding is undefined, cannot save ${r2Key}`);
    return null;
  }
  if (!mediaSource.startsWith("http://") && !mediaSource.startsWith("https://")) {
    console.warn(`[R2 Storage] source is not an HTTP(S) URL, cannot fetch: ${mediaSource.slice(0, 60)}`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(mediaSource, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: acceptHeader,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "application/octet-stream";
        await storage.put(r2Key, buffer, {
          httpMetadata: { contentType },
        });
        console.log(`[R2 Storage] Successfully stored external media to R2: ${r2Key} (${buffer.byteLength} bytes, type=${contentType})`);
        return `https://storyboarding-api.caifu.social/api/assets/${r2Key}`;
      } else {
        console.warn(`[R2 Storage] Upstream fetch failed: HTTP ${res.status} for ${mediaSource.slice(0, 80)}`);
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn(`[R2 Storage] Upstream fetch timed out or failed:`, fetchErr?.message || fetchErr);
    }
  } catch (err) {
    console.warn(`[R2 Storage] Failed to persist media to R2 (${r2Key}):`, err);
  }

  return null;
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
    const isHttp = imageSource.startsWith("http://") || imageSource.startsWith("https://");
    const isDataUrl = imageSource.startsWith("data:image/");
    const isRawBase64 = !isHttp && !isDataUrl && imageSource.length > 50;

    // 1. Handle Data URL or Raw Base64
    if (isDataUrl || isRawBase64) {
      let contentType = "image/jpeg";
      if (isDataUrl) {
        const match = imageSource.match(/^data:([^;]+);base64,/);
        if (match?.[1]) contentType = match[1];
      } else {
        contentType = detectBase64MimeType(imageSource);
      }

      const bytes = base64ToUint8Array(imageSource);
      await storage.put(r2Key, bytes, {
        httpMetadata: { contentType },
      });
      console.log(`[R2 Storage] Successfully stored base64 image to R2: ${r2Key} (${bytes.length} bytes, type=${contentType})`);
      return `https://storyboarding-api.caifu.social/api/assets/${r2Key}`;
    }

    // 2. Handle HTTP/HTTPS URLs
    if (isHttp) {
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
          return `https://storyboarding-api.caifu.social/api/assets/${r2Key}`;
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
