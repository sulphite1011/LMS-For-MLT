import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db";
import McqSpecialty from "@/models/McqSpecialty";
import { requireSuperAdmin } from "@/lib/auth";
import { getSpecialties, mcqAuthErrorResponse, slugify } from "@/lib/mcq";

/** GET /api/mcq/specialties — public list of specialties with subject / uploaded-page counts. */
export async function GET() {
  try {
    const specialties = await getSpecialties();
    return NextResponse.json(specialties, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("GET /api/mcq/specialties error:", error);
    return NextResponse.json({ error: "Failed to fetch specialties" }, { status: 500 });
  }
}

/** POST /api/mcq/specialties — Super Admin only. Body: { name, fullName?, description?, semesterCount? } */
export async function POST(req: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    await dbConnect();

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const description = String(body.description ?? "").trim();
    const semesterCount = body.semesterCount === undefined ? 8 : Number(body.semesterCount);

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (name.length > 40) return NextResponse.json({ error: "Name must be 40 characters or fewer" }, { status: 400 });
    if (!Number.isInteger(semesterCount) || semesterCount < 1 || semesterCount > 12) {
      return NextResponse.json({ error: "Semesters must be a whole number from 1 to 12" }, { status: 400 });
    }

    const slug = slugify(name);
    if (!slug) return NextResponse.json({ error: "Name must contain letters or numbers" }, { status: 400 });
    if (await McqSpecialty.exists({ slug })) {
      return NextResponse.json({ error: "A specialty with this name already exists" }, { status: 409 });
    }

    const specialty = await McqSpecialty.create({
      name,
      slug,
      fullName: fullName || undefined,
      description: description || undefined,
      semesterCount,
      createdBy: user._id,
    });

    revalidatePath("/mcqs", "layout");
    return NextResponse.json(specialty, { status: 201 });
  } catch (error) {
    const authResponse = mcqAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("POST /api/mcq/specialties error:", error);
    return NextResponse.json({ error: "Failed to create specialty" }, { status: 500 });
  }
}
