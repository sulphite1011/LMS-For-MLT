import mongoose, { Schema, Model } from "mongoose";

/**
 * A subject inside one semester of an MCQ specialty. MCQ pages now live on the subject's UNITS
 * (see McqUnit). The `html*`/`hasPage` fields below are LEGACY (subject-level pages from an earlier
 * version): they are kept only so old documents still validate and are no longer read or written.
 */
export interface IMcqSubjectDoc extends mongoose.Document {
  specialtyId: mongoose.Types.ObjectId;
  semester: number;
  name: string;
  slug: string;
  description?: string;
  htmlContent?: string;
  htmlFileName?: string;
  htmlSize?: number;
  hasPage: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const McqSubjectSchema = new Schema<IMcqSubjectDoc>(
  {
    specialtyId: { type: Schema.Types.ObjectId, ref: "McqSpecialty", required: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    htmlContent: { type: String, select: false },
    htmlFileName: { type: String },
    htmlSize: { type: Number },
    hasPage: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// A slug is unique inside one specialty + semester (it is part of the public URL).
McqSubjectSchema.index({ specialtyId: 1, semester: 1, slug: 1 }, { unique: true });
McqSubjectSchema.index({ specialtyId: 1, semester: 1, createdAt: 1 });

const McqSubject: Model<IMcqSubjectDoc> =
  mongoose.models.McqSubject ||
  mongoose.model<IMcqSubjectDoc>("McqSubject", McqSubjectSchema);
export default McqSubject;
