const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function checkIndexes() {
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

    const indexes = await mongoose.connection.db.collection('users').listIndexes().toArray();
    console.log('Indexes for "users" collection:', JSON.stringify(indexes, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkIndexes();
