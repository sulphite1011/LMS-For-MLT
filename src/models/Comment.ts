import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReply {
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  likes: string[]; // Array of Clerk IDs
  createdAt: Date;
}

export interface ICommentDoc extends Document {
  resourceId: mongoose.Types.ObjectId;
  userId: string; // Clerk ID
  userName: string;
  userImage?: string;
  content: string;
  rating?: number; // 1-5
  likes: string[]; // Array of Clerk IDs
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userImage: { type: String },
  content: { type: String, required: true },
  likes: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const CommentSchema = new Schema<ICommentDoc>(
  {
    resourceId: { type: Schema.Types.ObjectId, ref: "Resource", required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userImage: { type: String },
    content: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    likes: [{ type: String }],
    replies: [ReplySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
CommentSchema.index({ resourceId: 1 });
CommentSchema.index({ createdAt: -1 });

const Comment: Model<ICommentDoc> =
  mongoose.models.Comment || mongoose.model<ICommentDoc>("Comment", CommentSchema);

export default Comment;
