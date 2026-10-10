import mongoose, { Schema, Model } from "mongoose";

/**
 * A unit inside an MCQ subject. The MCQ page of the unit is ONE uploaded HTML file stored in
 * `htmlContent`, which is `select: false` so normal queries never load it; only the HTML-serving
 * route and the admin write routes ask for it explicitly (`+htmlContent`).
 * `specialtyId` is denormalised so per-specialty counts need no join.
 */
export interface IMcqUnitDoc extends mongoose.Document {
  subjectId: mongoose.Types.ObjectId;
  specialtyId: mongoose.Types.ObjectId;
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

const McqUnitSchema = new Schema<IMcqUnitDoc>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: "McqSubject", required: true },
    specialtyId: { type: Schema.Types.ObjectId, ref: "McqSpecialty", required: true },
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

// A slug is unique inside one subject (it is part of the public URL).
McqUnitSchema.index({ subjectId: 1, slug: 1 }, { unique: true });
McqUnitSchema.index({ subjectId: 1, createdAt: 1 });
McqUnitSchema.index({ specialtyId: 1 });

const McqUnit: Model<IMcqUnitDoc> =
  mongoose.models.McqUnit || mongoose.model<IMcqUnitDoc>("McqUnit", McqUnitSchema);
export default McqUnit;
