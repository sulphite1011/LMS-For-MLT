import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import "@/models/User"; // registers the model used by populate
import { requireAdmin } from "@/lib/auth";
import { cleanLink } from "@/lib/notifications";
import { parseSemesterValue } from "@/lib/semesters";

function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (message.includes("Forbidden")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

/** GET /api/notifications/manage — admin: notifications they sent; superAdmin: all. */
export async function GET() {
  try {
    const user = await requireAdmin();
    await dbConnect();
    const filter = user.role === "superAdmin" ? {} : { createdBy: user._id };
    const items = await Notification.find(filter)
      .select("title message kind semester link createdAt createdBy")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json(items, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const res = authError(error);
    if (res) return res;
    console.error("GET /api/notifications/manage error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

/** POST /api/notifications/manage — admin+: { title, message?, link?, semester? (omit/null = all students) }. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();
    if (!title || title.length > 120) {
      return NextResponse.json({ error: "Title is required (120 characters max)" }, { status: 400 });
    }
    if (message.length > 600) return NextResponse.json({ error: "Message is too long (600 characters max)" }, { status: 400 });

    const hasSemester = body.semester !== null && body.semester !== undefined && body.semester !== "";
    const semester = parseSemesterValue(body.semester);
    if (hasSemester && !semester) return NextResponse.json({ error: "Choose a semester from 1 to 8" }, { status: 400 });

    const rawLink = typeof body.link === "string" ? body.link.trim() : "";
    const link = cleanLink(rawLink);
    if (rawLink && !link) {
      return NextResponse.json({ error: "Link must start with / or https://" }, { status: 400 });
    }

    await dbConnect();
    const created = await Notification.create({
      kind: "custom",
      title,
      message,
      semester: semester ?? null,
      link,
      createdBy: user._id,
    });
    return NextResponse.json({ _id: created._id }, { status: 201 });
  } catch (error) {
    const res = authError(error);
    if (res) return res;
    console.error("POST /api/notifications/manage error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
