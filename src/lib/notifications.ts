import webPush from "web-push";
import Notification from "@/models/Notification";
import User from "@/models/User";

// Configure Web Push with VAPID keys from environment
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@hamads-lms.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface SendNotificationOptions {
  recipientId: string;
  type: "NEW_RESOURCE" | "COMMENT_REPLY";
  title: string;
  message: string;
  link: string;
}

/**
 * Sends a notification to a user (In-App + Web Push)
 */
export async function sendNotification(options: SendNotificationOptions) {
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
      return;
    }

    // 3. Dispatch Web Push notifications
    const payload = JSON.stringify({ title, message, link });

    const pushPromises = user.pushSubscriptions.map((sub) => {
      return webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      ).catch((err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or no longer valid - remove it
          return User.updateOne(
            { clerkId: recipientId },
            { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
          );
        }
        console.error("Web Push delivery failed for endpoint:", sub.endpoint, err);
      });
    });

    await Promise.all(pushPromises);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}
