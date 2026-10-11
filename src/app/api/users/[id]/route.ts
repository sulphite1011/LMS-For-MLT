import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Resource from "@/models/Resource";
import { requireSuperAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const superAdmin = await requireSuperAdmin();
    const { id } = await params;

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user._id.toString() === superAdmin._id.toString()) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    if (user.role === "superAdmin") {
      return NextResponse.json(
        { error: "Cannot delete a super admin" },
        { status: 400 }
      );
    }

    // If it's a pending record (clerkId starts with pending_), we can delete it
    if (user.clerkId.startsWith("pending_")) {
      await User.findByIdAndDelete(id);
    } else {
      // Otherwise, just demote them to regular user
      const wasAdmin = user.role === "admin";
      user.role = "user";
      await user.save();

      // Their resources become "Unknown Author": hidden from everyone but the Super Admin, who can
      // see the former owner and claim them (see PATCH /api/resources/[id]/owner).
      if (wasAdmin) {
        await Resource.updateMany(
          { createdBy: user._id, isOrphaned: { $ne: true } },
          { $set: { isOrphaned: true, formerOwnerId: user._id, formerOwnerName: user.username } }
        );
        revalidatePath("/");
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete user";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
