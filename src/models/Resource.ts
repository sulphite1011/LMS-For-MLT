import mongoose, { Schema, Model } from "mongoose";

export interface IResourceDoc extends mongoose.Document {
  title: string;
  subjectId: mongoose.Types.ObjectId;
  resourceType: "Notes" | "Video" | "PDF" | "Reference" | "Quiz";
  bannerImageUrl?: string;
  bannerImageData?: Buffer;
  fileData?: {
    fileType: "pdf" | "image" | "external";
    fileContent?: Buffer;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    externalLink?: string;
  };
  youtubeUrls: string[];
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
    fileData: {
      fileType: { type: String, enum: ["pdf", "image", "external"] },
      fileContent: { type: Buffer },
      fileName: { type: String },
      fileSize: { type: Number },
      mimeType: { type: String },
      externalLink: { type: String },
    },
    youtubeUrls: [{ type: String }],
    description: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

ResourceSchema.index({ title: "text", description: "text" });
ResourceSchema.index({ subjectId: 1 });
ResourceSchema.index({ resourceType: 1 });

const Resource: Model<IResourceDoc> =
  mongoose.models.Resource ||
  mongoose.model<IResourceDoc>("Resource", ResourceSchema);
export default Resource;
