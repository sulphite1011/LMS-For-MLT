import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import { parseDataUri } from "@/lib/banner";

/**
 * GET /api/resources/[id]/banner
 *
 * Serves a resource's banner as a real, cacheable image. Existing banners are stored as
 * base64 data URIs in `bannerImageUrl`; this decodes them on read (no data migration).
 * External http(s) banner URLs are redirected to. Public, read-only — same visibility
 * the banner already had via GET /api/resources.
 *
 * The URL handed out by the list/detail APIs carries `?v=<updatedAt>`, so a changed
 * banner gets a new URL and the response can be cached "immutable".
 */
const NOT_FOUND_HEADERS = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return new NextResponse(null, { status: 404, headers: NOT_FOUND_HEADERS });
    }

    await dbConnect();
    const resource = await Resource.findById(id).select("bannerImageUrl").lean();
    const stored = resource?.bannerImageUrl?.trim();

    if (!stored) {
      return new NextResponse(null, { status: 404, headers: NOT_FOUND_HEADERS });
    }

    // External banner: send the browser to it (list APIs already return these URLs directly).
    if (/^https?:\/\//i.test(stored)) {
      return NextResponse.redirect(stored, {
        status: 307,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }

    const parsed = parseDataUri(stored);
    if (!parsed) {
      return new NextResponse(null, { status: 404, headers: NOT_FOUND_HEADERS });
    }

    const etag = `"${createHash("sha1").update(parsed.buffer).digest("hex")}"`;
    const baseHeaders: Record<string, string> = {
      ETag: etag,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // Defence in depth: if an SVG is ever opened directly, it can't run scripts.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    };

    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: baseHeaders });
    }

    return new NextResponse(new Uint8Array(parsed.buffer), {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Type": parsed.mime,
        "Content-Length": String(parsed.buffer.length),
      },
    });
  } catch (error) {
    console.error("GET /api/resources/[id]/banner error:", error);
    return new NextResponse(null, { status: 500, headers: NOT_FOUND_HEADERS });
  }
}
