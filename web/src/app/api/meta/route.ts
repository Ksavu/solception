import { NextResponse } from "next/server";

// Serves Metaplex-style token metadata JSON built from query params, so a token
// can be launched without uploading a JSON file first.
//   /api/meta?n=<name>&s=<symbol>&i=<image url>
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const name = (q.get("n") || "").slice(0, 32);
  const symbol = (q.get("s") || "").slice(0, 10);
  const imageRaw = q.get("i") || "";
  const image = /^https?:\/\//.test(imageRaw) ? imageRaw : "";
  const description = (q.get("d") || `${name} — launched on Solception`).slice(0, 280);

  return NextResponse.json(
    { name, symbol, description, image, properties: { files: image ? [{ uri: image, type: "image" }] : [], category: "image" } },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
      },
    }
  );
}
