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
      return `/api/assets/${r2Key}`;
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
