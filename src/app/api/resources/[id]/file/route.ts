import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const index = searchParams.get("index");

    const resource = await Resource.findById(id).select(
      "fileData.fileContent fileData.fileName fileData.mimeType fileData.fileType files"
    );

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // New multiple files support
    if (resource.files && resource.files.length > 0) {
      const fileIndex = index !== null ? parseInt(index) : 0;
      const fileEntry = resource.files[fileIndex];
      if (!fileEntry || !fileEntry.fileContent) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      const buffer = fileEntry.fileContent;
      const mimeType = fileEntry.mimeType || "application/octet-stream";
      const fileName = fileEntry.fileName || "download";

      return new NextResponse(new Uint8Array(buffer as any), {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Content-Length": (buffer as any).length.toString(),
        },
      });
    }

    // Legacy single file fallback
    if (!resource.fileData?.fileContent) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = resource.fileData.fileContent;
    const mimeType = resource.fileData.mimeType || "application/octet-stream";
    const fileName = resource.fileData.fileName || "download";

    return new NextResponse(new Uint8Array(buffer as any), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": (buffer as any).length.toString(),
      },
    });
  } catch (error) {
    console.error("GET /api/resources/[id]/file error:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
