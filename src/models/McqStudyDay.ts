import mongoose, { Schema, Model } from "mongoose";

/** One row per (user, calendar day, Asia/Karachi) on which the user answered MCQs. Drives the study streak. */
export interface IMcqStudyDayDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  day: string; // YYYY-MM-DD
  answered: number;
}

const McqStudyDaySchema = new Schema<IMcqStudyDayDoc>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: String, required: true },
  answered: { type: Number, default: 0 },
  // Rows older than a year are removed automatically.
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 400 },
});

McqStudyDaySchema.index({ userId: 1, day: 1 }, { unique: true });

const McqStudyDay: Model<IMcqStudyDayDoc> =
  mongoose.models.McqStudyDay || mongoose.model<IMcqStudyDayDoc>("McqStudyDay", McqStudyDaySchema);
export default McqStudyDay;
