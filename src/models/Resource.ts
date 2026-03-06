import mongoose, { Schema, Model, CallbackError } from "mongoose";
import Comment from "./Comment";

export interface IFileEntry {
  fileType: "pdf" | "image" | "external";
  fileContent?: Buffer;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  externalLink?: string;
  label?: string; // Optional label for display
}

export interface IExternalLink {
  label: string;
  url: string;
}

export interface IResourceDoc extends mongoose.Document {
  title: string;
  subjectId: mongoose.Types.ObjectId;
  resourceType: "Notes" | "Video" | "PDF" | "Reference" | "Quiz";
  bannerImageUrl?: string;
  bannerImageData?: Buffer;
  // Legacy single file (kept for BC)
  fileData?: IFileEntry;
  // New: multiple files
  files: IFileEntry[];
  // External links (non-YouTube)
  externalLinks: IExternalLink[];
  youtubeUrls: string[];
  description?: string;
  semester?: number | string;
  createdBy: mongoose.Types.ObjectId;
  viewsCount: number;
  likesCount: number;
  favoritesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const FileEntrySchema = new Schema<IFileEntry>({
  fileType: { type: String, enum: ["pdf", "image", "external"] },
  fileContent: { type: Buffer },
  fileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  externalLink: { type: String },
  label: { type: String },
});

const ExternalLinkSchema = new Schema<IExternalLink>({
  label: { type: String, default: "External Link" },
  url: { type: String, required: true },
});

const ResourceSchema = new Schema<IResourceDoc>(
  {
    title: { type: String, required: true, trim: true },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    resourceType: {
      type: String,
      enum: ["Notes", "Video", "PDF", "Reference", "Quiz"],
      required: true,
    },
    bannerImageUrl: { type: String },
    bannerImageData: { type: Buffer },
    // Legacy single file (kept for BC with existing data)
    fileData: {
      fileType: { type: String, enum: ["pdf", "image", "external"] },
      fileContent: { type: Buffer },
      fileName: { type: String },
      fileSize: { type: Number },
      mimeType: { type: String },
      externalLink: { type: String },
    },
    // New multiple files array
    files: [FileEntrySchema],
    // Non-YouTube external links
    externalLinks: [ExternalLinkSchema],
    youtubeUrls: [{ type: String }],
    description: { type: String, trim: true },
    semester: { type: Schema.Types.Mixed, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Cascade delete comments when a resource is deleted
ResourceSchema.pre("deleteOne", { document: true, query: false }, async function () {
  await Comment.deleteMany({ resourceId: this._id });
});

// Also handle findOneAndDelete if used
ResourceSchema.pre("findOneAndDelete", async function () {
  const docToId = this.getQuery()._id;
  if (docToId) {
    await Comment.deleteMany({ resourceId: docToId });
  }
});

ResourceSchema.index({ title: "text", description: "text" });
// Composite indexes for filtered + sorted queries (e.g. ?subject=X&sort=newest)
ResourceSchema.index({ subjectId: 1, createdAt: -1 });
ResourceSchema.index({ resourceType: 1, createdAt: -1 });
ResourceSchema.index({ subjectId: 1, resourceType: 1, createdAt: -1 });

const Resource: Model<IResourceDoc> =
  mongoose.models.Resource ||
  mongoose.model<IResourceDoc>("Resource", ResourceSchema);
export default Resource;
