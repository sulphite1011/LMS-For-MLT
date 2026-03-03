const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function checkCaseInsensitiveDuplicates() {
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
      userHandle: String
    }, { strict: false }));

    const usernames = await User.aggregate([
      { $project: { lowerUsername: { $toLower: "$username" }, original: "$username" } },
      { $group: { _id: "$lowerUsername", count: { $sum: 1 }, originals: { $push: "$original" } } },
      { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
    ]);

    const handles = await User.aggregate([
      { $project: { lowerHandle: { $toLower: "$userHandle" }, original: "$userHandle" } },
      { $group: { _id: "$lowerHandle", count: { $sum: 1 }, originals: { $push: "$original" } } },
      { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
    ]);

    console.log('Case-Insensitive Duplicate Usernames:', JSON.stringify(usernames, null, 2));
    console.log('Case-Insensitive Duplicate Handles:', JSON.stringify(handles, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCaseInsensitiveDuplicates();
