const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function resolveDuplicates() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/MONGODB_URI=(.+)/);
    if (match) process.env.MONGODB_URI = match[1].trim();
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      username: String,
      userHandle: String,
      createdAt: Date
    }, { strict: false }));

    // Resolve Usernames
    const usernameGroups = await User.aggregate([
      { $group: { _id: { $toLower: "$username" }, docs: { $push: { _id: "$_id", username: "$username", createdAt: "$createdAt" } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
    ]);

    for (const group of usernameGroups) {
      // Sort docs by createdAt (oldest first)
      const sorted = group.docs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      // Keep the first one, rename others
      for (let i = 1; i < sorted.length; i++) {
        const doc = sorted[i];
        const newName = `${doc.username}_${Math.floor(Math.random() * 1000)}`;
        console.log(`Renaming duplicate username: "${doc.username}" -> "${newName}"`);
        await User.updateOne({ _id: doc._id }, { $set: { username: newName } });
      }
    }

    // Resolve Handles
    const handleGroups = await User.aggregate([
      { $group: { _id: { $toLower: "$userHandle" }, docs: { $push: { _id: "$_id", userHandle: "$userHandle", createdAt: "$createdAt" } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
    ]);

    for (const group of handleGroups) {
      const sorted = group.docs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      for (let i = 1; i < sorted.length; i++) {
        const doc = sorted[i];
        const newHandle = `${doc.userHandle}_${Math.floor(Math.random() * 1000)}`;
        console.log(`Renaming duplicate handle: "${doc.userHandle}" -> "${newHandle}"`);
        await User.updateOne({ _id: doc._id }, { $set: { userHandle: newHandle } });
      }
    }

    console.log('Resolution complete');

    // Re-create indexes with collation
    console.log('Dropping old indexes...');
    try {
      await mongoose.connection.db.collection('users').dropIndex('username_1');
      await mongoose.connection.db.collection('users').dropIndex('userHandle_1');
    } catch (e) {
      console.log('Index drop warning (likely didn\'t exist):', e.message);
    }

    console.log('Creating case-insensitive unique indexes...');
    await mongoose.connection.db.collection('users').createIndex(
      { username: 1 },
      { unique: true, name: "username_1", collation: { locale: 'en', strength: 2 } }
    );
    await mongoose.connection.db.collection('users').createIndex(
      { userHandle: 1 },
      { unique: true, name: "userHandle_1", sparse: true, collation: { locale: 'en', strength: 2 } }
    );

    console.log('Indexes created successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resolveDuplicates();
