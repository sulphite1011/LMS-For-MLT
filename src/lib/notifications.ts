import mongoose from "mongoose";
import Notification from "@/models/Notification";
import { parseSemesterValue } from "@/lib/semesters";

interface UserPrefs {
  notificationsEnabled?: boolean;
  currentSemester?: number | null;
  notifySemesters?: number[];
}

/** Semesters this user receives notifications for (current semester always included). */
export function userSemesters(user: UserPrefs): number[] {
  const set = new Set<number>();
  if (user.currentSemester) set.add(user.currentSemester);
  for (const s of user.notifySemesters ?? []) set.add(s);
  return [...set];
}

/** Mongo filter for the notifications one user should see: general ones + their semesters. */
export function audienceFilter(user: UserPrefs) {
  return { $or: [{ semester: null }, { semester: { $exists: false } }, { semester: { $in: userSemesters(user) } }] };
}

/** Only internal paths or https links are allowed as notification links. */
export function cleanLink(link: unknown): string | undefined {
  if (typeof link !== "string") return undefined;
  const v = link.trim();
  if (!v) return undefined;
  if (v.startsWith("/") && !v.startsWith("//")) return v.slice(0, 300);
  if (/^https:\/\//i.test(v)) return v.slice(0, 300);
  return undefined;
}

/** Creates the notification announcing a new resource. Never throws (a failure must not break uploads). */
export async function notifyNewResource(opts: {
  resourceId: string;
  title: string;
  resourceType: string;
  subjectName: string;
  semester?: number;
  createdBy: mongoose.Types.ObjectId | string;
}) {
  try {
    await Notification.create({
      kind: "resource",
      title: `New ${opts.resourceType}: ${opts.title}`.slice(0, 120),
      message: `${opts.subjectName}${opts.semester ? ` · Semester ${opts.semester}` : ""}`,
      semester: parseSemesterValue(opts.semester) ?? null,
      resourceId: opts.resourceId,
      link: `/resource/${opts.resourceId}`,
      createdBy: opts.createdBy,
    });
  } catch (error) {
    console.error("notifyNewResource failed:", error);
  }
}
