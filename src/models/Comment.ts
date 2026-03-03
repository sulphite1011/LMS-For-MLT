import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReply {
  _id?: mongoose.Types.ObjectId;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  likes: string[]; // Array of Clerk IDs
  parentReplyId?: string; // for reply-to-reply threading
  mentionedUser?: string; // @mentioned username
  createdAt: Date;
}

export interface ICommentDoc extends Document {
  resourceId: mongoose.Types.ObjectId;
  userId: string; // Clerk ID
  userName: string;
  userImage?: string;
  content: string;
  rating?: number; // 1-5 — can exist standalone (empty content) for standalone ratings
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
  parentReplyId: { type: String }, // ID of the parent reply (for threaded replies)
  mentionedUser: { type: String }, // @mentioned username
  createdAt: { type: Date, default: Date.now },
});

const CommentSchema = new Schema<ICommentDoc>(
  {
    resourceId: { type: Schema.Types.ObjectId, ref: "Resource", required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userImage: { type: String },
    content: { type: String, default: "" }, // Can be empty for standalone ratings
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
CommentSchema.index({ userId: 1 }); // for user dashboard activity
// Composite: speeds up rating aggregation query (resourceId + rating filter + group)
CommentSchema.index({ resourceId: 1, rating: 1 });

const Comment: Model<ICommentDoc> =
  mongoose.models.Comment || mongoose.model<ICommentDoc>("Comment", CommentSchema);

export default Comment;
