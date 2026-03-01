import { Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  clerkId: string;
  username: string;
  role: "superAdmin" | "admin";
  createdAt: Date;
  createdBy?: Types.ObjectId;
}

export interface ISubject {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface IFileData {
  fileType: "pdf" | "image" | "external";
  fileContent?: Buffer;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  externalLink?: string;
}

export interface IResource {
  _id: Types.ObjectId;
  title: string;
  subjectId: Types.ObjectId;
  resourceType: "Notes" | "Video" | "PDF" | "Reference" | "Quiz";
  bannerImageUrl?: string;
  bannerImageData?: Buffer;
  fileData?: IFileData;
  youtubeUrls: string[];
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceWithSubject extends Omit<IResource, "subjectId"> {
  subjectId: ISubject;
}

export type ResourceType = "Notes" | "Video" | "PDF" | "Reference" | "Quiz";

export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  Notes: "#3b82f6",
  Video: "#8b5cf6",
  PDF: "#ef4444",
  Reference: "#10b981",
  Quiz: "#f59e0b",
};

export const RESOURCE_TYPE_BG: Record<ResourceType, string> = {
  Notes: "bg-blue-500",
  Video: "bg-purple-500",
  PDF: "bg-red-500",
  Reference: "bg-green-500",
  Quiz: "bg-amber-500",
};
