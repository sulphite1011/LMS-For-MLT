import dbConnect from "../lib/db";
import User from "../models/User";
import Resource from "../models/Resource";
import Subject from "../models/Subject";
import Comment from "../models/Comment";

async function cleanup() {
  try {
    console.log("Connecting to DB...");
    await dbConnect();

    // 1. Find Super Admin
    const superAdmin = await User.findOne({ role: "superAdmin" });
    if (!superAdmin) {
      console.error("Super Admin not found!");
      process.exit(1);
    }
    console.log(`Preserving Super Admin: ${superAdmin.username} (${superAdmin._id})`);

    // 2. Find target Resource
    const targetResource = await Resource.findOne({
      title: "Chemical Pathology Notes: BS MLT 4th Semester By Hamad Khadim"
    });

    if (!targetResource) {
      console.error("Target resource not found!");
      // List all resources to help debug if needed
      const allResources = await Resource.find({}, { title: 1 });
      console.log("Available resources:", allResources.map(r => r.title));
      process.exit(1);
    }
    console.log(`Preserving Resource: ${targetResource.title} (${targetResource._id})`);

    const targetSubjectId = targetResource.subjectId;

    // 3. Perform deletions
    console.log("Cleaning up Users...");
    const userResult = await User.deleteMany({ _id: { $ne: superAdmin._id } });
    console.log(`Deleted ${userResult.deletedCount} users.`);

    console.log("Cleaning up Resources...");
    const resourceResult = await Resource.deleteMany({ _id: { $ne: targetResource._id } });
    console.log(`Deleted ${resourceResult.deletedCount} resources.`);

    console.log("Cleaning up Comments...");
    const commentResult = await Comment.deleteMany({ resourceId: { $ne: targetResource._id } });
    console.log(`Deleted ${commentResult.deletedCount} comments.`);

    console.log("Cleaning up Subjects...");
    const subjectResult = await Subject.deleteMany({ _id: { $ne: targetSubjectId } });
    console.log(`Deleted ${subjectResult.deletedCount} subjects.`);

    console.log("Cleanup complete!");
    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
}

cleanup();
