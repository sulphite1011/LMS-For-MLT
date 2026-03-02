import mongoose, { Schema, Model } from "mongoose";

export interface IUserDoc extends mongoose.Document {
  clerkId: string;
  username: string;
  userImage?: string;
  customAvatar?: string; // User-uploaded avatar (base64 or URL)
  bio?: string;
  role: "superAdmin" | "admin" | "user";
  password?: string; // Hashed temporary password
  isPending?: boolean;
  favoriteResources: mongoose.Types.ObjectId[];
  likedResources: mongoose.Types.ObjectId[];
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const UserSchema = new Schema<IUserDoc>({
  clerkId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  userImage: { type: String },
  customAvatar: { type: String }, // User-uploaded profile picture
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
