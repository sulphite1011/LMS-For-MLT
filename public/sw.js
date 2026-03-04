self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activated and ready.");
  return self.clients.claim();
});

self.addEventListener("push", function (event) {
  console.log("[Service Worker] Push Received.");
  if (event.data) {
    try {
      const data = event.data.json();
      console.log("[Service Worker] Data:", data);

      const options = {
        body: data.message,
        icon: "/images/default-avatar.png",
        badge: "/images/default-avatar.png",
        tag: "lms-notification",
        renotify: true,
        data: {
          url: data.link || "/dashboard",
        },
        vibrate: [100, 50, 100],
        actions: [
          { action: "open", title: "View" }
        ]
      };

      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (err) {
      console.error("[Service Worker] Error parsing push data:", err);
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  console.log("[Service Worker] Notification Clicked.");
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
  console.log("[Service Worker] Opening URL:", urlToOpen);

  const promiseChain = self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return self.clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
