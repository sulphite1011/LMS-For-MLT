import dbConnect from "../src/lib/db.js";
import Resource from "../src/models/Resource.js";
import User from "../src/models/User.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Manual .env.local parsing
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join("=").trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function migrate() {
  try {
    await dbConnect();
    console.log("Connected to database");

    // 1. Find the Super Admin by email
    const superAdminEmail = "hamadkhadimdgkmc@gmail.com";
    const superAdmin = await User.findOne({
      $or: [
        { email: superAdminEmail },
        { username: "Hamad" }, // Fallback if email doesn't match exactly in DB
        { role: "superAdmin" }
      ]
    });

    if (!superAdmin) {
      console.error("Super Admin not found! Please check the email or role in DB.");
      process.exit(1);
    }

    console.log(`Found Super Admin: ${superAdmin.username} (${superAdmin._id})`);

    // 2. Update all resources where createdBy is missing or invalid
    const result = await Resource.updateMany(
      {
        $or: [
          { createdBy: { $exists: false } },
          { createdBy: null }
        ]
      },
      { $set: { createdBy: superAdmin._id } }
    );

    console.log(`Updated ${result.modifiedCount} resources with creator attribution.`);

    // 3. Optional: Ensure analytics fields exist (even if 0)
    const analyticsResult = await Resource.updateMany(
      { viewsCount: { $exists: false } },
      { $set: { viewsCount: 0, likesCount: 0, favoritesCount: 0 } }
    );
    console.log(`Initialized analytics for ${analyticsResult.modifiedCount} resources.`);

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
