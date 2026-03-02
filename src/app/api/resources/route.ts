import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import Subject from "@/models/Subject";
import Comment from "@/models/Comment";
import { requireAdmin, getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const subject = searchParams.get("subject");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isAdminDashboard = searchParams.get("admin") === "true";

    const currentUser = await getAuthUser();

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (type) {
      filter.resourceType = type;
    }
    if (subject) {
      filter.subjectId = subject;
    }

    // If it's the admin dashboard, filter by ownership unless superAdmin
    if (isAdminDashboard && currentUser) {
      if (currentUser.role === "admin") {
        filter.createdBy = currentUser._id;
      }
    }

    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .select("-fileData.fileContent -bannerImageData")
        .populate("subjectId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Resource.countDocuments(filter),
    ]);

    // Fetch rating stats for all resources
    const resourceIds = resources.map(r => r._id);
    const ratingStats = await Comment.aggregate([
      { $match: { resourceId: { $in: resourceIds }, rating: { $exists: true } } },
      {
        $group: {
          _id: "$resourceId",
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const resourcesWithRatings = resources.map(resource => {
      const stats = ratingStats.find(s => s._id.toString() === resource._id.toString());
      return {
        ...resource,
        averageRating: stats ? stats.averageRating.toFixed(1) : 0,
        totalRatings: stats ? stats.totalRatings : 0
      };
    });

    return NextResponse.json({
      resources: resourcesWithRatings,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    console.error("GET /api/resources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
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

    const resourceData: Record<string, unknown> = {
      title: title.trim(),
      subjectId: subject._id,
      resourceType,
      description: description?.trim() || "",
      youtubeUrls,
      bannerImageUrl: bannerImageUrl || "",
      createdBy: user._id,
    };

    // Handle banner image upload
    if (bannerFile && bannerFile.size > 0) {
      const bannerBuffer = Buffer.from(await bannerFile.arrayBuffer());
      const bannerBase64 = `data:${bannerFile.type};base64,${bannerBuffer.toString("base64")}`;
      resourceData.bannerImageUrl = bannerBase64;
    }

    // Handle file upload
    if (file && file.size > 0) {
      const maxSize = parseInt(process.env.MAX_FILE_SIZE || "10485760");
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File size exceeds 10MB limit" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      resourceData.fileData = {
        fileType: file.type.includes("pdf") ? "pdf" : "image",
        fileContent: buffer,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
    } else if (externalLink) {
      resourceData.fileData = {
        fileType: "external",
        externalLink,
      };
    }

    const resource = await Resource.create(resourceData);

    return NextResponse.json(
      { _id: resource._id, title: resource.title },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/resources error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create resource";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
