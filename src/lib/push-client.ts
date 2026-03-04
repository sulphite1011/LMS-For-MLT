"use client";

import toast from "react-hot-toast";

/**
 * Converts a base64 string to a Uint8Array suitable for VAPID applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Shared VAPID Public Key with fallback to hardcoded value
 * (Since environment variables can sometimes be missed during client-side hydration)
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BJ1rYwu55-dp_8ArvzWfflqfXx3KROlLRxkxUNpfH4jfRo-M5Je5MGcNEcXIXGQqV2HQrOVoIG_TDAdu60TmW-g";

/**
 * Centralized function to subscribe a user to push notifications
 */
export async function subscribeUserToPush() {
  try {
    // 1. Request Permission
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      toast.error("Permission denied for notifications");
      return false;
    }

    // 2. Register/Ready Service Worker
    const register = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    // 3. Subscribe with VAPID key
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    // Unsubscribe old if any (optional but clean)
    const oldSub = await register.pushManager.getSubscription();
    if (oldSub) await oldSub.unsubscribe();

    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    // 4. Send to Backend
    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription)
    });

    if (res.ok) {
      return true;
    } else {
      throw new Error("Failed to sync with server");
    }
  } catch (error: any) {
    console.error("Push subscription error:", error);

    // Brave Specific handling
    if (error.name === "AbortError" && (navigator as any).brave) {
      toast.error(
        "Brave requires a setting to be enabled! Please go to brave://settings/privacy and enable 'Use Google Services for Push Messaging'.",
        { duration: 6000 }
      );
    } else {
      toast.error("Failed to enable notifications");
    }
    return false;
  }
}
