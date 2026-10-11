import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { purgeExpiredResources } from "@/lib/recycleBin";

/**
 * GET /api/cron/purge-recycle-bin — removes resources that have been in the recycle bin for more
 * than 30 days. Called once a day by Vercel Cron (see vercel.json). If the CRON_SECRET environment
 * variable is set, Vercel sends it as `Authorization: Bearer <secret>` and other callers are refused.
 * The purge only ever deletes items that are already expired, so it is safe to run at any time.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await dbConnect();
    const purged = await purgeExpiredResources();
    return NextResponse.json({ purged }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/cron/purge-recycle-bin error:", error);
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}
