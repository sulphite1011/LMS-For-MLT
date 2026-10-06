import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import Subject from "@/models/Subject";
import { requireAdmin } from "@/lib/auth";
import { getBannerUrlMap, isOwnBannerRoute } from "@/lib/banner";
import { fetchResourceDetail } from "@/lib/resources";
import { revalidatePath } from "next/cache";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const resource = await fetchResourceDetail(id);

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      resource,
      {
        headers: {
          // Cache individual resource for 60s; serve stale for 2min while revalidating
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
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
    const user = await requireAdmin();
    const { id } = await params;
    const formData = await req.formData();

    const title = formData.get("title") as string;
    const subjectName = (formData.get("subjectName") as string)?.trim();
    const resourceType = formData.get("resourceType") as string;
    const description = formData.get("description") as string;
    const youtubeUrlsRaw = formData.get("youtubeUrls") as string;
    const bannerImageUrl = formData.get("bannerImageUrl") as string;
    const externalLink = formData.get("externalLink") as string;
    const file = formData.get("file") as File | null;
    const bannerFile = formData.get("bannerImage") as File | null;
    const removeFile = formData.get("removeFile") === "true";

    if (!title || !subjectName || !resourceType) {
      return NextResponse.json(
        { error: "Title, subject, and resource type are required" },
        { status: 400 }
      );
    }

    const youtubeUrls = youtubeUrlsRaw
      ? JSON.parse(youtubeUrlsRaw).filter(Boolean)
      : [];

    await dbConnect();

    // Find or create subject by name (case-insensitive)
    const subject = await Subject.findOneAndUpdate(
      { name: { $regex: new RegExp(`^${subjectName}$`, "i") } },
      { $setOnInsert: { name: subjectName, createdBy: user._id } },
      { upsert: true, new: true }
    );

    const updateData: Record<string, unknown> = {
      title: title.trim(),
      subjectId: subject._id,
      resourceType,
      description: description?.trim() || "",
      youtubeUrls,
    };

    // The edit form echoes back the banner URL it received from GET. For uploaded banners that is
    // this app's own /banner route, which must never overwrite the stored image data.
    if (bannerImageUrl !== undefined && !isOwnBannerRoute(bannerImageUrl, id)) {
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
      .select("-fileData.fileContent -bannerImageData -bannerImageUrl")
      .populate("subjectId", "name");

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    const bannerUrls = await getBannerUrlMap([id]);
    revalidatePath("/");
    revalidatePath(`/resource/${id}`);

    return NextResponse.json({
      ...resource.toJSON(),
      bannerImageUrl: bannerUrls.get(String(resource._id)) ?? "",
    });
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

    revalidatePath("/");
    revalidatePath(`/resource/${id}`);

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
