const ALLOWED_HOSTS = new Set([
  "vscc.co.uk",
  "www.vscc.co.uk",
]);

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const target = url.searchParams.get("u");
  if (!target) return new Response("missing u", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return new Response("forbidden host", { status: 403 });
  }

  // Spoof the Referer so vscc.co.uk's hotlink protection lets the image through.
  const upstream = await fetch(parsed, {
    headers: {
      Referer: `${parsed.protocol}//${parsed.hostname}/`,
      "User-Agent":
        "Mozilla/5.0 (compatible; VSCC-Calendar/1.0; +https://vscc.co.uk)",
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(`upstream ${upstream.status}`, {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  const contentType =
    upstream.headers.get("content-type") ?? "image/jpeg";

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
