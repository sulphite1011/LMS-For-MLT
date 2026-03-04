import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // 1. Find the pending admin record
    const pendingAdmin = await User.findOne({
      username: username.trim(),
      isPending: true,
      role: "admin",
    });

    if (!pendingAdmin || !pendingAdmin.password) {
      return NextResponse.json(
        { error: "Invalid credentials or claim already processed" },
        { status: 404 }
      );
    }

    // 2. Verify temporary password
    const isValid = await bcrypt.compare(password, pendingAdmin.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid temporary password" },
        { status: 401 }
      );
    }

    // 3. Promote current user and delete pending record
    const updatedUser = await User.findOneAndUpdate(
      { clerkId: currentUser.clerkId },
      {
        role: "admin",
        username: pendingAdmin.username,
        // Update userHandle if it's currently a default one
        userHandle: pendingAdmin.userHandle || undefined,
      },
      { new: true }
    );

    // Remove the pending placeholder
    await User.deleteOne({ _id: pendingAdmin._id });

    return NextResponse.json({
      success: true,
      message: "Admin status claimed successfully",
      role: updatedUser?.role,
    });
  } catch (error: any) {
    console.error("[Claim Admin Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to claim admin status" },
      { status: 500 }
    );
  }
}
