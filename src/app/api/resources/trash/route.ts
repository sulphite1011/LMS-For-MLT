import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import "@/models/Subject"; // registers the model used by populate
import "@/models/User"; // registers the model used by populate
import { requireAdmin } from "@/lib/auth";
import { RECYCLE_RETENTION_DAYS, daysLeft, purgeExpiredResources } from "@/lib/recycleBin";

/**
 * GET /api/resources/trash — the recycle bin.
 *  - admin: resources they own (or deleted themselves)
 *  - superAdmin: every bin; `?owner=<user id>` shows one admin's bin
 * Items older than 30 days are purged first. Never returns files or banners.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin();
    await dbConnect();
    await purgeExpiredResources();

    const filter: Record<string, unknown> = { deletedAt: { $ne: null } };
    if (user.role === "superAdmin") {
      const owner = req.nextUrl.searchParams.get("owner");
      if (owner && mongoose.isValidObjectId(owner)) filter.createdBy = owner;
    } else {
      filter.$or = [{ createdBy: user._id }, { deletedBy: user._id }];
    }

    const items = await Resource.find(filter)
      .select("title resourceType subjectId createdBy createdAt deletedAt deletedBy isOrphaned formerOwnerName")
      .populate("subjectId", "name")
      .populate("createdBy", "username")
      .populate("deletedBy", "username")
      .sort({ deletedAt: -1 })
      .limit(200)
      .lean();

    const isSuper = user.role === "superAdmin";
    const result = items.map((r) => {
      const owner = r.createdBy as unknown as { _id?: unknown; username?: string } | null;
      const deleter = r.deletedBy as unknown as { username?: string } | null;
      return {
        _id: String(r._id),
        title: r.title,
        resourceType: r.resourceType,
        subjectId: r.subjectId,
        createdAt: r.createdAt,
        deletedAt: r.deletedAt,
        daysLeft: r.deletedAt ? daysLeft(r.deletedAt) : 0,
        isOrphaned: !!r.isOrphaned,
        authorName: r.isOrphaned ? "Unknown Author" : owner?.username || "Unknown Author",
        ownerId: isSuper && !r.isOrphaned && owner?._id ? String(owner._id) : undefined,
        deletedByName: deleter?.username,
        formerOwnerName: isSuper ? r.formerOwnerName : undefined,
      };
    });

    return NextResponse.json(
      { items: result, retentionDays: RECYCLE_RETENTION_DAYS },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load recycle bin";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    if (status === 500) console.error("GET /api/resources/trash error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
