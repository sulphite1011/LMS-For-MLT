import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { parseDataUri } from "@/lib/banner";

/**
 * GET /api/avatars/[clerkId]
 *
 * Serves a user's uploaded avatar (stored as a base64 data URI in `User.customAvatar`) as a real,
 * cacheable image. Comment payloads reference this URL (with `?v=<hash>` for cache-busting)
 * instead of repeating the base64 string on every comment. Same visibility as before: avatars
 * were already public in the comments API. No data is modified or migrated.
 */
const NOT_FOUND_HEADERS = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clerkId: string }> }
) {
  try {
    const { clerkId } = await params;
    if (!clerkId || clerkId.length > 200) {
      return new NextResponse(null, { status: 404, headers: NOT_FOUND_HEADERS });
    }

    await dbConnect();
    const user = await User.findOne({ clerkId }).select("customAvatar").lean();
    const stored = user?.customAvatar?.trim();
    if (!stored) {
      return new NextResponse(null, { status: 404, headers: NOT_FOUND_HEADERS });
    }

    if (/^https?:\/\//i.test(stored)) {
      return NextResponse.redirect(stored, { status: 307, headers: { "Cache-Control": "public, max-age=300" } });
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
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    };

    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: baseHeaders });
    }

    return new NextResponse(new Uint8Array(parsed.buffer), {
      status: 200,
      headers: { ...baseHeaders, "Content-Type": parsed.mime, "Content-Length": String(parsed.buffer.length) },
    });
  } catch (error) {
    console.error("GET /api/avatars/[clerkId] error:", error);
    return new NextResponse(null, { status: 500, headers: NOT_FOUND_HEADERS });
  }
}
