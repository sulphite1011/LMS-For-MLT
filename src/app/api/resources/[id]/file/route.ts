import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const resource = await Resource.findById(id).select(
      "fileData.fileContent fileData.fileName fileData.mimeType fileData.fileType"
    );

    if (!resource || !resource.fileData?.fileContent) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = resource.fileData.fileContent;
    const mimeType = resource.fileData.mimeType || "application/octet-stream";
    const fileName = resource.fileData.fileName || "download";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": buffer.length.toString(),
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
