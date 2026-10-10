import mongoose, { Schema, Model } from "mongoose";

/**
 * A specialty in the MCQs section (e.g. MLT, MIT, OTT).
 * `slug` is generated once from `name` and never changes, so shared links stay valid.
 */
export interface IMcqSpecialtyDoc extends mongoose.Document {
  name: string;
  slug: string;
  fullName?: string;
  description?: string;
  semesterCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const McqSpecialtySchema = new Schema<IMcqSpecialtyDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    semesterCount: { type: Number, required: true, default: 8, min: 1, max: 12 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const McqSpecialty: Model<IMcqSpecialtyDoc> =
  mongoose.models.McqSpecialty ||
  mongoose.model<IMcqSpecialtyDoc>("McqSpecialty", McqSpecialtySchema);
export default McqSpecialty;
