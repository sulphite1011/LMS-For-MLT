const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://hamadkhadimdgkmc:cJoV0S5Xp9WW4hgQ@lms-for-mlt.jlrfmgk.mongodb.net/hamads-lms?retryWrites=true&w=majority";

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    // Define temporary schemas to avoid model conflicts
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const Resource = mongoose.model('Resource', new mongoose.Schema({}, { strict: false, collection: 'resources' }));
    const Comment = mongoose.model('Comment', new mongoose.Schema({}, { strict: false, collection: 'comments' }));
    const Subject = mongoose.model('Subject', new mongoose.Schema({}, { strict: false, collection: 'subjects' }));

    // 1. Preserve Super Admin
    const superAdmin = await User.findOne({ role: "superAdmin" });
    if (!superAdmin) {
      console.log("No superAdmin found. Checking all users...");
      const allUsers = await User.find({}).lean();
      console.log("Users:", allUsers.map(u => ({ username: u.username, role: u.role })));
      throw new Error("Super Admin not found");
    }
    console.log(`Found Super Admin: ${superAdmin.username}`);

    // 2. Preserve Target Resource
    const targetTitle = "Chemical Pathology Notes: BS MLT 4th Semester By Hamad Khadim";
    const targetResource = await Resource.findOne({ title: targetTitle });
    if (!targetResource) {
      console.log("Target resource not found. Available resources:");
      const titles = await Resource.find({}).distinct('title');
      console.log(titles);
      throw new Error("Target resource not found");
    }
    console.log(`Found Target Resource: ${targetResource.title}`);

    const preservedSubjectId = targetResource.subjectId;

    // 3. Purge
    console.log("Purging Users...");
    const uRes = await User.deleteMany({ _id: { $ne: superAdmin._id } });
    console.log(`Deleted ${uRes.deletedCount} users.`);

    console.log("Purging Resources...");
    const rRes = await Resource.deleteMany({ _id: { $ne: targetResource._id } });
    console.log(`Deleted ${rRes.deletedCount} resources.`);

    console.log("Purging Comments...");
    const cRes = await Comment.deleteMany({ resourceId: { $ne: targetResource._id } });
    console.log(`Deleted ${cRes.deletedCount} comments.`);

    console.log("Purging Subjects...");
    const sRes = await Subject.deleteMany({ _id: { $ne: preservedSubjectId } });
    console.log(`Deleted ${sRes.deletedCount} subjects.`);

    console.log("Database cleanup successful!");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

run();
