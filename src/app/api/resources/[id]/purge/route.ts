import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import Comment from "@/models/Comment";
import { requireAdmin } from "@/lib/auth";

/** Super Admin, the owning admin, or the admin who deleted it. */
async function loadTrashed(id: string, user: { _id: unknown; role: string }) {
  if (!mongoose.isValidObjectId(id)) return null;
  const item = await Resource.findOne({ _id: id, deletedAt: { $ne: null } }).select("createdBy deletedBy").lean();
  if (!item) return null;
  const me = String(user._id);
  const allowed =
    user.role === "superAdmin" || String(item.createdBy) === me || (item.deletedBy && String(item.deletedBy) === me);
  return allowed ? item : null;
}

function errorResponse(error: unknown, label: string) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
  if (status === 500) console.error(label, error);
  return NextResponse.json({ error: message }, { status });
}

/** DELETE /api/resources/[id]/purge — delete a recycled resource permanently (cannot be undone). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    await dbConnect();
    const { id } = await params;
    if (!(await loadTrashed(id, user))) {
      return NextResponse.json({ error: "Not found in the recycle bin" }, { status: 404 });
    }
    await Comment.deleteMany({ resourceId: id });
    await Resource.deleteOne({ _id: id, deletedAt: { $ne: null } });
    revalidatePath(`/resource/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/resources/[id]/purge error:");
  }
}
