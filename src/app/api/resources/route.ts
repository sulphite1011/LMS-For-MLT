import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resource from "@/models/Resource";
import Subject from "@/models/Subject";
import Comment from "@/models/Comment";
import User from "@/models/User";
import mongoose from "mongoose";
import { requireAdmin, getAuthUser } from "@/lib/auth";
import { handleApiError, AppErrors } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const subject = searchParams.get("subject");
    const semester = searchParams.get("semester");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isAdminDashboard = searchParams.get("admin") === "true";

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (type) filter.resourceType = type;
    if (subject) filter.subjectId = subject;
    if (semester) filter.semester = parseInt(semester);

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
        .populate("createdBy", "username userHandle clerkId")
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

    return NextResponse.json(
      { resources: resourcesWithRatings, total, pages: Math.ceil(total / limit), page },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    return handleApiError(error);
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
    const semester = parseInt(formData.get("semester") as string || "0");
    const legacyExternalLink = formData.get("externalLink") as string;
    const bannerFile = formData.get("bannerImage") as File | null;
    const files = formData.getAll("files") as File[];
    const legacyFile = formData.get("file") as File | null;

    if (!title || !subjectName || !resourceType) {
      throw AppErrors.BadRequest("Title, subject, and resource type are required");
    }

    const youtubeUrls = youtubeUrlsRaw ? JSON.parse(youtubeUrlsRaw).filter(Boolean) : [];

    await dbConnect();

    const subject = await Subject.findOneAndUpdate(
      { name: { $regex: new RegExp(`^${subjectName}$`, "i") } },
      { $setOnInsert: { name: subjectName, createdBy: user._id } },
      { upsert: true, new: true }
    );

    const resourceData: any = {
      title: title.trim(),
      subjectId: subject._id,
      resourceType,
      description: description?.trim() || "",
      semester: semester > 0 ? semester : undefined,
      youtubeUrls,
      bannerImageUrl: bannerImageUrl || "",
      createdBy: user._id,
      files: [],
      externalLinks: [],
    };

    if (bannerFile && bannerFile.size > 0) {
      const bannerBuffer = Buffer.from(await bannerFile.arrayBuffer());
      resourceData.bannerImageUrl = `data:${bannerFile.type};base64,${bannerBuffer.toString("base64")}`;
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE || "10485760");
    const processedFiles = [];
    const allFiles = files.length > 0 ? files : (legacyFile ? [legacyFile] : []);

    for (const file of allFiles) {
      if (!file || file.size === 0) continue;
      if (file.size > maxSize) {
        throw AppErrors.BadRequest(`File "${file.name}" exceeds 10MB limit`);
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

    if (processedFiles.length > 0) {
      resourceData.fileData = processedFiles[0];
    }

    let parsedExternalLinks = [];
    if (externalLinksRaw) {
      parsedExternalLinks = JSON.parse(externalLinksRaw).filter((l: any) => l.url?.trim());
    } else if (legacyExternalLink) {
      parsedExternalLinks = [{ label: "External Link", url: legacyExternalLink }];
    }

    resourceData.externalLinks = parsedExternalLinks.map((l: any) => ({
      label: l.label,
      url: l.url
    }));

    const resource = await Resource.create(resourceData);

    // Notifications logic
    if (resource.semester) {
      try {
        const { sendNotification } = await import("@/lib/notifications");
        const sem = resource.semester;
        let query: any = { clerkId: { $ne: user.clerkId } };

        if (typeof sem === "number") {
          query.$or = [
            { "notificationPreferences.receiveAll": true },
            { "notificationPreferences.subscribedSemesters": sem },
            { primarySemester: sem }
          ];
        }

        const usersToNotify = await User.find(query).select("clerkId");
        if (usersToNotify.length > 0) {
          const semLabel = typeof sem === "number" ? `Semester ${sem}` : String(sem);
          await Promise.all(usersToNotify.map(u =>
            sendNotification({
              recipientId: u.clerkId,
              type: "NEW_RESOURCE",
              title: "New Resource Available",
              message: `A new resource "${resource.title}" has been added to ${semLabel}.`,
              link: `/resource/${resource._id}`
            })
          ));
        }
      } catch (notifyError) {
        console.error("Failed to send resource notifications:", notifyError);
      }
    }

    return NextResponse.json(
      { _id: resource._id, title: resource.title },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
