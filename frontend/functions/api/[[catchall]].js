// Cloudflare Pages Function: transparent reverse proxy for all /api/* requests
// Allows https://storyboarding.caifu.social/api/* to proxy to https://storyboarding-api.caifu.social/api/*

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = new URL(`https://storyboarding-api.caifu.social${url.pathname}${url.search}`);

  const modifiedHeaders = new Headers(context.request.headers);
  modifiedHeaders.set("X-Forwarded-Host", url.host);

  const backendResponse = await fetch(targetUrl.toString(), {
    method: context.request.method,
    headers: modifiedHeaders,
    body: context.request.method !== "GET" && context.request.method !== "HEAD" ? context.request.body : undefined,
    redirect: "follow",
  });

  const responseHeaders = new Headers(backendResponse.headers);
  responseHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}
