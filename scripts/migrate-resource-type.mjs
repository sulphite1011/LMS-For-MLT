import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env.local parser
function getMongoUri() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/MONGODB_URI=(.+)/);
  return match ? match[1].trim() : null;
}

const MONGODB_URI = getMongoUri();

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('resources');

    // Find documents with sourceType
    const count = await collection.countDocuments({ sourceType: { $exists: true } });
    console.log(`Found ${count} documents with sourceType`);

    if (count > 0) {
      // Rename sourceType to resourceType if resourceType is missing
      const result = await collection.updateMany(
        { sourceType: { $exists: true } },
        [
          {
            $set: {
              resourceType: { $ifNull: ["$resourceType", "$sourceType"] }
            }
          },
          {
            $unset: "sourceType"
          }
        ]
      );
      console.log(`Updated ${result.modifiedCount} documents`);
    } else {
      console.log('No documents found with sourceType to migrate.');
    }

    console.log('Migration check/run finished.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
