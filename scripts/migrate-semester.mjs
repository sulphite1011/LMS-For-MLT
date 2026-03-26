import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/MONGODB_URI=(.+)/);
  if (match) {
    process.env.MONGODB_URI = match[1].trim();
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Please define the MONGODB_URI environment variable inside .env.local");
  process.exit(1);
}

const ResourceSchema = new mongoose.Schema({
  semester: Number
}, { strict: false });

const Resource = mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected to MongoDB");

    // For now, assign semester 1 to all resources that don't have one
    const result = await Resource.updateMany(
      { semester: { $exists: false } },
      { $set: { semester: 1 } }
    );

    console.log(`Updated ${result.modifiedCount} resources to Semester 1.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
