import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import McqUnit from "@/models/McqUnit";

/**
 * GET /api/mcq/units/[id]/html — public. Serves the uploaded MCQ page of a unit.
 *
 * The file is untrusted content, so it is served with a Content-Security-Policy `sandbox`
 * (scripts allowed, but NO `allow-same-origin`): the page runs in an opaque origin and cannot
 * read this site's cookies, storage or APIs. `frame-ancestors 'self'` limits embedding to this site.
 * Consequence: scripts inside the page cannot use localStorage/cookies.
 *
 * With `?v=<updatedAt>` (what the MCQ page uses) the response is cached "immutable"; a replaced
 * file gets a new `v`, hence a new URL.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    await dbConnect();
    const unit = await McqUnit.findById(id).select("+htmlContent hasPage").lean();
    if (!unit || !unit.hasPage || !unit.htmlContent) {
      return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const versioned = req.nextUrl.searchParams.has("v");
    return new NextResponse(unit.htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "sandbox allow-scripts allow-popups allow-forms allow-modals; frame-ancestors 'self'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": versioned
          ? "public, max-age=31536000, s-maxage=31536000, immutable"
          : "public, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET /api/mcq/units/[id]/html error:", error);
    return new NextResponse("Failed to load page", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
