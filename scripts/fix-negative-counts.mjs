// One-time script to fix negative likesCount and favoritesCount in the database
// Run with: node scripts/fix-negative-counts.mjs


import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Read .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
let MONGODB_URI = process.env.MONGODB_URI;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/^MONGODB_URI=(.*)$/m);
  if (match) {
    MONGODB_URI = match[1].trim().replace(/^['"]|['"]$/g, "");
  }
}

if (!MONGODB_URI) { console.error("Missing MONGODB_URI"); process.exit(1); }

await mongoose.connect(MONGODB_URI);
console.log("Connected to MongoDB");

const db = mongoose.connection.db;
const resources = db.collection("resources");

// Fix negative likesCount
const likesResult = await resources.updateMany(
  { likesCount: { $lt: 0 } },
  { $set: { likesCount: 0 } }
);
console.log(`Fixed ${likesResult.modifiedCount} resources with negative likesCount`);

// Fix negative favoritesCount
const favsResult = await resources.updateMany(
  { favoritesCount: { $lt: 0 } },
  { $set: { favoritesCount: 0 } }
);
console.log(`Fixed ${favsResult.modifiedCount} resources with negative favoritesCount`);

await mongoose.disconnect();
console.log("Done!");
