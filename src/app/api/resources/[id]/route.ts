import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const resource = await Resource.findById(id)
      .select("-fileData.fileContent -bannerImageData")
      .populate("subjectId", "name")
      .lean();

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error("GET /api/resources/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const formData = await req.formData();

    const title = formData.get("title") as string;
    const subjectId = formData.get("subjectId") as string;
    const resourceType = formData.get("resourceType") as string;
    const description = formData.get("description") as string;
    const youtubeUrlsRaw = formData.get("youtubeUrls") as string;
    const bannerImageUrl = formData.get("bannerImageUrl") as string;
    const externalLink = formData.get("externalLink") as string;
    const file = formData.get("file") as File | null;
    const bannerFile = formData.get("bannerImage") as File | null;
    const removeFile = formData.get("removeFile") === "true";

    if (!title || !subjectId || !resourceType) {
      return NextResponse.json(
        { error: "Title, subject, and resource type are required" },
        { status: 400 }
      );
    }

    const youtubeUrls = youtubeUrlsRaw
      ? JSON.parse(youtubeUrlsRaw).filter(Boolean)
      : [];

    await dbConnect();

    const updateData: Record<string, unknown> = {
      title: title.trim(),
      subjectId,
      resourceType,
      description: description?.trim() || "",
      youtubeUrls,
    };

    if (bannerImageUrl !== undefined) {
      updateData.bannerImageUrl = bannerImageUrl;
    }

    if (bannerFile && bannerFile.size > 0) {
      const bannerBuffer = Buffer.from(await bannerFile.arrayBuffer());
      const bannerBase64 = `data:${bannerFile.type};base64,${bannerBuffer.toString("base64")}`;
      updateData.bannerImageUrl = bannerBase64;
    }

    if (removeFile) {
      updateData.fileData = undefined;
    } else if (file && file.size > 0) {
      const maxSize = parseInt(process.env.MAX_FILE_SIZE || "10485760");
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File size exceeds 10MB limit" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      updateData.fileData = {
        fileType: file.type.includes("pdf") ? "pdf" : "image",
        fileContent: buffer,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
    } else if (externalLink) {
      updateData.fileData = {
        fileType: "external",
        externalLink,
      };
    }

    const resource = await Resource.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .select("-fileData.fileContent -bannerImageData")
      .populate("subjectId", "name");

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(resource);
  } catch (error: unknown) {
    console.error("PUT /api/resources/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update resource";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await dbConnect();

    const resource = await Resource.findByIdAndDelete(id);
    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete resource";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
