import mongoose, { Schema, Model } from "mongoose";

/**
 * One document per (user, unit): saved quiz state, completion and best result.
 * `session` is the unfinished attempt ("continue where you left off"); it is cleared on finish.
 */
export interface IMcqProgressDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  completed: boolean;
  completedAt?: Date;
  attempts: number;
  bestScore: number; // best percentage 0-100
  lastScore: number;
  lastTotal: number;
  lastCorrect: number;
  /** question indexes answered wrong in the last finished attempt (for "retry missed"). */
  missed: number[];
  session?: {
    mode: "practice" | "test";
    order: number[]; // question indexes in the order shown
    answers: number[]; // chosen option per position in `order`, -1 = unanswered
    index: number; // current position
    elapsedSec: number;
    startedAt: Date;
  };
  lastActivityAt: Date;
}

const McqProgressSchema = new Schema<IMcqProgressDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    unitId: { type: Schema.Types.ObjectId, ref: "McqUnit", required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    attempts: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    lastScore: { type: Number, default: 0 },
    lastTotal: { type: Number, default: 0 },
    lastCorrect: { type: Number, default: 0 },
    missed: { type: [Number], default: [] },
    session: { type: Schema.Types.Mixed },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

McqProgressSchema.index({ userId: 1, unitId: 1 }, { unique: true });
McqProgressSchema.index({ userId: 1, lastActivityAt: -1 });

const McqProgress: Model<IMcqProgressDoc> =
  mongoose.models.McqProgress || mongoose.model<IMcqProgressDoc>("McqProgress", McqProgressSchema);
export default McqProgress;
