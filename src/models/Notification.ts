import mongoose, { Schema, Model } from "mongoose";

/**
 * An in-app notification. `semester` = the target audience: a number (1-8) means only students
 * who selected that semester; null/absent means ALL students. Read state is not stored per
 * notification: each user has `notificationsSeenAt` (unread = newer than that).
 */
export interface INotificationDoc extends mongoose.Document {
  title: string;
  message: string;
  kind: "resource" | "custom";
  semester?: number | null;
  resourceId?: mongoose.Types.ObjectId;
  link?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, default: "", trim: true, maxlength: 600 },
    kind: { type: String, enum: ["resource", "custom"], default: "custom" },
    semester: { type: Number, min: 1, max: 8, default: null },
    resourceId: { type: Schema.Types.ObjectId, ref: "Resource" },
    link: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ semester: 1, createdAt: -1 });
NotificationSchema.index({ createdBy: 1, createdAt: -1 });
// Notifications disappear on their own after 60 days.
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

const Notification: Model<INotificationDoc> =
  mongoose.models.Notification || mongoose.model<INotificationDoc>("Notification", NotificationSchema);
export default Notification;
