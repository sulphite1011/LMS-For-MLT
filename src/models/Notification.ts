import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  recipientId: string; // Clerk ID
  type: "NEW_RESOURCE" | "COMMENT_REPLY" | "SYSTEM_BROADCAST";
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["NEW_RESOURCE", "COMMENT_REPLY", "SYSTEM_BROADCAST"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Index for fetching unread count quickly
NotificationSchema.index({ recipientId: 1, isRead: 1 });
// Index for fetching latest notifications
NotificationSchema.index({ recipientId: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
