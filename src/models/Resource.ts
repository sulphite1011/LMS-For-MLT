import mongoose, { Schema, Model } from "mongoose";

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
  createdBy: mongoose.Types.ObjectId;
  // "Unknown Author": set when the owning admin is removed. Only the Super Admin can see the former owner.
  isOrphaned?: boolean;
  formerOwnerId?: mongoose.Types.ObjectId;
  formerOwnerName?: string;
  // Recycle bin: a deleted resource is only hidden (deletedAt set) for 30 days, then purged for good.
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
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
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isOrphaned: { type: Boolean, default: false },
    formerOwnerId: { type: Schema.Types.ObjectId, ref: "User" },
    formerOwnerName: { type: String },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

ResourceSchema.index({ title: "text", description: "text" });
// Unfiltered "newest first" listing (homepage + /api/resources default) — the compound indexes
// below all lead with another field, so they can't serve a plain createdAt sort.
ResourceSchema.index({ createdAt: -1 });
// Recycle bin listing / purge.
ResourceSchema.index({ deletedAt: 1 });
// Composite indexes for filtered + sorted queries (e.g. ?subject=X&sort=newest)
ResourceSchema.index({ subjectId: 1, createdAt: -1 });
ResourceSchema.index({ resourceType: 1, createdAt: -1 });
ResourceSchema.index({ subjectId: 1, resourceType: 1, createdAt: -1 });

const Resource: Model<IResourceDoc> =
  mongoose.models.Resource ||
  mongoose.model<IResourceDoc>("Resource", ResourceSchema);
export default Resource;
