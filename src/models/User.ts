import mongoose, { Schema, Model, CallbackError } from "mongoose";
import Resource from "./Resource";
import Comment from "./Comment";

export interface IUserDoc extends mongoose.Document {
  clerkId: string;
  username: string;
  userHandle?: string; // @handle for mentions (unique, like Twitter handle)
  userHandleLastChanged?: Date; // track 15-day change restriction
  usernameLastChanged?: Date; // track 30-day change restriction
  userImage?: string;
  customAvatar?: string;
  bio?: string;
  role: "superAdmin" | "admin" | "user";
  password?: string;
  isPending?: boolean;
  favoriteResources: mongoose.Types.ObjectId[];
  likedResources: mongoose.Types.ObjectId[];
  primarySemester?: number; // 1-10
  notificationPreferences: {
    receiveAll: boolean;
    receiveGeneral: boolean;
    subscribedSemesters: number[];
  };
  pushSubscriptions: Array<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }>;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const UserSchema = new Schema<IUserDoc>({
  clerkId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  userHandle: { type: String, unique: true, sparse: true, lowercase: true, trim: true }, // @handle
  userHandleLastChanged: { type: Date },
  usernameLastChanged: { type: Date },
  userImage: { type: String },
  customAvatar: { type: String },
  bio: { type: String, maxlength: 300 },
  role: { type: String, enum: ["superAdmin", "admin", "user"], default: "user" },
  password: { type: String },
  isPending: { type: Boolean, default: false },
  favoriteResources: [{ type: Schema.Types.ObjectId, ref: "Resource" }],
  likedResources: [{ type: Schema.Types.ObjectId, ref: "Resource" }],
  primarySemester: { type: Number, min: 1, max: 10 },
  notificationPreferences: {
    receiveAll: { type: Boolean, default: false },
    receiveGeneral: { type: Boolean, default: true },
    subscribedSemesters: [{ type: Number }],
  },
  pushSubscriptions: [
    {
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
});

// Transfer resources to Super Admin and cleanup likes if a user is deleted
UserSchema.pre("deleteOne", { document: true, query: false }, async function () {
  const userId = this._id;
  const clerkId = this.clerkId;

  // 1. Find the Super Admin (Hamad)
  const superAdmin = await mongoose.model("User").findOne({ role: "superAdmin" });
  if (superAdmin) {
    await Resource.updateMany(
      { createdBy: userId },
      { createdBy: superAdmin._id }
    );
  }

  // 2. Cleanup likes in comments and replies (using clerkId)
  await Comment.updateMany(
    { likes: clerkId },
    { $pull: { likes: clerkId } }
  );
  await Comment.updateMany(
    { "replies.likes": clerkId },
    { $pull: { "replies.$[].likes": clerkId } }
  );
});

// Also handle findOneAndDelete
UserSchema.pre("findOneAndDelete", async function () {
  const userId = this.getQuery()._id;
  if (userId) {
    const user = await mongoose.model("User").findById(userId);
    if (user) {
      const clerkId = user.clerkId;
      const superAdmin = await mongoose.model("User").findOne({ role: "superAdmin" });
      if (superAdmin) {
        await Resource.updateMany(
          { createdBy: userId },
          { createdBy: superAdmin._id }
        );
      }
      await Comment.updateMany(
        { likes: clerkId },
        { $pull: { likes: clerkId } }
      );
      await Comment.updateMany(
        { "replies.likes": clerkId },
        { $pull: { "replies.$[].likes": clerkId } }
      );
    }
  }
});

const User: Model<IUserDoc> =
  mongoose.models.User || mongoose.model<IUserDoc>("User", UserSchema);
export default User;
