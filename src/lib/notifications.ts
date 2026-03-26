import webPush from "web-push";
import Notification from "@/models/Notification";
import User from "@/models/User";

// Lazy initialization for Web Push
let isVapidSet = false;
function ensureVapidConfigured() {
  if (isVapidSet) return;

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:admin@hamads-lms.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      isVapidSet = true;
    } catch (error) {
      console.error("Failed to set VAPID details:", error);
    }
  }
}

interface SendNotificationOptions {
  recipientId: string;
  type: "NEW_RESOURCE" | "COMMENT_REPLY" | "SYSTEM_BROADCAST";
  title: string;
  message: string;
  link: string;
}

/**
 * Sends a notification to a user (In-App + Web Push)
 */
export async function sendNotification(options: SendNotificationOptions) {
  ensureVapidConfigured();
  try {
    const { recipientId, type, title, message, link } = options;

    // 1. Create In-App Notification record
    await Notification.create({
      recipientId,
      type,
      title,
      message,
      link,
      isRead: false,
    });

    // 2. Fetch user's push subscriptions
    const user = await User.findOne({ clerkId: recipientId }).select("pushSubscriptions");
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      console.log(`[Notification] No push subscriptions for user ${recipientId}`);
      return;
    }

    console.log(`[Notification] Sending to ${user.pushSubscriptions.length} endpoints for user ${recipientId}`);

    // 3. Dispatch Web Push notifications
    const payload = JSON.stringify({ title, message, link });

    const pushPromises = user.pushSubscriptions.map((sub, index) => {
      return webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      ).then(() => {
        console.log(`[Notification] Success for endpoint ${index + 1} of user ${recipientId}`);
      }).catch((err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[Notification] Subscription expired for user ${recipientId}, removing...`);
          return User.updateOne(
            { clerkId: recipientId },
            { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
          );
        }
        console.error(`[Notification] Push failed for endpoint ${index + 1} of user ${recipientId}:`, err.message);
      });
    });

    await Promise.all(pushPromises);
    console.log(`[Notification] Dispatch complete for user ${recipientId}`);
  } catch (error) {
    console.error("[Notification] Error:", error);
  }
}
