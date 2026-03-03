import mongoose, { Schema, Model } from "mongoose";

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
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
});

const User: Model<IUserDoc> =
  mongoose.models.User || mongoose.model<IUserDoc>("User", UserSchema);
export default User;
