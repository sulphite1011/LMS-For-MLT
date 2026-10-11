import mongoose, { Schema, Model } from "mongoose";

/**
 * A student's own choice about one notification: archived or deleted (hidden for that student only).
 * Notifications themselves are shared; deleting here never affects other students. Rows clean
 * themselves up after 65 days, i.e. after the notification they refer to has expired (60 days).
 */
export interface INotificationStateDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  notificationId: mongoose.Types.ObjectId;
  state: "archived" | "deleted";
  createdAt: Date;
}

const NotificationStateSchema = new Schema<INotificationStateDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notificationId: { type: Schema.Types.ObjectId, ref: "Notification", required: true },
    state: { type: String, enum: ["archived", "deleted"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationStateSchema.index({ userId: 1, notificationId: 1 }, { unique: true });
NotificationStateSchema.index({ createdAt: 1 }, { expireAfterSeconds: 65 * 24 * 60 * 60 });

const NotificationState: Model<INotificationStateDoc> =
  mongoose.models.NotificationState || mongoose.model<INotificationStateDoc>("NotificationState", NotificationStateSchema);
export default NotificationState;
