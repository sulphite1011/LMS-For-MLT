import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import { requireSuperAdmin } from "@/lib/auth";

/**
 * PATCH /api/resources/[id]/owner — Super Admin only. Body: { action: "claim" }
 * Takes ownership of an orphaned ("Unknown Author") resource. Leaving a resource as
 * "Unknown Author" needs no action. The former owner is cleared once claimed.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const superAdmin = await requireSuperAdmin();
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Resource not found" }, { status: 404 });

    const { action } = await req.json();
    if (action !== "claim") return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const updated = await Resource.findOneAndUpdate(
      { _id: id, isOrphaned: true },
      { $set: { createdBy: superAdmin._id, isOrphaned: false }, $unset: { formerOwnerId: "", formerOwnerName: "" } }
    ).select("_id");
    if (!updated) return NextResponse.json({ error: "Resource is not orphaned" }, { status: 404 });

    revalidatePath("/");
    revalidatePath(`/resource/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message.includes("Forbidden")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("PATCH /api/resources/[id]/owner error:", error);
    return NextResponse.json({ error: "Failed to update owner" }, { status: 500 });
  }
}
