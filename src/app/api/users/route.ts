import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { requireSuperAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { generatePassword } from "@/lib/utils";

export async function GET() {
  try {
    await requireSuperAdmin();
    await dbConnect();

    const users = await User.find()
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(users);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch users";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const superAdmin = await requireSuperAdmin();
    const { username } = await req.json();

    if (!username || !username.trim()) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    const tempPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await User.create({
      clerkId: `pending_${Date.now()}`,
      username: username.trim(),
      role: "admin",
      createdBy: superAdmin._id,
    });

    return NextResponse.json(
      {
        _id: user._id,
        username: user.username,
        role: user.role,
        tempPassword,
        hashedPassword,
        note: "Share the temporary password with the admin. They should change it on first login.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create user";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
