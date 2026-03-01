import mongoose, { Schema, Model } from "mongoose";

export interface ISubjectDoc extends mongoose.Document {
  name: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SubjectSchema = new Schema<ISubjectDoc>({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

const Subject: Model<ISubjectDoc> =
  mongoose.models.Subject ||
  mongoose.model<ISubjectDoc>("Subject", SubjectSchema);
export default Subject;
