import { NextResponse } from "next/server";
import { modelFileUrl, ALLOWED_MODEL_FILES, type AllowedModelFile } from "@/lib/vision/model-files";

export const runtime = "nodejs";
export const dynamic = "force-static";

/**
 * Proxies the photo-model weights from Hugging Face, server-side.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS ROUTE EXISTS
 * ---------------------------------------------------------------------------
 * transformers.js fetches weights from huggingface.co directly from the browser by default. That
 * would break this project's headline privacy claim with an 11MB request to a third party from a
 * child's phone, and it would break the offline guarantee with a dependency on someone else's CDN.
 *
 * So the browser fetches from OUR origin and this route fetches from Hugging Face. The client never
 * speaks to a third party, which is the same invariant `npm run check:privacy` enforces.
 *
 * This is server-to-server, and it is a fixed list of files, so it cannot be used to proxy anything
 * arbitrary. See ALLOWED_MODEL_FILES.
 */

export function generateStaticParams() {
  return ALLOWED_MODEL_FILES.map((file) => ({
    path: file.split("/"),
  }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (process.env.GITHUB_PAGES === "true") {
    return NextResponse.json({ status: "static-stub" });
  }

  const { path } = await params;
  const requested = path.join("/");

  // Path traversal and anything not on the allowlist is refused outright. The cast only happens
  // after this check, so `modelFileUrl` can never be handed an arbitrary upstream path.
  const allowed = ALLOWED_MODEL_FILES as readonly string[];
  if (!allowed.includes(requested)) {
    return NextResponse.json(
      { error: `Not an allowed model file: ${requested}` },
      { status: 404 },
    );
  }

  const target = modelFileUrl(requested as AllowedModelFile);
  const maxBytes = 96 * 1024 * 1024; // the vision tower is ~11MB; this is a generous ceiling

  try {
    const upstream = await fetch(target, {
      headers: {
        // Identify ourselves to Hugging Face. They ask for this and rate-limit anonymous traffic.
        "User-Agent": "Sphinx/0.1 (open-source hunt builder; +https://github.com/your-handle/sphinx)",
      },
      // Cached at the edge: a class of children playing the same hunt should not re-download 11MB.
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream model host returned ${upstream.status}.` },
        { status: 502 },
      );
    }

    const declared = Number(upstream.headers.get("content-length") ?? "0");
    if (declared > maxBytes) {
      return NextResponse.json({ error: "Model file too large." }, { status: 413 });
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength > maxBytes) {
      return NextResponse.json({ error: "Model file too large." }, { status: 413 });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        // Immutable: these filenames never change for a given model revision.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Could not reach the model host: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 502 },
    );
  }
}