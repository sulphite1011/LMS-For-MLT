import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";

export const dynamic = "force-dynamic"; // Ensure it's not cached

export async function GET() {
  try {
    // 1. Connect to DB
    await dbConnect();

    // 2. Perform a tiny operation (like counting a system collection)
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

    return NextResponse.json({
      status: "alive",
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Heartbeat Check Failed:", error);
    return NextResponse.json(
      { status: "error", message: "Database connection failed" },
      { status: 500 }
    );
  }
}
