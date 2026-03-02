import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import Subject from "@/models/Subject";
import Comment from "@/models/Comment";
import User from "@/models/User";
import mongoose from "mongoose";
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

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (type) filter.resourceType = type;
    if (subject) filter.subjectId = subject;

    if (isAdminDashboard) {
      const currentUser = await getAuthUser();
      if (currentUser?.role === "admin") {
        filter.createdBy = currentUser._id;
      }
    }

    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .select("-fileData.fileContent -bannerImageData -files.fileContent")
        .populate("subjectId", "name")
        .populate("createdBy", "clerkId")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Resource.countDocuments(filter),
    ]);

    if (resources.length === 0) {
      return NextResponse.json({ resources: [], total: 0, pages: 0, page });
    }

    const resourceIds = resources.map(r => new mongoose.Types.ObjectId(String(r._id)));
    const ratingStats = await Comment.aggregate([
      { $match: { resourceId: { $in: resourceIds }, rating: { $exists: true, $gt: 0 } } },
      { $group: { _id: "$resourceId", averageRating: { $avg: "$rating" }, totalRatings: { $sum: 1 } } }
    ]);

    const resourcesWithRatings = resources.map(resource => {
      const stats = ratingStats.find(s => String(s._id) === String(resource._id));
      return {
        ...resource,
        averageRating: stats ? Number(stats.averageRating.toFixed(1)) : 0,
        totalRatings: stats ? stats.totalRatings : 0
      };
    });

    return NextResponse.json({ resources: resourcesWithRatings, total, pages: Math.ceil(total / limit), page });
  } catch (error) {
    console.error("GET /api/resources error:", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
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
    const externalLinksRaw = formData.get("externalLinks") as string;
    // Legacy single external link
    const legacyExternalLink = formData.get("externalLink") as string;
    const bannerFile = formData.get("bannerImage") as File | null;

    // Multiple file uploads
    const files = formData.getAll("files") as File[];
    // Legacy single file
    const legacyFile = formData.get("file") as File | null;

    if (!title || !subjectName || !resourceType) {
      return NextResponse.json(
        { error: "Title, subject, and resource type are required" },
        { status: 400 }
      );
    }

    const youtubeUrls = youtubeUrlsRaw ? JSON.parse(youtubeUrlsRaw).filter(Boolean) : [];

    await dbConnect();

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
      files: [],
      externalLinks: [],
    };

    if (bannerFile && bannerFile.size > 0) {
      const bannerBuffer = Buffer.from(await bannerFile.arrayBuffer());
      const bannerBase64 = `data:${bannerFile.type};base64,${bannerBuffer.toString("base64")}`;
      resourceData.bannerImageUrl = bannerBase64;
    }

    // Handle multiple files
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || "10485760");
    const processedFiles = [];
    const allFiles = files.length > 0 ? files : (legacyFile ? [legacyFile] : []);

    for (const file of allFiles) {
      if (!file || file.size === 0) continue;
      if (file.size > maxSize) {
        return NextResponse.json({ error: `File "${file.name}" exceeds 10MB limit` }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      processedFiles.push({
        fileType: file.type.includes("pdf") ? "pdf" : "image",
        fileContent: buffer,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    }
    resourceData.files = processedFiles;

    // Handle external links
    let parsedExternalLinks: { label: string; url: string; id?: string }[] = [];
    if (externalLinksRaw) {
      try {
        parsedExternalLinks = JSON.parse(externalLinksRaw).filter((l: any) => l.url?.trim());
      } catch (e) {
        console.error("Failed to parse externalLinks json", e);
      }
    } else if (legacyExternalLink) {
      parsedExternalLinks = [{ label: "External Link", url: legacyExternalLink }];
    }

    // Create new externalLinks objects omitting internal tracking IDs
    resourceData.externalLinks = parsedExternalLinks.map(l => ({
      label: l.label,
      url: l.url
    }));

    // Legacy fileData for BC (use first file if present)
    if (processedFiles.length > 0) {
      resourceData.fileData = processedFiles[0];
    } else if (parsedExternalLinks.length > 0) {
      resourceData.fileData = { fileType: "external", externalLink: parsedExternalLinks[0].url };
    }

    const resource = await Resource.create(resourceData);

    return NextResponse.json(
      { _id: resource._id, title: resource.title },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/resources error:", error);
    const message = error instanceof Error ? error.message : "Failed to create resource";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
