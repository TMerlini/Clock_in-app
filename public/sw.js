// Required for PWA installability (beforeinstallprompt won't fire without a fetch handler)
self.addEventListener("fetch", (event) => {});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Clock In";
  const options = {
    body: data.body || "",
    icon: data.icon || "/images/Clock in Logo White.webp",
    badge: "/images/Clock in Logo White.webp",
    data: { url: data.url || "/" },
  };
  if (data.image) options.image = data.image;
  if (data.actions) options.actions = data.actions;
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  if (event.action) {
    const action = (event.notification.actions || []).find((a) => a.action === event.action);
    if (action?.url) {
      event.waitUntil(clients.openWindow(action.url));
      return;
    }
  }
  event.waitUntil(clients.openWindow(url));
});

// Handles Chrome's automatic push subscription key rotation.
// Without this, subscriptions silently expire and users stop receiving notifications.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const newSub = await self.registration.pushManager.subscribe(
        event.oldSubscription.options
      );
      const subJson = newSub.toJSON();
      await fetch("/api/push-resubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: newSub.endpoint,
          keys: subJson.keys,
          oldEndpoint: event.oldSubscription?.endpoint,
        }),
      });
    })()
  );
});
